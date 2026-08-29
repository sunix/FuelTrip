import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // GitHub Pages serves this project from https://sunix.github.io/FuelTrip/,
  // not from the domain root, so every built asset must be prefixed with
  // this base path (Vite rewrites index.html asset URLs accordingly, and
  // vite-plugin-pwa derives the manifest's start_url/scope from it).
  base: '/FuelTrip/',
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'FuelTrip',
        short_name: 'FuelTrip',
        description: 'Fuel stop optimizer for road trips',
        theme_color: '#0ea5e9',
        background_color: '#f8fafc',
        display: 'standalone',
        icons: [
          {
            // Relative to the manifest file's own URL, not the page's URL,
            // so it resolves correctly under the /FuelTrip/ base path.
            src: 'favicon.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
          },
          {
            src: 'favicon.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
        runtimeCaching: [],
      },
    }),
  ],
  test: {
    environment: 'node',
    include: ['src/tests/**/*.test.ts'],
  },
});
