const CACHE_NAME = 'viraasti-v1.0.1'; 

const ASSETS = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.json',
  './Logo.png',
  './blue-tick.png',
  './Font.ttf'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('در حال کش کردن فایل‌های نسخه جدید...');
        return cache.addAll(ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => 
      Promise.all(
        keys.filter(key => key !== CACHE_NAME)
            .map(key => {
                console.log('پاک کردن کش قدیمی:', key);
                return caches.delete(key);
            })
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  
  // استراتژی شبکه اول (Network First) برای درخواست‌های HTML و ناوبری
  if (e.request.mode === 'navigate' || (e.request.headers.get('accept') && e.request.headers.get('accept').includes('text/html'))) {
    e.respondWith(
      fetch(e.request)
        .then(networkResponse => {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, responseToCache));
          return networkResponse;
        })
        .catch(() => {
          return caches.match(e.request).then(cachedResponse => {
            if (cachedResponse) return cachedResponse;
            return caches.match('./index.html');
          });
        })
    );
    return;
  }

  // استراتژی کش اول (Cache First) برای فایل‌های استاتیک مثل CSS، JS و عکس‌ها
  e.respondWith(
    caches.match(e.request).then(cachedResponse => {
      if (cachedResponse) return cachedResponse;
      
      return fetch(e.request).then(networkResponse => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(e.request, responseToCache);
        });
        return networkResponse;
      }).catch(() => {
        // در صورت قطعی اینترنت، اگر فایل کش شده نبود، به صفحه اصلی برگرد
        return caches.match('./index.html');
      });
    })
  );
});
