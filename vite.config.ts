import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { CONFIG } from './src/config'

// `base` is written in exactly one place: CONFIG.BASE.
export default defineConfig({
  base: CONFIG.BASE,
  plugins: [
    react(),
    tailwindcss(),
    // vite-plugin-pwa derives the manifest's scope and start_url, and the
    // service worker's registration path and scope, from `base`. That is the
    // whole reason for using it: a worker cannot control paths above its own
    // location, so a hand-written /sw.js would register successfully under
    // /beaches/ and then silently cache nothing.
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/apple-touch-icon.png', 'icons/favicon-32.png'],
      manifest: {
        name: 'Beaches Turks & Caicos — Dining',
        short_name: 'Beaches Dining',
        description: 'Where to eat at Beaches Turks & Caicos, offline.',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0b2b3c',
        theme_color: '#0b2b3c',
        icons: [
          // Relative, so they resolve against the manifest's own location
          // rather than the domain root.
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Everything, deliberately: the 26 heroes, 26 logos and 42 menu PDFs
        // are ~31MB, and "airplane mode after first load, all 42 menus open"
        // is an acceptance check. Runtime caching would only hold what had
        // already been opened, which is the wrong half.
        globPatterns: ['**/*.{js,css,html,woff2,png,jpg,svg,pdf,ico}'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        navigateFallback: `${CONFIG.BASE}index.html`,
      },
    }),
  ],
  test: {
    environment: 'node',
  },
})
