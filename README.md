# Inspekt

A framework-agnostic element inspector for developers. Click any UI element to see its source, navigate the component tree, and take action.

- **Any framework** — React, Vue, Svelte, Solid, Preact, Astro
- **Any bundler** — Vite, Webpack, Rspack, esbuild
- **Docker-aware** — auto-detects path mappings from docker-compose.yaml
- **Component tree** — full hierarchy with props, search, and highlighting
- **Custom actions** — open in IDE, copy path, open on GitHub, or add your own
- **Chrome extension** — global settings that sync across all your projects
- **Zero runtime cost** — no overhead when disabled; ~13KB gzipped when active

## Quick Start

```bash
npm install -D @inspekt/vite
```

```ts
// vite.config.ts
import { inspekt } from '@inspekt/vite';

export default defineConfig({
  plugins: [
    inspekt({
      editor: 'cursor',     // or 'vscode', 'webstorm', 'zed', ...
    }),
  ],
});
```

That's it. Start your dev server and use `Ctrl+Alt+Click` on any element.

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Alt+Click` | Inspect element (show popover with actions) |
| `Shift+Alt+Click` | Open file in IDE immediately |
| `Ctrl+Alt+I` | Toggle Inspekt on/off |
| `Ctrl+Alt+O` | Toggle overlay (component name badges) |
| `Ctrl+Alt+T` | Toggle component tree panel |
| `Escape` | Close popover / tree panel |

On Mac, `Cmd` replaces `Ctrl`.

## Packages

| Package | Description |
|---------|-------------|
| [`@inspekt/core`](packages/core) | Runtime UI — overlay, popover, tree panel, highlighting. Pure vanilla JS/CSS in Shadow DOM |
| [`@inspekt/vite`](packages/vite) | Vite plugin — injects source location attributes at build time |
| [`@inspekt/bundlers`](packages/bundlers) | Webpack, Rspack, esbuild, and Rollup plugins (via unplugin) |
| [`@inspekt/cli`](packages/cli) | CLI utility — open files in IDE from terminal |
| [`@inspekt/chrome`](packages/chrome) | Chrome extension — global settings and standalone inspector |

## Bundler Setup

### Vite

```ts
import { inspekt } from '@inspekt/vite';

export default defineConfig({
  plugins: [inspekt()],
});
```

### Webpack

```ts
import { webpack } from '@inspekt/bundlers';

module.exports = {
  plugins: [webpack()],
};
```

### Rspack / Rsbuild

```ts
import { rspack } from '@inspekt/bundlers';

module.exports = {
  plugins: [rspack()],
};
```

### esbuild

```ts
import { esbuild } from '@inspekt/bundlers';

await build({
  plugins: [esbuild()],
});
```

## Plugin Options

```ts
inspekt({
  // Framework detection (auto-detected if omitted)
  framework: 'react',              // 'react' | 'vue' | 'svelte' | 'solid' | 'auto'

  // IDE to open files in
  editor: 'cursor',                // 'vscode' | 'cursor' | 'webstorm' | 'zed' | ...

  // Docker path mapping (auto-detect from docker-compose)
  dockerCompose: true,

  // Or manual mapping
  pathMapping: {
    '/app/': '/home/user/projects/my-app/',
  },

  // File filtering
  include: ['src/**/*.{tsx,jsx,vue,svelte}'],
  exclude: ['node_modules/**', '**/*.test.*'],
});
```

## Docker Support

When your app runs in a Docker container, file paths point to container paths (`/app/src/...`). Inspekt fixes this automatically:

```ts
// Auto-detect from docker-compose.yaml volume mounts
inspekt({ dockerCompose: true });

// Or specify manually
inspekt({
  pathMapping: {
    '/app/': process.cwd() + '/',
  },
});
```

## Custom Actions

Add your own actions to the inspector popover:

```ts
import { createInspekt } from '@inspekt/core';

const inspekt = createInspekt();

inspekt.registerAction({
  id: 'open-jira',
  label: 'Search Jira',
  icon: '<svg>...</svg>',
  handler(element) {
    window.open(`https://jira.example.com/search?q=${element.componentName}`);
  },
});
```

## Events

```ts
inspekt.on('inspect', (element) => {
  console.log('Inspected:', element.filePath, element.componentName);
});

inspekt.on('action', (actionId, element) => {
  console.log('Action:', actionId, 'on', element.componentName);
});
```

## Chrome Extension

The Chrome extension provides:

- **Global settings** — configure your IDE, theme, and shortcuts once for all projects
- **Standalone mode** — inject Inspekt into any page, even without a build plugin
- **Per-site overrides** — different settings for different projects
- **Settings sync** — chrome.storage.sync across devices

Load the extension from `packages/chrome/dist/` after building.

## Supported IDEs

VS Code, VS Code Insiders, Cursor, Windsurf, WebStorm, PhpStorm, PyCharm, IntelliJ IDEA, Sublime Text, Zed, Vim/Neovim, Emacs.

## How It Works

1. **Build time** — The bundler plugin injects `data-insp-path` attributes onto every component's root element with the source file path, line, and column
2. **Runtime** — When you `Ctrl+Alt+Click`, Inspekt walks up the DOM to find the nearest `data-insp-path`, shows a popover with actions, and highlights the element
3. **Component tree** — Framework-specific adapters (React Fiber, Vue instances, Svelte context, Solid owner) build the full component hierarchy for the tree panel

All Inspekt UI renders inside Shadow DOM to prevent any style conflicts with your app.

## Development

```bash
git clone https://github.com/steven-pribilinskiy/inspekt.git
cd inspekt
bun install
bun run build
bun run --filter 'inspekt-playground' dev
```

## License

MIT
