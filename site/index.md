---
layout: home

hero:
  name: Inspekt
  text: Click any element. Send context to your agent.
  tagline: The click-to-agent devtool for the era of Claude Code, Cursor, Codex, Gemini CLI, and Antigravity. Multi-framework, MCP-native, zero copy-paste.
  actions:
    - theme: brand
      text: Install
      link: /docs/install
    - theme: alt
      text: How it works
      link: /docs/quick-start
    - theme: alt
      text: GitHub
      link: https://github.com/steven-pribilinskiy/inspekt

features:
  - icon: ✂️
    title: Source snippets in the popover
    details: Not just file:line — Inspekt shows the actual surrounding lines of source code right in the overlay, with the target line highlighted. No peer (LocatorJS / code-inspector / react-grab) does this.
  - icon: 🤖
    title: Send to agent, no copy-paste
    details: Inspekt registers an MCP server with every agent you have installed. Grab an element → ask your agent "fix this" → it already has the file, line, snippet, and component name in context.
  - icon: 🎯
    title: Frictionless React
    details: React and Preact projects work with zero project setup. Inspekt reads source location from React fiber `_debugSource` via bippy — the same field Babel's default JSX-source plugin already populates in dev mode.
  - icon: 🌐
    title: Vue, Svelte, Solid, Astro
    details: One install with @code-inspector/core's AST-correct transforms. Works for the full multi-framework world — Vue 2/3, Svelte, Solid, Astro, Qwik, Preact, Nuxt, Next.js.
  - icon: 🚦
    title: Capability-aware icon
    details: The toolbar icon adapts per tab. Greyscale when there's nothing to inspect, color when the page is instrumented. Badges describe the snippet source — DEV / MAP / AI — so you know what mode you're in.
  - icon: 🔐
    title: Privacy-first source maps
    details: Source-map fallback is opt-in and explained up-front. Inspekt will never fetch .map files from your prod bundles without you turning it on. Localhost-only daemon with a per-install auth token.
---

<style>
.VPHero .name,
.VPHero .text {
  background: linear-gradient(135deg, #3b82f6 0%, #9333ea 60%, #ec4899 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
</style>
