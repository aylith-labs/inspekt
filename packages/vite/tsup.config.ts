import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/unplugin.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  external: ['vite', '@inspekt/core', '@inspekt/cli', /^node:/],
});
