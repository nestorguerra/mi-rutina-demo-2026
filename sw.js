/* Mi rutina · service worker: funciona sin conexión */
const CACHE_PREFIX = 'mi-rutina-demo-ncompany-';
const CACHE = CACHE_PREFIX + 'v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './apple-touch-icon.png'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith(CACHE_PREFIX) && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const timeout = (ms) => new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms));

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Páginas: red primero (para recibir mejoras) con respaldo en caché si no hay conexión.
  if (req.mode === 'navigate') {
    event.respondWith(
      Promise.race([fetch(req), timeout(3500)])
        .then(res => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then(c => c.put('./index.html', copy));
          }
          return res;
        })
        .catch(() => caches.open(CACHE).then(c => c.match('./index.html').then(r => r || c.match('./'))))
    );
    return;
  }

  // Recursos: caché primero, red como respaldo.
  event.respondWith(
    caches.open(CACHE).then(c => c.match(req, {ignoreSearch: true})).then(hit => hit || fetch(req).then(res => {
      if (res && res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
      }
      return res;
    }))
  );
});
