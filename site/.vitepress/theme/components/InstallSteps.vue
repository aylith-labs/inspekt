<script setup lang="ts">
import { ref } from 'vue';
const copied = ref(false);

function copy(text: string) {
  navigator.clipboard?.writeText(text).then(() => {
    copied.value = true;
    setTimeout(() => (copied.value = false), 1400);
  });
}
</script>

<template>
  <section class="install">
    <p class="inspekt-rule-label">07 · Install</p>
    <h2 class="inspekt-h2">Three steps. No registration. No SaaS.</h2>

    <ol class="steps">
      <li>
        <span class="inspekt-step-num">1</span>
        <div class="body">
          <h3>Install the Chrome extension.</h3>
          <p>From the Chrome Web Store (pending review), or load unpacked from <code>packages/chrome/dist</code>.</p>
          <a class="link" href="https://chromewebstore.google.com/detail/inspekt/TODO">Open Chrome Web Store →</a>
        </div>
      </li>
      <li>
        <span class="inspekt-step-num">2</span>
        <div class="body">
          <h3>Add the Vite plugin <span class="aside">(skip for React)</span>.</h3>
          <p>React and Preact read source location from fiber data. For Vue, Svelte, Solid, Astro:</p>
          <div class="code-wrap">
            <code>bun add -D @inspekt/vite</code>
            <button class="copy" @click="copy('bun add -D @inspekt/vite')">{{ copied ? 'copied' : 'copy' }}</button>
          </div>
        </div>
      </li>
      <li>
        <span class="inspekt-step-num">3</span>
        <div class="body">
          <h3>Register Inspekt with your agents.</h3>
          <p>One command detects every agent on the machine and writes the MCP entry. Idempotent.</p>
          <div class="code-wrap">
            <code>npx inspekt setup</code>
            <button class="copy" @click="copy('npx inspekt setup')">{{ copied ? 'copied' : 'copy' }}</button>
          </div>
        </div>
      </li>
    </ol>
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
  margin-bottom: 32px;
}

.steps {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 36px;
}
.steps > li {
  display: grid;
  grid-template-columns: 36px 1fr;
  gap: 20px;
  padding-bottom: 28px;
  border-bottom: 1px solid var(--inspekt-rule);
}
.steps > li:last-child {
  border-bottom: 0;
}

.body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.body h3 {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0;
  color: var(--inspekt-ink);
  line-height: 1.3;
}
.body h3 .aside {
  font-weight: 400;
  font-size: 1rem;
  color: var(--inspekt-ink-3);
  margin-left: 4px;
}
.body p {
  font-size: 15px;
  line-height: 1.55;
  color: var(--inspekt-ink-2);
  margin: 0;
  max-width: 60ch;
}
.body p code {
  font-family: var(--vp-font-family-mono);
  font-size: 13px;
  padding: 1px 5px;
  background: var(--inspekt-paper-2);
  border-radius: 3px;
}

.code-wrap {
  display: inline-flex;
  align-items: center;
  gap: 0;
  background: var(--inspekt-pill-bg);
  border-radius: 6px;
  overflow: hidden;
  align-self: flex-start;
}
.code-wrap code {
  padding: 10px 16px;
  font-family: var(--vp-font-family-mono);
  font-size: 13.5px;
  color: var(--inspekt-pill-fg);
  background: transparent;
}
.copy {
  padding: 10px 14px;
  background: var(--inspekt-violet);
  color: #fff;
  border: 0;
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  cursor: pointer;
  font-weight: 600;
}
.copy:hover {
  background: var(--inspekt-violet-bright);
}

.link {
  font-size: 14px;
  color: var(--inspekt-violet);
  text-decoration: none;
  font-weight: 500;
  align-self: flex-start;
}
.link:hover {
  text-decoration: underline;
}
</style>
