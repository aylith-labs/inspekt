import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/unplugin.ts'],
  format: ['esm', 'cjs'],
  dts: false,
  sourcemap: true,
  clean: true,
  external: ['vite', '@aylith/inspekt-core', '@aylith/inspekt-cli', /^node:/],
});
