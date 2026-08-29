const CACHE_NAME = 'quran-quiz-cache-v1';
const urlsToCache = [
  '/',                  // الصفحة الرئيسية
  '/index.html',
  '/quiz.html',
  '/login.html',
  '/downloaddata.html',
  '/style.css',
  '/script.js',
  '/finish.html',
  '/favicon.ico',
  '/manifest.json',
  '/assets/win.mp3',
  '/assets/lose.mp3',
  '/quran.json'
];

// تثبيت الكاش عند أول تحميل
self.addEventListener('install', event => {
  console.log('[Service Worker] التثبيت...');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[Service Worker] تخزين الملفات في الكاش...');
      return cache.addAll(urlsToCache);
    })
  );
});

// تفعيل Service Worker وحذف الكاشات القديمة
self.addEventListener('activate', event => {
  console.log('[Service Worker] التفعيل...');
  event.waitUntil(
    caches.keys().then(cacheNames =>
      Promise.all(
        cacheNames.filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      )
    )
  );
  return self.clients.claim();
});

// التعامل مع الطلبات
self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // إذا نجح الاتصال، رجّع الملف من الإنترنت
        return response;
      })
      .catch(() => {
        // إذا فشل الاتصال، استخدم الكاش
        return caches.match(event.request)
          .then(cachedResponse => {
            return cachedResponse || caches.match('/index.html');
          });
      })
  );
});
