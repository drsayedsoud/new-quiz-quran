// Offline-first service worker.
// Navigations: cache-first (instant start, even with no connection), refreshed in the background.
// Same-origin assets/scripts: cache-first with background refresh.
// Cross-origin (fonts, CDN libraries): cached opaquely on first success so they work offline too.
// Firebase and the question files are never intercepted (realtime + IndexedDB handle them).
const CACHE_NAME = 'quran-quiz-v13';

const PRECACHE = [
  './',
  './index.html',
  './quiz.html',
  './finish.html',
  './lobby.html',
  './profile.html',
  './results.html',
  './style.css',
  './mobile.css',
  './kids-theme.css',
  './kids-theme.js',
  './wake-lock.js',
  './net-status.js',
  './offline-prep.js',
  './progress.js',
  './script.js',
  './mp-common.js',
  './multiplayer.js',
  './multiplayer-quiz.js',
  './multiplayer-finish.js',
  './sync-mode.js',
  './finish-online.js',
  './firebase-init.js',
  './manifest.json',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/hulkman.png',
  './assets/superman.png',
  './assets/patman.png',
  './assets/mahmoud.png',
  './assets/child.jpeg',
  './assets/wow.mp3',
  './assets/win.mp3',
  './assets/lose.mp3'
];

// Third-party files the pages need; cached opaquely (no-cors) so they are available offline.
const EXTERNAL = [
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js',
  'https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;800;900&display=swap'
];

const skip = url =>
  url.includes('firebaseio.com') ||
  url.includes('firebasedatabase') ||
  url.includes('firebasejs') ||
  url.includes('api.github.com') ||
  url.includes('quran.json') ||
  url.includes('quran.zip') ||
  url.includes('/data/');

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await Promise.allSettled(PRECACHE.map(u => cache.add(u)));
    await Promise.allSettled(EXTERNAL.map(u => fetch(u, { mode: 'no-cors' }).then(r => cache.put(u, r)).catch(() => {})));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n)));
    await self.clients.claim();
  })());
});

async function refresh(request, cache) {
  try {
    const resp = await fetch(request);
    if (resp && (resp.ok || resp.type === 'opaque')) cache.put(request, resp.clone());
    return resp;
  } catch (e) {
    return null;
  }
}

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = request.url;
  if (request.method !== 'GET' || skip(url)) return;

  // Page loads: serve from cache immediately, refresh in the background, fall back to the home page.
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(request, { ignoreSearch: true });
      if (cached) { event.waitUntil(refresh(request, cache)); return cached; }
      const fresh = await refresh(request, cache);
      return fresh || (await cache.match('./index.html')) || new Response('<h1>غير متصل</h1>', { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    })());
    return;
  }

  // Everything else: cache-first, refresh in the background, never substitute a page for a script.
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request, { ignoreSearch: true });
    if (cached) { event.waitUntil(refresh(request, cache)); return cached; }
    const fresh = await refresh(request, cache);
    if (fresh) return fresh;
    try { return await fetch(request, { mode: 'no-cors' }); } catch (e) {}
    return new Response('', { status: 504, statusText: 'offline' });
  })());
});
