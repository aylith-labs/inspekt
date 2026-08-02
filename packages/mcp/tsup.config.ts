import { defineConfig } from 'tsup';

export default defineConfig({
  entry: { index: 'src/index.ts', cli: 'src/cli.ts' },
  format: ['esm'],
  // Declarations come from `tsc --emitDeclarationOnly` in the build script,
  // matching the other packages — tsup's rollup-plugin-dts is incompatible with
  // TypeScript 7.
  dts: false,
  clean: true,
  sourcemap: true,
  target: 'node18',
  platform: 'node',
});
