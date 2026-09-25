import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // 푸시 수신을 직접 다뤄야 해서 생성된 SW 대신 src/sw.ts 를 쓴다.
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      injectManifest: { globPatterns: ['**/*.{js,css,html,svg,png}'] },
      manifest: {
        name: 'Miri',
        short_name: 'Miri',
        description: '미리 물어봐주는 기록',
        lang: 'ko',
        start_url: '/',
        display: 'standalone',
        background_color: '#06080d',
        theme_color: '#06080d',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      devOptions: { enabled: true, type: 'module' },
    }),
  ],
  server: {
    // Worker 가 API 를 들고 있으므로 개발 중에는 wrangler dev 로 프록시한다.
    proxy: { '/api': 'http://localhost:4007' },
  },
})
