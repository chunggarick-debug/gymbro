// GymBro.AI Service Worker — 網路優先、離線回退（確保更新即時）
const CACHE = 'gymbro-v2';
const ASSETS = [
  './',
  './index.html',
  './css/styles.css',
  './manifest.json',
  './js/data.js',
  './js/store.js',
  './js/engine.js',
  './js/charts.js',
  './js/voice.js',
  './js/photo.js',
  './js/app.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return; // 外部請求（API）不介入

  e.respondWith(
    fetch(e.request)
      .then((resp) => {
        const copy = resp.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
        return resp;
      })
      .catch(() => {
        return caches.match(e.request).then((cached) => cached || caches.match('./index.html'));
      })
  );
});
