import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: {
      background: 'src/background.ts',
      content: 'src/content.ts',
      'popup/popup': 'src/popup/popup.ts',
      'options/options': 'src/options/options.ts',
      'welcome/welcome': 'src/welcome/welcome.ts',
    },
    outDir: '../../dist',
    format: ['esm'],
    sourcemap: true,
    clean: true,
    noExternal: ['@inspekt/core'],
    splitting: false,
  },
]);
