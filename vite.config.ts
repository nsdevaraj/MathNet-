import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(({mode}) => {
  return {
    plugins: [react(), tailwindcss()],
    publicDir: mode === 'development' ? 'public' : false,
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        'canvg': path.resolve(__dirname, 'src/shims/canvg.ts'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
