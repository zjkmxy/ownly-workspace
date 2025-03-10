import { fileURLToPath, URL } from 'node:url';

import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      strategies: 'generateSW',
      registerType: 'autoUpdate',
      includeAssets: ['*.wasm', '*.js', '*.png'],
      workbox: {
        maximumFileSizeToCacheInBytes: 10485760, // increasing the file size to cached 10mb
        globPatterns: ['**/*.{js,css,html,scss,svg,png,wasm}'],
      },
      manifest: {
        name: 'Ownly: a workspace you Own Only you',
        short_name: 'Ownly',
        // TODO: add icons 192, 384, 512
        icons: [
          {
            src: '/icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: '/icons/icon-384x384.png',
            sizes: '384x384',
            type: 'image/png',
          },
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
        theme_color: '#673ab6',
        background_color: '#f3f4f6',
        start_url: '/',
        display: 'standalone',
        orientation: 'portrait',
      },
    })
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
