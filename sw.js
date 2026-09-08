/* Longcours PWA service worker — cache shell uniquement, données/API réseau. */
const CACHE = 'longcours-shell-v11';
const SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
  '/favicon-32.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Navigation : réseau d'abord pour obtenir les nouvelles versions,
  // cache de l'index en secours si la connexion est indisponible.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req, {cache: 'no-store'})
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE).then(c => c.put('/index.html', copy));
          return response;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Assets locaux : cache rapide + mise à jour en arrière-plan.
  event.respondWith(
    caches.match(req).then(cached => {
      const network = fetch(req).then(response => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
        }
        return response;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
