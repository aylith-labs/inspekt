<script setup lang="ts">
// Long-form credit roll. Reinforces principle #1 (don't reinvent the wheel)
// from PRODUCT.md. Lists every reused OSS lib with one line on what it does.

const credits = [
  { name: 'launch-editor', author: 'yyx990803', role: 'opens files in the user IDE', url: 'https://github.com/yyx990803/launch-editor' },
  { name: 'bippy', author: 'aidenybai', role: 'React fiber traversal', url: 'https://github.com/aidenybai/bippy' },
  { name: 'react-grab', author: 'aidenybai', role: 'runtime primitives (freeze, context, open-file)', url: 'https://github.com/aidenybai/react-grab' },
  { name: '@code-inspector/core', author: 'zh-lx', role: 'AST source-attribute injection across frameworks', url: 'https://github.com/zh-lx/code-inspector' },
  { name: '@jridgewell/trace-mapping', author: 'jridgewell', role: 'source-map resolution at runtime', url: 'https://github.com/jridgewell/trace-mapping' },
  { name: '@modelcontextprotocol/sdk', author: 'Anthropic', role: 'MCP server scaffolding', url: 'https://github.com/modelcontextprotocol/typescript-sdk' },
  { name: 'hono', author: 'honojs', role: 'daemon HTTP routing', url: 'https://hono.dev' },
  { name: 'VitePress', author: 'vuejs', role: 'this docs site', url: 'https://vitepress.dev' },
];
</script>

<template>
  <footer class="credits">
    <p class="inspekt-rule-label">Built on</p>
    <h2 class="inspekt-h2">The wheels Inspekt doesn't reinvent.</h2>
    <p class="inspekt-lede">
      Inspekt's identity is the glue layer — setup CLI, agent routing,
      Chrome-extension shell, capability-aware icon, queue persistence.
      Everything else is delegated to OSS that does it better than we would.
    </p>
    <ul class="list">
      <li v-for="c in credits" :key="c.name">
        <a :href="c.url" target="_blank" rel="noopener">
          <span class="lib"><code>{{ c.name }}</code></span>
          <span class="author">{{ c.author }}</span>
        </a>
        <span class="role">{{ c.role }}</span>
      </li>
    </ul>
    <div class="meta">
      <span>MIT licensed</span>
      <span>·</span>
      <a href="https://github.com/steven-pribilinskiy/inspekt">github.com/steven-pribilinskiy/inspekt</a>
    </div>
  </footer>
</template>

<style scoped>
.credits {
  padding: 96px 0 64px;
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
  margin-bottom: 40px;
}

.list {
  list-style: none;
  margin: 0;
  padding: 0;
  border-top: 1px solid var(--inspekt-rule);
}
.list li {
  display: grid;
  grid-template-columns: minmax(280px, 320px) 1fr;
  gap: 32px;
  align-items: baseline;
  padding: 14px 0;
  border-bottom: 1px solid var(--inspekt-rule);
}
.list a {
  text-decoration: none;
  display: inline-flex;
  align-items: baseline;
  gap: 10px;
}
.list a:hover .lib code {
  background: var(--inspekt-violet);
  color: #fff;
}
.lib code {
  font-family: var(--vp-font-family-mono);
  font-size: 14px;
  font-weight: 500;
  padding: 2px 6px;
  background: var(--inspekt-violet-soft);
  color: var(--inspekt-violet-on-soft);
  border-radius: 4px;
  transition: background 0.15s ease, color 0.15s ease;
}
.author {
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
  color: var(--inspekt-ink-3);
}
.role {
  font-size: 14px;
  color: var(--inspekt-ink-2);
  line-height: 1.45;
}

@media (max-width: 700px) {
  .list li {
    grid-template-columns: 1fr;
    gap: 4px;
  }
}

.meta {
  margin-top: 32px;
  display: flex;
  gap: 12px;
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
  color: var(--inspekt-ink-3);
}
.meta a {
  color: var(--inspekt-violet);
  text-decoration: none;
}
.meta a:hover {
  text-decoration: underline;
}
</style>
