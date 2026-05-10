import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { inspekt } from '@inspekt/vite';

export default defineConfig({
  plugins: [
    react(),
    inspekt({
      framework: 'react',
      editor: 'cursor',
    }),
  ],
});
