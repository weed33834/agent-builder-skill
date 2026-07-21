// 心镜 MindMirror —— Service Worker (App Shell 缓存)
// 策略:
//   - 静态资源(stale-while-revalidate):CSS/JS/字体/SVG
//   - HTML 导航请求(network-first,失败回退缓存)
//   - API 请求(不缓存,直接走网络)
const CACHE_VERSION = 'mm-v1';
const APP_SHELL = [
  '/',
  '/index.html',
  '/about.html',
  '/history.html',
  '/take.html',
  '/report.html',
  '/bootcamp.html',
  '/compare.html',
  '/login.html',
  '/styles.css',
  '/app.js',
  '/i18n.js',
  '/take.js',
  '/report.js',
  '/bootcamp.js',
  '/compare.js',
  '/favicon.svg',
  '/manifest.webmanifest',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_VERSION).then((c) => c.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  // API 请求与跨源请求(字体 CDN)不走缓存
  if (url.pathname.startsWith('/api/') || url.origin !== self.location.origin) {
    return;
  }
  // HTML 导航请求:network-first
  if (req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html')) {
    e.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE_VERSION).then((c) => c.put(req, copy)).catch(() => {});
        return res;
      }).catch(() => caches.match(req).then((r) => r || caches.match('/index.html')))
    );
    return;
  }
  // 静态资源:stale-while-revalidate
  e.respondWith(
    caches.match(req).then((cached) => {
      const fetchPromise = fetch(req).then((res) => {
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      }).catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
