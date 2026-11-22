import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Fitness – treino e dieta',
        short_name: 'Fitness',
        description: 'Registro pessoal de treinos, dieta, peso e metas.',
        lang: 'pt-BR',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#f7f7f2',
        theme_color: '#3fcf6e',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // Desenhos dos exercícios: baixados quando aparecem e guardados para funcionar offline.
        globIgnores: ['exercises/**'],
        runtimeCaching: [
          {
            urlPattern: /\/exercises\/.*\.svg$/,
            handler: 'CacheFirst',
            options: { cacheName: 'exercicios', expiration: { maxEntries: 400 } },
          },
        ],
      },
    }),
  ],
})
