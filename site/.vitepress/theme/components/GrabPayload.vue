<script setup lang="ts">
// Renders the grab payload JSON with academic-paper-style margin
// annotations. Two columns: code on the left, callouts on the right.
</script>

<template>
  <section class="payload">
    <p class="inspekt-rule-label">03 · The grab payload</p>
    <h2 class="inspekt-h2">What lands in your agent.</h2>
    <p class="inspekt-lede">
      Every grab is a JSON record. The Chrome extension POSTs it to the
      daemon; the daemon appends to <code>~/.inspekt/queue.jsonl</code>; the
      MCP server reads it back to your agent. Inspekt doesn't transform the
      payload along the way — what your agent sees is what the extension
      sent.
    </p>

    <div class="payload-grid">
      <pre class="code" aria-label="Example grab payload"><span class="line"><span class="t-brace">{</span></span>
<span class="line">  <span class="t-key">"id"</span>: <span class="t-str">"01HG6Z4N8VK7M…"</span>,        <span data-marker="1" /></span>
<span class="line">  <span class="t-key">"timestamp"</span>: <span class="t-num">1715200013428</span>,</span>
<span class="line">  <span class="t-key">"url"</span>: <span class="t-str">"http://localhost:5173/dashboard"</span>,</span>
<span class="line">  <span class="t-key">"element"</span>: <span class="t-brace">{</span></span>
<span class="line">    <span class="t-key">"filePath"</span>: <span class="t-str">"src/components/Button.tsx"</span>,</span>
<span class="line">    <span class="t-key">"line"</span>: <span class="t-num">42</span>,</span>
<span class="line">    <span class="t-key">"column"</span>: <span class="t-num">5</span>,</span>
<span class="line">    <span class="t-key">"componentName"</span>: <span class="t-str">"Button"</span>,</span>
<span class="line">    <span class="t-key">"tagName"</span>: <span class="t-str">"button"</span>,</span>
<span class="line">    <span class="t-key">"classList"</span>: [<span class="t-str">"btn"</span>, <span class="t-str">"btn-primary"</span>],</span>
<span class="line">    <span class="t-key">"snippet"</span>: <span class="t-brace">{</span>                       <span data-marker="2" /></span>
<span class="line">      <span class="t-key">"startLine"</span>: <span class="t-num">37</span>,</span>
<span class="line">      <span class="t-key">"endLine"</span>: <span class="t-num">47</span>,</span>
<span class="line">      <span class="t-key">"targetLine"</span>: <span class="t-num">42</span>,</span>
<span class="line">      <span class="t-key">"lines"</span>: [<span class="t-str">"export function Button("</span>, …],</span>
<span class="line">      <span class="t-key">"language"</span>: <span class="t-str">"tsx"</span>,</span>
<span class="line">      <span class="t-key">"source"</span>: <span class="t-str">"devserver"</span>             <span data-marker="3" /></span>
<span class="line">    <span class="t-brace">}</span></span>
<span class="line">  <span class="t-brace">}</span>,</span>
<span class="line">  <span class="t-key">"comment"</span>: <span class="t-str">"wrong shade on hover"</span>,    <span data-marker="4" /></span>
<span class="line">  <span class="t-key">"source"</span>: <span class="t-str">"extension"</span></span>
<span class="line"><span class="t-brace">}</span></span></pre>

      <aside class="notes">
        <div class="note">
          <span class="marker">1</span>
          <p>
            ULID. Sortable by time, unique across machines. Lets the agent
            cite a specific grab even when several are queued.
          </p>
        </div>
        <div class="note">
          <span class="marker">2</span>
          <p>
            Snippet ships inline. Most agent edits don't need a separate
            file read — the surrounding ten or so lines are already in
            context.
          </p>
        </div>
        <div class="note">
          <span class="marker">3</span>
          <p>
            Resolution origin. <code>devserver</code> when the local dev
            server answered, <code>sourcemap</code> when it didn't but
            source-map fallback is enabled, <code>fiber</code> for React
            zero-config.
          </p>
        </div>
        <div class="note">
          <span class="marker">4</span>
          <p>
            Optional. Type a note into the popover before sending; it ships
            with the grab. Useful for "the request is non-obvious" cases.
          </p>
        </div>
      </aside>
    </div>
  </section>
</template>

<style scoped>
.payload {
  padding: 0;
}
.inspekt-h2 {
  margin-top: 12px;
  font-size: var(--inspekt-size-h2);
  font-weight: 600;
  line-height: 1.1;
  letter-spacing: -0.02em;
  color: var(--inspekt-ink);
  margin-bottom: 12px;
}
.inspekt-lede {
  max-width: 64ch;
  margin-bottom: 36px;
}
.inspekt-lede code {
  font-family: var(--vp-font-family-mono);
  font-size: 13px;
  padding: 1px 5px;
  background: var(--inspekt-paper-2);
  border-radius: 3px;
}

.payload-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) minmax(220px, 0.9fr);
  gap: 48px;
}
@media (max-width: 900px) {
  .payload-grid {
    grid-template-columns: 1fr;
    gap: 28px;
  }
}

.code {
  margin: 0;
  padding: 24px 28px;
  background: var(--inspekt-pill-bg);
  color: var(--inspekt-pill-fg-dim);
  border-radius: 10px;
  font-family: var(--vp-font-family-mono);
  font-size: 12.5px;
  line-height: 1.7;
  overflow-x: auto;
  white-space: pre;
}

.code .t-key { color: oklch(0.78 0.13 285); }
.code .t-str { color: oklch(0.84 0.08 100); }
.code .t-num { color: oklch(0.78 0.13 200); }
.code .t-brace { color: oklch(0.7 0.02 285); }

.code [data-marker] {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  margin-left: 18px;
  border-radius: 999px;
  background: var(--inspekt-violet);
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  vertical-align: middle;
}
.code [data-marker="1"]::before { content: '1'; }
.code [data-marker="2"]::before { content: '2'; }
.code [data-marker="3"]::before { content: '3'; }
.code [data-marker="4"]::before { content: '4'; }

.notes {
  display: flex;
  flex-direction: column;
  gap: 22px;
  padding-top: 6px;
}
.note {
  display: grid;
  grid-template-columns: 28px 1fr;
  gap: 12px;
  align-items: start;
}
.note .marker {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 999px;
  background: var(--inspekt-violet);
  color: #fff;
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
  font-weight: 700;
}
.note p {
  margin: 2px 0 0;
  font-size: 14px;
  line-height: 1.55;
  color: var(--inspekt-ink-2);
}
.note p code {
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
  padding: 0 4px;
  background: var(--inspekt-paper-2);
  border-radius: 3px;
}
</style>
