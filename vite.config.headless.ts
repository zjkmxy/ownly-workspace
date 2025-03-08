import { fileURLToPath, URL } from 'node:url';

import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    lib: {
      name: 'headless',
      entry: ['src/node/headless.ts'],
      formats: ['es'],
    },
    minify: false,
    rollupOptions: {
      external: [
        './wasm_exec.js',
        /node:.*/,
        'fs',
        'fs/promises',
        'worker_threads',
        'buffer',
        'util',
        'crypto',
        'path',
      ],
    },
  },
});
