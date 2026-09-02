// Single service worker for the whole app.
// Pages and scripts: network first (so updates show up immediately), cache as offline fallback.
// Images / sounds: cache first. quran.json and Firebase are never touched (IndexedDB + realtime).
const CACHE_NAME = 'quran-quiz-v9';
const PRECACHE = [
  './index.html',
  './quiz.html',
  './finish.html',
  './lobby.html',
  './style.css',
  './mobile.css',
  './kids-theme.css',
  './kids-theme.js',
  './wake-lock.js',
  './progress.js',
  './profile.html',
  './sync-mode.js',
  './finish-online.js',
  './mp-common.js',
  './script.js',
  './manifest.json',
  './assets/icon-192.png',
  './assets/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => Promise.allSettled(PRECACHE.map(url => cache.add(url))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(names => Promise.all(names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const url = event.request.url;
  if (event.request.method !== 'GET') return;
  if (url.includes('quran.json') || url.includes('quran.zip') || url.includes('/data/') || url.includes('firebase') || url.includes('gstatic') || url.includes('googleapis')) return;

  const isAsset = /\.(png|jpe?g|gif|svg|mp3|woff2?)$/i.test(url.split('?')[0]);
  if (isAsset) {
    event.respondWith(
      caches.match(event.request).then(cached => cached || fetch(event.request).then(resp => {
        if (resp.ok) caches.open(CACHE_NAME).then(c => c.put(event.request, resp.clone()));
        return resp;
      }))
    );
    return;
  }

  event.respondWith(
    fetch(event.request).then(resp => {
      if (resp.ok && new URL(url).origin === self.location.origin) {
        const copy = resp.clone();
        caches.open(CACHE_NAME).then(c => c.put(event.request, copy));
      }
      return resp;
    }).catch(() => caches.match(event.request).then(cached => cached || caches.match('./index.html')))
  );
});
