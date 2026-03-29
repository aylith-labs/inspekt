import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/unplugin.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  external: ['vite', '@devlens/core', '@devlens/cli', /^node:/],
});
