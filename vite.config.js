import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'icon.svg', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: 'לוח הכפל',
        short_name: 'לוח הכפל',
        description: 'תרגול לוח הכפל לילדים עם מעקב התקדמות אישי',
        lang: 'he',
        dir: 'rtl',
        theme_color: '#6c3beb',
        background_color: '#e8f4fd',
        display: 'standalone',
        scope: '/multiplication-table-practice/',
        start_url: '/multiplication-table-practice/',
        icons: [
          { src: 'pwa-64x64.png',            sizes: '64x64',   type: 'image/png' },
          { src: 'pwa-192x192.png',           sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png',           sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      devOptions: {
        enabled: true
      }
    })
  ],
  base: './'
})
