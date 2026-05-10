<script setup lang="ts">
// Five-state icon strip. CSS-rendered chips that mirror the actual badge
// presentation in the Chrome extension. Same colors, same labels, same
// rules: AI > MAP/DEV > ON > OFF > greyscale.
</script>

<template>
  <section class="icons">
    <p class="inspekt-rule-label">05 · Toolbar icon</p>
    <h2 class="inspekt-h2">The icon tells you what's available.</h2>
    <p class="inspekt-lede">
      Per-tab capability state. Greyscale means there's nothing to inspect on
      this page. The badge describes how snippets resolve and whether an
      agent is connected. Hover the toolbar icon for the full title text.
    </p>

    <div class="strip">
      <div class="state state-grey">
        <div class="chip chip-grey"></div>
        <div class="meta">
          <span class="label">No instrumentation</span>
          <span class="hint">No <code>data-insp-path</code> on the page and no React fiber source. The inspector won't find anything here.</span>
        </div>
      </div>

      <div class="state">
        <div class="chip"><span style="background: #6b7280">OFF</span></div>
        <div class="meta">
          <span class="label">Disabled</span>
          <span class="hint">Page is instrumented but the inspector is off. Click the icon to enable.</span>
        </div>
      </div>

      <div class="state">
        <div class="chip"><span style="background: #3b82f6">ON</span></div>
        <div class="meta">
          <span class="label">Path only</span>
          <span class="hint">Active. Popover will show file path but no snippet.</span>
        </div>
      </div>

      <div class="state">
        <div class="chip"><span style="background: #16a34a">DEV</span></div>
        <div class="meta">
          <span class="label">Dev-server snippets</span>
          <span class="hint">Active. Snippets resolve via the local <code>/__inspekt/snippet</code> endpoint.</span>
        </div>
      </div>

      <div class="state">
        <div class="chip"><span style="background: #2563eb">MAP</span></div>
        <div class="meta">
          <span class="label">Source-map snippets</span>
          <span class="hint">Active. Snippets resolve via deployed source maps. Opt-in mode.</span>
        </div>
      </div>

      <div class="state state-ai">
        <div class="chip"><span style="background: #9333ea">AI</span></div>
        <div class="meta">
          <span class="label">Agent connected</span>
          <span class="hint">Active. Daemon reachable, "Send to Agent" works. Supersedes DEV/MAP.</span>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
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
  margin-bottom: 40px;
}
.inspekt-lede code {
  font-family: var(--vp-font-family-mono);
  font-size: 13px;
  padding: 1px 5px;
  background: var(--inspekt-paper-2);
  border-radius: 3px;
}

.strip {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 32px 40px;
}
@media (max-width: 900px) {
  .strip {
    grid-template-columns: 1fr;
  }
}

.state {
  display: grid;
  grid-template-columns: 60px 1fr;
  gap: 16px;
  align-items: start;
}

.chip {
  width: 48px;
  height: 48px;
  border-radius: 10px;
  background: linear-gradient(135deg, #3b82f6 0%, #9333ea 60%, #ec4899 100%);
  display: flex;
  align-items: flex-end;
  justify-content: flex-end;
  padding: 6px;
  border: 1px solid var(--inspekt-rule);
}
.chip span {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 26px;
  height: 14px;
  padding: 0 4px;
  border-radius: 3px;
  color: #fff;
  font-family: var(--vp-font-family-mono);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.02em;
}
.chip-grey {
  background: var(--inspekt-rule-strong);
  filter: grayscale(1);
}

.meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.label {
  font-size: 14px;
  font-weight: 600;
  color: var(--inspekt-ink);
}
.hint {
  font-size: 13px;
  line-height: 1.45;
  color: var(--inspekt-ink-2);
}
.hint code {
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
  padding: 0 4px;
  background: var(--inspekt-paper-2);
  border-radius: 3px;
}
</style>
