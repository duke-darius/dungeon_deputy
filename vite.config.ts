import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

const rendererRoot = resolve('src/renderer');

export default defineConfig({
  plugins: [react()],
  root: 'src/renderer',
  publicDir: '../../assets',
  server: { host: '127.0.0.1', port: 5173, strictPort: true },
  build: { rollupOptions: { input: { index: resolve(rendererRoot, 'index.html'), public: resolve(rendererRoot, 'public.html') } } },
});
