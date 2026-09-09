# AGENTS.md

<!-- aylith-handbook:start -->
> **📖 Aylith handbook (authoritative).** This repo is part of the `aylith-labs` lab. Before any
> cross-repo, catalog, design-system, CI/runner, or data-flow work you **must** consult the org
> handbook — the single source of truth for these conventions:
> https://github.com/aylith-labs/aylith-handbook (locally `../aylith-handbook/`, skill `aylith-labs`).
<!-- aylith-handbook:end -->


This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is Inspekt

Inspekt is a framework-agnostic element inspector for web developers. Click any UI element to see its source component, file path, and component tree. Works with React, Vue, Svelte, Solid, and any bundler (Vite, Webpack, Rspack, esbuild). Supports Docker path mapping, cross-project settings via a Chrome extension, and handing a grabbed element to a coding agent over MCP.

## Commands

```bash
# Everything CI runs, in order
bun run lint            # biome check .
bun run typecheck       # turbo run typecheck
bun run test            # turbo run test
bun run build           # turbo run build (respects dependency order)
bun run verify:exports  # declared entrypoints resolve against the built output
bun run site:build      # VitePress docs (needs `bun run build` first)

bun run lint:fix        # biome check --write .

# One package at a time
bun run --filter '@aylith/inspekt-core' test
bun run --filter '@aylith/inspekt-core' build
bun run --filter '@aylith/inspekt-core' dev     # tsup --watch

# Playground (React + Vite demo app)
bun run --filter 'inspekt-playground' dev
```

Build order matters: `core` and `cli` build before `vite`, which builds before `bundlers`; `daemon` builds before `mcp`. Turbo handles this via `^build` dependencies.

`bun run site:build` fails on a clean tree unless `bun run build` ran first — the site's Vite config imports `@aylith/inspekt-vite`, which resolves to `dist`.

## Architecture

### Monorepo Structure

Bun workspaces + Turborepo. Packages bundle with tsup and emit declarations through a separate `tsc --emitDeclarationOnly` pass (tsup's rollup-plugin-dts is incompatible with TypeScript 7). Output is dual ESM/CJS except the Chrome extension, the daemon, and the MCP server, which are ESM-only.

### Package Dependency Graph

```
@aylith/inspekt-core            ← Runtime UI, adapters, detection
@aylith/inspekt-cli             ← IDE opening + `inspekt setup`
├── @aylith/inspekt-vite        ← Vite plugin (depends on core + cli)
│   └── @aylith/inspekt-bundlers   ← Webpack/Rspack/esbuild/Rollup via unplugin
├── @aylith/inspekt-daemon      ← Localhost HTTP server + grab queue
│   └── @aylith/inspekt-mcp     ← MCP server over the same queue file
├── @aylith/inspekt-chrome      ← Chrome extension (private; bundles core)
└── @aylith/inspekt-skill       ← SKILL.md bundle, no code

@aylith/inspekt                 ← Meta-package; depends on all of the above
playground/                     ← React + Vite demo app
site/                           ← VitePress docs
```

### How It Works End-to-End

**Build time**: `packages/vite/src/transform-adapter.ts` delegates to `@code-inspector/core`'s AST transform, which injects `data-insp-path="filePath:line:col:componentName"` onto each element's opening tag. It handles JSX/TSX, Vue SFCs, and Svelte. Files that already contain `data-insp-path`, and Vite's sub-module queries (`?vue&type=script`), are skipped.

**Runtime injection**: The Vite plugin serves a virtual module at `/@aylith/inspekt-init.js` via dev-server middleware + `resolveId`/`load`. It imports `@aylith/inspekt-core`, calls `createInspekt()` with `serverUrl: window.location.origin`, and enables the inspector. `transformIndexHtml` injects the `<script>` tag.

**Runtime**: `createInspekt()` in `packages/core/src/index.ts` creates an `<inspekt-root>` custom element with an open Shadow DOM. All UI (popover, tree panel, overlay badges) renders inside that shadow root; highlights are inline styles on the real elements.

**Framework detection**: `detectAdapter()` tries React (`__reactFiber$`/`__reactContainer$`) → Vue (`__vue__`/`__vue_app__`) → Svelte (`svelte:` markers) → Solid (`data-hk`) → a generic fallback that walks the DOM via `data-insp-path`.

**Agent path**: "Send to Agent" POSTs the grab to the daemon, which appends it to an NDJSON queue under a `proper-lockfile` lock. `@aylith/inspekt-mcp` reads the same file directly — agents never talk HTTP to the daemon.

**Chrome extension**: The content script detects whether the build plugin is present (`<inspekt-root>` or `window.__INSPEKT__`). If so it pushes `chrome.storage.sync` settings via `CustomEvent('inspekt:settings-update')`; if not it creates its own `createInspekt()` instance. The background worker tracks per-tab state and broadcasts settings changes.

## Conventions

- **Dev-server and daemon endpoints are attack surface.** `/__inspekt/snippet` and `/__inspekt/open` answer unauthenticated cross-origin requests, so any file path arriving over the wire goes through `resolveExposedFile` (must land inside the Vite root or a `pathMapping` host directory), and any `editor` must match `/^[A-Za-z0-9._-]+$/` — `launch-editor` shell-splits that string and spawns the first token. Only the plugin's own `editor` option, which comes from the project's Vite config, may be freeform. Daemon routes additionally require `X-Inspekt-Token`.
- **Anything holding the daemon token is written 0600** (`~/.inspekt/config.json`, `extension-handshake.json`).
- Each package that reports a version at runtime keeps it in `src/version.ts`, with a unit test asserting it matches `package.json`. Never inline a version literal.
- `exports` condition maps list `types` first, then `import`/`require`. `verify:exports` enforces this along with the existence of every declared entrypoint.
- No inline `biome-ignore`; fix the code or add a scoped override in `biome.json`.
- The glob matcher for plugin `include`/`exclude` lives in `packages/vite/src/glob.ts` and is shared by the Vite plugin and the unplugin — don't reintroduce a local copy.
- The bundler plugins have no dev server, so they carry no `pathMapping`/`dockerCompose` options; those are Vite-plugin-only.

<!-- graft:start -->
## Graft — repo context graph

This repo is indexed in `graft/`: small linked markdown nodes that explain each
system and carry exact file:line spans, kept in sync with the code through git.

For ANY task here — understanding how something works, finding where code lives,
or scoping a change — get context from the graph before grepping or opening
source files. Re-ask freely (it's cheap) and reuse literal identifiers you
already have (symbol, error string, file name) as the query. New to this repo?
Run `graft map` first — a token-budgeted orientation (dir clusters, hubs,
hotspots), no LLM, no key.

- Run `graft ask "<your question>" --source` → ranked nodes with the relevant
  code spans inlined (each hit's ≤8-line crux by default; `--full` for whole
  definitions when the crux isn't enough). Match the tool to the task shape:
  for understanding or editing, the top node IS the answer — cite its
  `covers:` file:line spans and edit straight from `--source`. For
  exhaustive tasks ("every occurrence / every caller of this pattern"), ranked
  results are top-N, not complete — run `graft grep "<literal>"` instead
  (exhaustive over indexed files, grouped by enclosing symbol), falling back
  to raw `grep -rn` only for unindexed files.
- `graft skeleton <file>` → every definition's signature + span, ~10× cheaper
  than reading the file; use it to skim an API surface.
- `graft callers <symbol>` gives precomputed, exact edges — who calls this.
  Add `--direction out` for what it calls, or `--depth N` to walk
  transitively for the full blast radius. For structural questions, skip
  ranking and use this directly.
- Or browse: `graft/INDEX.md` lists every node; follow the links.
- Monorepos and folders of multiple repos rank fairly across sub-projects —
  hits carry `[scope/]` labels naming which one they're from. Narrow with
  `graft ask "<task>" --in <scope>/` once you know where you're working.

If a returned span is truncated ("+N more lines"), open the file at that exact
range before finalizing. Only open source files when a node genuinely lacks a
needed detail, and then at the exact file:line the node points to — never
re-read whole files.

After big code changes, refresh the graph with `graft build` (deterministic,
no API key, $0).
<!-- graft:end -->
