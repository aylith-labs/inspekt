import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { devlens } from '@devlens/vite';

export default defineConfig({
  plugins: [
    react(),
    devlens({
      framework: 'react',
      editor: 'cursor',
    }),
  ],
});
