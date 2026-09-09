# Install

For the public Vite quick-start, install the plugin in your local development project. It injects the inspector UI; the Chrome extension and agent integration are optional.

Published versions and exact publication dates are available in the public
[Vite package registry metadata](https://registry.npmjs.org/@aylith/inspekt-vite)
(`versions` and `time`). Package history is separate from studio notes and local
unreleased fixes; publication does not verify every setup or feature.

1. The **Vite plugin** for your local frontend project and development server.
2. The optional **Chrome extension** for standalone inspection and shared settings.
3. Optional **agent integration** via `npx @aylith/inspekt setup`, which changes local agent configuration and requires an installed supported client.

## 1. Chrome extension

There is no verified Chrome Web Store installer. For this optional source-build route, clone the repository, install its build dependencies and build the extension. Load repository-root `dist/` as an unpacked extension in Chrome's developer mode. The Vite route below does not need it.

## 2. Vite plugin

This route injects the runtime as well as source attributes, including in React
projects. React by itself does not install an inspector. The separate extension
can try framework metadata, but that metadata depends on the framework/build and
does not replace the Vite setup described here.

::: code-group

```bash [bun]
bun add -D @aylith/inspekt-vite
```

```bash [pnpm]
pnpm add -D @aylith/inspekt-vite
```

```bash [npm]
npm install -D @aylith/inspekt-vite
```

:::

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import { inspekt } from '@aylith/inspekt-vite';

export default defineConfig({
  plugins: [
    // Retain the framework plugins already used by this project.
    inspekt({
      // Auto-detect docker-compose path mappings (container path → host path)
      dockerCompose: true,
    }),
  ],
});
```

Inspekt's transform wraps [`@code-inspector/core`](https://github.com/zh-lx/code-inspector)'s
AST-based source-attribute injection, so it handles every framework code-inspector supports:
React, Preact, Vue 2/3, Solid, Svelte, Astro, Qwik, Nuxt, Next.js, Umi.

By default, source attributes and the inspector runtime are development-only.
`enableInProduction` is an explicit opt-in for source attributes, not a hosted
inspector or editor/snippet server. Published0.2.1 has a known dev-script link
left in production HTML; the local correction still needs release approval.

## 3. Agent integration

```bash
npx @aylith/inspekt setup
```

This generates an auth token, writes it to `~/.inspekt/config.json`, and adds
an MCP server entry for every detected agent. Re-running is idempotent — it
preserves the token and refreshes config entries.

To target specific agents:

```bash
npx @aylith/inspekt setup --agents claude-code,cursor
```

See [Agent integration](/agent-integration) for the per-agent details.

## 4. (Optional) Long-running daemon

Inspekt's daemon auto-starts on the first grab. If you prefer to run it
manually:

```bash
npx @aylith/inspekt-daemon
```

Useful when you want grabs to be queued even before any agent has spawned its
MCP server. The daemon is bound to `127.0.0.1:5678` by default and gated by
the auth token in `~/.inspekt/config.json`.

## Verify

For Vite, start your existing dev script and open its reported URL. Use
`Ctrl+Alt+Click` (`Cmd+Alt+Click` on Mac): the popover should identify the file and
line. Expand **Show source**, try **Copy path**, then Escape and an ordinary page
click. Neither extension badges nor agent access are required for this check.

Published core0.4.0 currently fails to parse Vite-normalized Windows drive paths,
and Vite0.2.1 can probe the wrong origin if the actual server port differs.
Local source repairs are not evidence that npm has been updated. Other platforms
and frameworks remain separately testable, not assumed from this Windows result.

For the optional extension route, the toolbar icon should:

- Be **greyscale** on plain sites (no instrumentation).
- Be **full color** on Inspekt-instrumented sites (React in dev, or any project
  with `@aylith/inspekt-vite` configured).
- Show a **DEV** badge when the local dev server is up.

Click an element → the popover shows the file path. Expand the snippet section
to see surrounding source. See [Quick start](/quick-start) for a
guided walkthrough.
