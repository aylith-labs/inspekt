# Install

For the public Vite quick-start, install the plugin in your local development project. It injects the inspector UI; the Chrome extension and agent integration are optional.

Download the <a href="../downloads/inspekt-vite-0.2.3.zip" target="_self" download>Vite package bundle</a> and <a href="../downloads/SHA256SUMS" target="_self" download>checksums</a>. It contains core 0.4.1, CLI 0.1.2 and Vite 0.2.3, plus the original MIT notices. Extract it into your existing Vite project and install all three archives together. These files install directly; the command does not request these versions from the npm registry. An internet connection is required for npm to install their external dependencies.

## 1. Chrome extension

The Vite package bundle includes the inspector runtime and does not require an extension. A separately built Chrome extension uses Chrome's unpacked-extension installation in developer mode.

## 2. Vite plugin

This route injects the runtime as well as source attributes, including in React
projects. React by itself does not install an inspector. The separate extension
can try framework metadata, but that metadata depends on the framework/build and
does not replace the Vite setup described here.

```sh
sha256sum -c SHA256SUMS
npm install -D ./aylith-inspekt-core-0.4.1.tgz ./aylith-inspekt-cli-0.1.2.tgz ./aylith-inspekt-vite-0.2.3.tgz
```

Use the Node.js version supported by your existing Vite project. Keep its framework plugin.

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
AST-based source-attribute injection for JSX/TSX, Vue SFC, and Svelte files.
Keep the plugin alongside your existing React/Vite setup.

By default, source attributes and the inspector runtime are development-only.
`enableInProduction` is an explicit opt-in for source attributes, not a hosted
inspector or editor/snippet server.

## Agent integration

Download the <a href="../downloads/inspekt-agent-0.1.3.zip" target="_self" download>five-package agent bundle</a> to add daemon 0.1.2 and MCP 0.1.3 alongside the Vite chain. Check its SHA256SUMS and install all five files into your project:

```sh
npm install -D ./aylith-inspekt-core-0.4.1.tgz ./aylith-inspekt-cli-0.1.2.tgz ./aylith-inspekt-vite-0.2.3.tgz ./aylith-inspekt-daemon-0.1.2.tgz ./aylith-inspekt-mcp-0.1.3.tgz
./node_modules/.bin/inspekt setup --agents claude-code,cursor
```

Setup registers the locally installed MCP executable, stores a private token and queue path, and preserves other agent configuration. Restart your agent to load its MCP server. Use `--config-home /absolute/profile` to select another configuration profile. Installing only the Vite bundle still supports the inspect, source excerpt, copy-path and editor workflow; setup additionally requires the agent bundle.

Start `./node_modules/.bin/inspekt-daemon` for your default home profile. With another profile, pass its private `INSPEKT_TOKEN` and `INSPEKT_QUEUE_PATH` through the environment; do not share the token. The daemon and MCP server use the same locked queue. Agent tools include `grab_latest`, `list_grabs`, `get_grab` and `mark_grab_processed`.

Browser capture uses a separate extension installation. The agent package bundle installs the receiving daemon and MCP tools; it does not add an extension or capture UI to Chrome.

## Verify

For Vite, start your existing dev script and open its reported URL. Use
`Ctrl+Alt+Click` (`Cmd+Alt+Click` on Mac): the popover should identify the file and
line. Expand **Show source**, try **Copy path**, then Escape and an ordinary page
click. Neither extension badges nor agent access are required for this check.

For the optional extension route, the toolbar icon should:

- Be **greyscale** on plain sites (no instrumentation).
- Be **full color** on Inspekt-instrumented sites (React in dev, or any project
  with `@aylith/inspekt-vite` configured).
- Show a **DEV** badge when the local dev server is up.

Click an element → the popover shows the file path. Expand the snippet section
to see surrounding source. See [Quick start](/quick-start) for a
guided walkthrough.
