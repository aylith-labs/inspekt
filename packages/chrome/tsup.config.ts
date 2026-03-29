import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: {
      background: 'src/background.ts',
      content: 'src/content.ts',
      'popup/popup': 'src/popup/popup.ts',
      'options/options': 'src/options/options.ts',
    },
    format: ['esm'],
    sourcemap: true,
    clean: true,
    noExternal: ['@devlens/core'],
    splitting: false,
  },
]);
