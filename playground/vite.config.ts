import { inspekt } from '@aylith/inspekt-vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    react(),
    inspekt({
      framework: 'react',
      editor: 'cursor',
    }),
  ],
});
