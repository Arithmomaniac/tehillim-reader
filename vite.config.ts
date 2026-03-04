import { defineConfig } from 'vite';

export default defineConfig({
  base: '/tehillim-reader/',
  root: '.',
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  server: {
    open: true,
  },
});
