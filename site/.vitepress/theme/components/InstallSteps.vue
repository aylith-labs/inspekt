<script setup lang="ts">
import { ref } from 'vue';
import cli from '../../../../packages/cli/package.json';
import core from '../../../../packages/core/package.json';
import vite from '../../../../packages/vite/package.json';

const bundleHref = `../downloads/inspekt-vite-${vite.version}.zip`;
const installCommand = `npm install -D ./aylith-inspekt-core-${core.version}.tgz ./aylith-inspekt-cli-${cli.version}.tgz ./aylith-inspekt-vite-${vite.version}.tgz`;

const copied = ref(false);

function copy(text: string) {
  navigator.clipboard
    ?.writeText(text)
    .then(() => {
      copied.value = true;
      setTimeout(() => (copied.value = false), 1400);
    })
    .catch(() => {
      copied.value = false;
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
          <h3>Download the Vite package bundle.</h3>
          <p>Extract the three package archives into your existing Vite project and verify SHA256SUMS. npm installs their external dependencies; you do not need the extension or an agent for the basic inspector.</p>
          <a class="link" :href="bundleHref">Download the package bundle →</a>
        </div>
      </li>
      <li>
        <span class="inspekt-step-num">2</span>
        <div class="body">
          <h3>Add the Vite plugin.</h3>
          <p>Install all three archives, keep your framework plugin, then add inspekt() to your Vite plugins.</p>
          <div class="code-wrap">
            <code>{{ installCommand }}</code>
            <button class="copy" @click="copy(installCommand)">{{ copied ? 'copied' : 'copy' }}</button>
          </div>
        </div>
      </li>
      <li>
        <span class="inspekt-step-num">3</span>
        <div class="body">
          <h3>Inspect your running development page.</h3>
          <p>Start your existing development script and open its URL. Ctrl+Alt+Click an instrumented element, expand Show source, then Copy path. Press Escape to return to ordinary clicks. Your configured editor must be installed to open a file.</p>
          <a class="link" href="./install">Full install guide →</a>
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
  max-width: 100%;
  align-items: center;
  gap: 0;
  background: var(--inspekt-pill-bg);
  border-radius: 6px;
  overflow: hidden;
  align-self: flex-start;
}
.code-wrap code {
  min-width: 0;
  overflow-wrap: anywhere;
  padding: 10px 16px;
  font-family: var(--vp-font-family-mono);
  font-size: 13.5px;
  color: var(--inspekt-pill-fg);
  background: transparent;
}
.copy {
  flex-shrink: 0;
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
