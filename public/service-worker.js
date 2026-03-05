const CACHE_NAME = 'spicespark-cache-v1';
const ASSETS = [
  '/',
  '/login.html',
  '/register.html',
  '/forgot-password.html',
  '/reset-password.html',
  '/user/index.html',
  '/user/style.css',
  '/public/user/style.css',
  '/manifest.json',
  '/favicon.ico'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    try {
      await cache.addAll(ASSETS);
    } catch (err) {
      // If some assets fail to cache (404/external), swallow the error so install doesn't fail.
      console.warn('Some assets failed to cache:', err);
    }
  })());
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    ))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(res => res || fetch(event.request))
  );
});
