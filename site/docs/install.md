# Install

Inspekt has three pieces you install once each:

1. The **Chrome extension** (the UI surface for grabbing and inspecting).
2. The **Vite plugin** in any project where you want snippets + click-to-source for Vue/Svelte/Solid/Astro. React/Preact need nothing.
3. The **agent integration** via `npx @aylith/inspekt setup` (one-shot CLI that wires Inspekt into Claude Code, Cursor, Codex, Gemini CLI, and Antigravity).

## 1. Chrome extension

Install from the Chrome Web Store:

[Add to Chrome →](https://chromewebstore.google.com/detail/inspekt/TODO)

> The Web Store listing is pending. For now, clone the repo and load
> `packages/chrome/dist` as an unpacked extension via Chrome's developer mode.

## 2. Vite plugin

For React/Preact projects you can skip this — Inspekt reads source location
from React fiber `_debugSource` via [bippy](https://github.com/aidenybai/bippy).

For Vue, Svelte, Solid, Astro:

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

The plugin only injects in development. Production builds are untouched.

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

See [Agent integration](/docs/agent-integration) for the per-agent details.

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

After install, open any of your dev projects in Chrome with the extension
loaded. The Inspekt toolbar icon should:

- Be **greyscale** on plain sites (no instrumentation).
- Be **full color** on Inspekt-instrumented sites (React in dev, or any project
  with `@aylith/inspekt-vite` configured).
- Show a **DEV** badge when the local dev server is up.

Click an element → the popover shows the file path. Expand the snippet section
to see surrounding source. See [Quick start](/docs/quick-start) for a
guided walkthrough.
