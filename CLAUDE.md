# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is Inspekt

Inspekt is a framework-agnostic element inspector for web developers. Click any UI element to see its source component, file path, and component tree. Works with React, Vue, Svelte, Solid, and any bundler (Vite, Webpack, Rspack, esbuild). Supports Docker path mapping and cross-project settings via a Chrome extension.

## Commands

```bash
# Build all packages (respects dependency order via Turbo)
bun run build

# Run all tests (19 total: 7 core + 12 vite transform)
bun run test

# Run a single package's tests
bun run --filter '@aylith/inspekt-core' test
bun run --filter '@aylith/inspekt-vite' test

# Build a single package
bun run --filter '@aylith/inspekt-core' build

# Start the playground (React + Vite demo app)
bun run --filter 'inspekt-playground' dev   # http://localhost:5173

# Watch mode for a package during development
bun run --filter '@aylith/inspekt-core' dev

# Typecheck
bun run typecheck
```

Build order matters: `@aylith/inspekt-core` and `@aylith/inspekt-cli` must build before `@aylith/inspekt-vite`, which must build before `@aylith/inspekt-bundlers`. Turbo handles this automatically via `^build` dependencies.

## Architecture

### Monorepo Structure

Bun workspaces + Turborepo. All packages use tsup for bundling and output dual ESM/CJS (except Chrome extension which is ESM-only).

### Package Dependency Graph

```
@aylith/inspekt-core          ← Foundation: runtime UI, adapters, detection
├── @aylith/inspekt-cli       ← IDE opening utility (launch-editor)
├── @aylith/inspekt-vite      ← Vite plugin (depends on core + cli)
│   └── @aylith/inspekt-bundlers  ← Webpack/Rspack/esbuild/Rollup via unplugin
├── @aylith/inspekt-chrome    ← Chrome extension (bundles core into content script)
└── playground/        ← React + Vite demo app
```

### How It Works End-to-End

**Build time**: The Vite plugin (`packages/vite/src/transform.ts`) runs a regex-based JSX/template transform that injects `data-insp-path="filePath:line:col:componentName"` attributes onto every element's opening tag. Uses `magic-string` for source-map-safe string manipulation. The `findTagClose()` function properly tracks brace/paren/string depth to avoid breaking arrow functions in JSX attributes.

**Runtime injection**: The Vite plugin serves a virtual module at `/@aylith/inspekt-init.js` via dev server middleware + `resolveId`/`load` hooks. This module imports `@aylith/inspekt-core`, calls `createInspekt()`, and enables the inspector. The `transformIndexHtml` hook injects a `<script>` tag pointing to this virtual module.

**Runtime**: `createInspekt()` in `packages/core/src/index.ts` creates a `<inspekt-root>` custom element with Shadow DOM (`attachShadow({ mode: 'open' })`). All UI (popover, tree panel, overlay badges) renders inside this shadow root, preventing CSS conflicts with the host app. Highlights are applied as inline styles on the actual DOM elements.

**Framework detection**: `detectAdapter()` tries adapters in order: React (checks `__reactFiber$`/`__reactContainer$`) → Vue (`__vue__`/`__vue_app__`) → Svelte (`svelte:` markers) → Solid (`data-hk`) → generic fallback (DOM walking via `data-insp-path` attributes).

**Chrome extension**: Content script detects whether the build plugin is present (`<inspekt-root>` or `window.__INSPEKT__`). If present, it pushes chrome.storage.sync settings via `CustomEvent('inspekt:settings-update')`. If absent (standalone mode), it creates its own `createInspekt()` instance. Background service worker manages per-tab state and broadcasts settings changes.

### Key Patterns

- **Source detection**: `findClosestSource()` walks up the DOM looking for `data-insp-path` or `data-insp-path` (backward compat with code-inspector-plugin)
- **Actions**: Built-in (open-editor, copy-path, open-github, console-log) + custom via `registerAction()`. Editor opening uses dev server POST to `/__inspekt/open` with fallback to protocol handlers (`cursor://file/...`)
- **Multi-bundler**: `packages/vite/src/unplugin.ts` wraps the transform in `createUnplugin()`. `@aylith/inspekt-bundlers` re-exports webpack/rspack/esbuild/rollup variants as named exports
- **Docker path mapping**: Parses `docker-compose.yaml` volume mounts to map container paths → host paths. Manual override via `pathMapping` config option
- **Transform skip list**: Tags like `template`, `script`, `style`, `Fragment`, `svelte:*` are excluded from attribute injection
