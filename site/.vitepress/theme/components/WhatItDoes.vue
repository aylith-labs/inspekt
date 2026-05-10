<script setup lang="ts">
// "What it does" — three asymmetric blocks. Not three identical cards. Each
// block uses a different column span so the rhythm breaks the SaaS grid.
</script>

<template>
  <section class="what">
    <p class="inspekt-rule-label">02 · What it does</p>

    <div class="grid">
      <article class="block block-a">
        <header>
          <span class="num">01</span>
          <h3 class="inspekt-h2">Source snippets, not just paths.</h3>
        </header>
        <p class="lede">
          Click an element. The popover shows the surrounding lines of code
          with the target line highlighted. Resolved from your dev server
          when it's running, from source maps when you opt in. The agent gets
          the snippet too, so it doesn't have to re-read the file before
          editing.
        </p>
        <p class="meta">
          <span>Resolves via</span>
          <code>/__inspekt/snippet</code> · <code>fiber._debugSource</code> ·
          <code>@jridgewell/trace-mapping</code>
        </p>
      </article>

      <article class="block block-b">
        <header>
          <span class="num">02</span>
          <h3 class="inspekt-h2">One setup. Every agent.</h3>
        </header>
        <p class="lede">
          <code>npx inspekt setup</code> generates a per-machine auth token,
          writes an MCP server entry to every detected agent, drops a skill
          file into Claude Code. Re-running is idempotent. Token, daemon URL,
          and agent prefs sync via <code>chrome.storage.sync</code>: configure
          once, works on every machine you sign into.
        </p>
        <p class="meta">
          <span>Registers with</span>
          Claude Code · Cursor · Codex · Gemini CLI · Antigravity
        </p>
      </article>

      <article class="block block-c">
        <header>
          <span class="num">03</span>
          <h3 class="inspekt-h2">React works with zero setup.</h3>
        </header>
        <p class="lede">
          Inspekt reads source location from React fiber's
          <code>_debugSource</code> via
          <a href="https://github.com/aidenybai/bippy">bippy</a>. That field
          is already populated by Babel's default JSX-source plugin in any
          modern React dev setup, so React and Preact need nothing in your
          project. Vue, Svelte, Solid, Astro use
          <a href="https://github.com/zh-lx/code-inspector">@code-inspector/core</a>
          AST transforms, also without per-component work.
        </p>
      </article>
    </div>
  </section>
</template>

<style scoped>
.what {
  padding: 96px 0;
}
.grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  column-gap: 32px;
  row-gap: 64px;
  margin-top: 32px;
}
@media (max-width: 900px) {
  .grid {
    grid-template-columns: 1fr;
    row-gap: 48px;
  }
}

.block {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.block-a {
  grid-column: 1 / span 7;
}
.block-b {
  grid-column: 6 / span 7;
}
.block-c {
  grid-column: 1 / span 8;
}
@media (max-width: 900px) {
  .block-a,
  .block-b,
  .block-c {
    grid-column: 1 / -1;
  }
}

.block header {
  display: flex;
  align-items: baseline;
  gap: 16px;
}

.num {
  font-family: var(--vp-font-family-mono);
  font-size: 14px;
  font-weight: 700;
  color: var(--inspekt-violet);
  letter-spacing: 0.02em;
}

.inspekt-h2 {
  font-size: var(--inspekt-size-h2);
  font-weight: 600;
  line-height: 1.1;
  letter-spacing: -0.02em;
  margin: 0;
  color: var(--inspekt-ink);
}

.lede {
  font-size: 1.0625rem;
  line-height: 1.6;
  color: var(--inspekt-ink-2);
  max-width: 62ch;
  margin: 0;
}
.lede code {
  font-family: var(--vp-font-family-mono);
  font-size: 13px;
  padding: 1px 5px;
  background: var(--inspekt-paper-2);
  border-radius: 3px;
  color: var(--inspekt-ink);
}
.lede a {
  color: var(--inspekt-violet);
  text-decoration: underline;
  text-underline-offset: 3px;
  text-decoration-thickness: 1px;
}

.meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
  letter-spacing: 0.04em;
  color: var(--inspekt-ink-3);
  text-transform: lowercase;
  margin: 4px 0 0;
}
.meta span {
  color: var(--inspekt-ink-3);
}
.meta code {
  padding: 1px 6px;
  background: var(--inspekt-paper-2);
  border-radius: 3px;
  color: var(--inspekt-violet);
}
</style>
