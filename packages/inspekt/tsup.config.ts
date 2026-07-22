import { defineConfig } from 'tsup';

// Umbrella re-export stubs. The sub-packages stay external — this package only
// re-exports them. Declarations come from `tsc --emitDeclarationOnly` (build
// script), mirroring the other @aylith umbrella packages.
export default defineConfig({
  entry: ['src/index.ts', 'src/vite.ts', 'src/bundlers.ts'],
  format: ['esm'],
  dts: false,
  sourcemap: true,
  clean: true,
  minify: false,
  external: ['@aylith/inspekt-core', '@aylith/inspekt-vite', '@aylith/inspekt-bundlers'],
});
