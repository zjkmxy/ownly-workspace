import { fileURLToPath, URL } from 'node:url';

import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { VitePWA } from 'vite-plugin-pwa';

import defines from './defines';

// https://vite.dev/config/
export default defineConfig({
  build: {
    target: ['es2022', 'chrome111', 'edge111', 'firefox111', 'safari16'],
    chunkSizeWarningLimit: 10240,
  },
  plugins: [vue(), pwa()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  define: defines,
});

/** Configuration for PWA service worker */
function pwa() {
  return VitePWA({
    strategies: 'injectManifest',
    srcDir: 'src/services/service-worker',
    filename: 'sw.ts',
    registerType: 'autoUpdate',
    injectRegister: 'auto',
    devOptions: {
      enabled: true,
      // The following seems necessary to use `npm run dev` on Chrome
      // But Firefox/Safari does not support module webworker.
      type: 'module',
    },
    includeAssets: ['*.wasm', '*.js', '*.png'],
    workbox: {
      maximumFileSizeToCacheInBytes: 10485760, // increasing the file size to cached 10mb
      globPatterns: ['**/*.{svg,png,css,html}', 'assets/index*.js', '*.js', '*.wasm'],
    },

    // Assets and manifest options generated using
    // https://favicon.inbrowser.app/tools/favicon-generator
    manifest: {
      name: 'Ownly Workspace',
      short_name: 'Ownly',
      icons: [
        {
          src: '/icons/pwa-192x192.png',
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any',
        },
        {
          src: '/icons/pwa-512x512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any',
        },
        {
          src: '/icons/pwa-maskable-192x192.png',
          sizes: '192x192',
          type: 'image/png',
          purpose: 'maskable',
        },
        {
          src: '/icons/pwa-maskable-512x512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable',
        },
      ],
      start_url: '/',
      display: 'standalone',
      orientation: 'portrait',
      background_color: '#673ab7',
      theme_color: '#673ab7',
      description: 'A workspace you own',
    },
    injectManifest: {
      maximumFileSizeToCacheInBytes: 10485760, // increasing the file size to cached 10mb
    },
  });
}
