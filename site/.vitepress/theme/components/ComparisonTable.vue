<script setup lang="ts">
// Comparison matrix promoted from docs/comparison.md. The Inspekt column is
// highlighted; other tools sit in neutral columns.

interface Row { feature: string; inspekt: string; locator: string; codeInspector: string; reactGrab: string }

const rows: Row[] = [
  { feature: 'Click → open IDE', inspekt: '✓', locator: '✓', codeInspector: '✓', reactGrab: '✓' },
  { feature: 'Source snippet in overlay', inspekt: '✓', locator: '—', codeInspector: '—', reactGrab: '—' },
  { feature: 'Source-map fallback', inspekt: '✓ opt-in', locator: '—', codeInspector: '—', reactGrab: '—' },
  { feature: 'Capability-aware icon', inspekt: '✓', locator: '—', codeInspector: 'n/a', reactGrab: '—' },
  { feature: 'Multi-framework AST transform', inspekt: '✓ (via code-inspector)', locator: '✓ (own)', codeInspector: '✓', reactGrab: '—' },
  { feature: 'Zero-config React via fiber', inspekt: '✓ (via bippy)', locator: '✓', codeInspector: '—', reactGrab: '✓ (via bippy)' },
  { feature: 'Chrome extension', inspekt: '✓', locator: '✓', codeInspector: '—', reactGrab: '✓' },
  { feature: 'MCP server for agents', inspekt: '✓', locator: '—', codeInspector: '—', reactGrab: '—' },
  { feature: 'Cross-app config sync', inspekt: '✓', locator: '—', codeInspector: '—', reactGrab: '—' },
  { feature: 'Setup CLI', inspekt: '✓ npx inspekt setup', locator: '—', codeInspector: '—', reactGrab: '—' },
  { feature: 'Maintained 2026', inspekt: '✓', locator: 'dormant', codeInspector: '✓', reactGrab: '✓' },
];
</script>

<template>
  <section class="cmp">
    <p class="inspekt-rule-label">06 · Comparison</p>
    <h2 class="inspekt-h2">Where Inspekt sits in the click-to-source space.</h2>
    <p class="inspekt-lede">
      The headline isn't "we do everything." It's "we glue the right pieces
      together for the agent era." Inspekt depends on
      <a href="https://github.com/zh-lx/code-inspector">@code-inspector/core</a>
      for transforms and <a href="https://github.com/aidenybai/bippy">bippy</a>
      for React fiber. The agent layer is what's new.
    </p>

    <div class="wrap">
      <table>
        <thead>
          <tr>
            <th class="feature">Capability</th>
            <th class="inspekt-col">Inspekt</th>
            <th>LocatorJS</th>
            <th>code-inspector-plugin</th>
            <th>react-grab</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.feature">
            <td class="feature">{{ row.feature }}</td>
            <td class="inspekt-col" :class="{ has: row.inspekt !== '—', miss: row.inspekt === '—' }">{{ row.inspekt }}</td>
            <td :class="{ has: row.locator !== '—', miss: row.locator === '—' }">{{ row.locator }}</td>
            <td :class="{ has: row.codeInspector !== '—', miss: row.codeInspector === '—' }">{{ row.codeInspector }}</td>
            <td :class="{ has: row.reactGrab !== '—', miss: row.reactGrab === '—' }">{{ row.reactGrab }}</td>
          </tr>
        </tbody>
      </table>
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
  margin-bottom: 36px;
}
.inspekt-lede a {
  color: var(--inspekt-violet);
  text-decoration: underline;
  text-underline-offset: 3px;
}

.wrap {
  overflow-x: auto;
  border: 1px solid var(--inspekt-rule);
  border-radius: 10px;
  background: var(--inspekt-paper);
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

th, td {
  text-align: left;
  padding: 14px 18px;
  border-bottom: 1px solid var(--inspekt-rule);
  vertical-align: middle;
}
tr:last-child td {
  border-bottom: 0;
}

th {
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--inspekt-ink-3);
  font-weight: 500;
  background: var(--inspekt-paper-2);
}

td.feature, th.feature {
  font-weight: 500;
  color: var(--inspekt-ink);
  white-space: nowrap;
}
td.feature {
  font-weight: 500;
}

th.inspekt-col {
  color: var(--inspekt-violet);
  font-weight: 700;
  background: var(--inspekt-violet-soft);
}
td.inspekt-col {
  background: var(--inspekt-violet-soft);
  color: var(--inspekt-ink);
  font-weight: 500;
}

td.has {
  color: var(--inspekt-ink);
}
td.miss {
  color: var(--inspekt-ink-3);
}
</style>
