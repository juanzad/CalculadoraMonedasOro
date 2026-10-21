// Service worker: cache-first con relleno en tiempo de ejecución.
// Permite abrir la app sin conexión una vez cargada la primera vez.
// La cotización del oro se pide SIEMPRE en vivo (nunca desde cache).
const CACHE = 'monedas-oro-v3';
const CORE = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  // Precio del oro en vivo: directo a la red, sin cache.
  if (req.url.indexOf('gold-api.com') !== -1 || req.url.indexOf('goldprice.org') !== -1) {
    e.respondWith(fetch(req));
    return;
  }

  e.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req).then((res) => {
        if (res && res.status === 200 && (res.type === 'basic' || res.type === 'cors')) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
