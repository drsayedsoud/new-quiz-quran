const CACHE_NAME = 'quran-quiz-v1';
const urlsToCache = [
  './index.html',
  './style.css',
  './script.js',
  './manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', event => {
  // We ignore caching quran.json because it's huge and managed by IndexedDB in script.js
  if (event.request.url.includes('quran.json') || event.request.url.includes('firebase')) {
      return; 
  }
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        return response || fetch(event.request);
      })
  );
});
