import { defineConfig } from 'tsup';

export default defineConfig({
  entry: { index: 'src/index.ts', cli: 'src/cli.ts' },
  format: ['esm'],
  // Skip DTS — the MCP SDK's deeply generic registerTool signatures push
  // tsc past its ts2589 recursion limit. Consumers (agents) only need the
  // executable bin; the public TS API surface is `createMcpServer`, typed
  // via the source.
  dts: false,
  clean: true,
  sourcemap: true,
  target: 'node18',
  platform: 'node',
});
