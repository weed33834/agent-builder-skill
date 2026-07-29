import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // PWA:Service Worker(Workbox)+ Web App Manifest,保留原项目「零后端、可离线」卖点。
    //   - 预缓存:仅 app shell(JS/CSS/HTML)+ 小尺寸品牌图标,避免预缓存上百张名人图导致体积爆炸
    //   - 运行时缓存:同源图片 cache-first、字体 CDN stale-while-revalidate
    //   - autoUpdate:新版 SW skipWaiting,下次进入即生效(对齐原 sw.js 行为)
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.svg', 'images/logo.svg', 'images/seal.svg'],
      manifest: {
        name: '心镜 MindMirror',
        short_name: '心镜',
        description: '通过名人镜、价值镜、意识镜三面镜子,以情境化答题与行为轨迹,看见真实的自己。',
        lang: 'zh-CN',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait-primary',
        background_color: '#f4efe3',
        theme_color: '#f4efe3',
        categories: ['lifestyle', 'education', 'health'],
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,woff2}'],
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/images\//],
        runtimeCaching: [
          {
            // 同源图片(名人照/意识形态图/方法图标):cache-first,按需缓存并设上限
            urlPattern: ({ url }) => url.pathname.startsWith('/images/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'mm-images',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // 字体 CDN(loli.net 镜像):stale-while-revalidate
            urlPattern: ({ url }) =>
              url.origin === 'https://fonts.loli.net' || url.origin === 'https://gstatic.loli.net',
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'mm-fonts',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // 纯前端静态产物:保留原项目"零后端、任意静态托管"卖点
  build: {
    outDir: 'dist',
    // 路由级 chunk 按需加载(题库/名人库等大 JSON 动态 import 时生效)
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (id.includes('echarts')) return 'echarts'
            if (id.includes('react-router')) return 'react-router'
            if (id.includes('react') || id.includes('scheduler')) return 'react-vendor'
          }
        },
      },
    },
  },
})
