---
name: Inspekt
tagline: Click any element, get its source — or hand it to your agent
description: >-
  A framework-agnostic element inspector for dev servers: Ctrl+Alt+Click anything
  in your running app to see the file, line, and component tree behind it. Then
  open it in your IDE, or hand it — with its surrounding source — to a coding
  agent over MCP.
category: developer-tools
status: beta
features:
  - 'Ctrl+Alt+Click any element to reveal its source file, line, and column'
  - >-
    Component tree with props, search, and highlighting — React, Vue, Svelte, and
    Solid adapters plus a generic DOM fallback
  - >-
    Plugins for Vite, Webpack, Rspack, esbuild, and Rollup — the same inspector
    on any bundler
  - >-
    Send a grabbed element to Claude Code, Cursor, Codex, Gemini CLI, or
    Antigravity over MCP
  - >-
    Docker-aware — reads container-to-host path mappings straight from
    docker-compose.yaml
  - >-
    Opens files in your IDE — VS Code, Cursor, the JetBrains family, Zed,
    Sublime and more — and every popover action is extensible with your own
  - >-
    All UI renders in Shadow DOM, so it never collides with your app's styles
targetUser: >-
  Frontend developers who lose time mapping what they see in the browser back to
  the file that renders it — and who want that context handed to a coding agent
  instead of retyped.
featured: false
order: 23
icon: >-
  m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607
  10.607Z
gradientFrom: '#3b82f6'
gradientTo: '#ec4899'
---

## Vision

The gap between seeing a bug and editing the code that causes it is pure overhead:
you spot the misaligned button, then go hunting through a component tree in your
editor to find which file renders it. Inspekt closes that gap to one click. The
inspector knows the source location of every element because the bundler plugin
wrote it there at build time — so clicking is the lookup.

That same context is exactly what a coding agent needs and almost never gets.
"Fix this button" is useless without a file and a line; Inspekt turns the element
you clicked into a grab the agent can read over MCP, carrying the file, line,
component name, surrounding source, and page URL.

## The problem

Browser devtools show you the DOM, not your source. Framework devtools show you
the component tree, but stop at the boundary of your editor and know nothing
about your agent. And each of them is a separate extension per framework, so the
workflow resets every time you switch stacks.

Meanwhile, describing a UI element to an AI agent in prose is the slowest part of
using one. The information the agent needs is already on screen and already in
the build output — it just has no path from the browser to the agent.

## How it's different

- **Framework-agnostic by construction.** The source location is injected at
  build time onto every element, so the inspector works the same whether the app
  is React, Vue, Svelte, or Solid — and a generic DOM adapter covers the rest.
- **Any bundler.** Vite gets a first-class plugin with a dev-server integration;
  Webpack, Rspack, esbuild, and Rollup get the same transform through unplugin.
- **Built for the handoff.** The daemon holds a grab queue and the MCP server
  exposes it to agents over stdio, so an element you clicked in Chrome becomes a
  file and line in Claude Code, Cursor, Codex, Gemini CLI, or Antigravity.
- **Docker is a first-class case.** When the app runs in a container, paths point
  at `/app/...`; Inspekt reads the volume mounts out of `docker-compose.yaml` and
  maps them back to your real checkout.
- **Works without a build step too.** The Chrome extension carries global
  settings across projects and can inject the inspector into a page that has no
  plugin installed at all.

MIT licensed and published to npm as `@aylith/inspekt-*` — install
`@aylith/inspekt` for everything at once, or just the plugin for your bundler.
