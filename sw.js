const CACHE_NAME = 'Virasty-P-V1';

// لیست فایل‌هایی که باید برای اجرای آفلاین کش بشن
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.json',
  './Logo.png',
  './blue-tick.png',
  './Font.ttf' // فونت اختصاصی به لیست کش اضافه شد
];

// مرحله نصب: کش کردن فایل‌ها
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('در حال کش کردن فایل‌ها...');
        return cache.addAll(ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// مرحله فعال‌سازی: پاک کردن کش‌های قدیمی
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => 
      Promise.all(
        keys.filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// مرحله دریافت (Fetch): اگر آفلاین بودی از کش بخون
self.addEventListener('fetch', e => {
  // فقط درخواست‌های GET رو مدیریت کن
  if (e.request.method !== 'GET') return;
  
  e.respondWith(
    caches.match(e.request).then(cachedResponse => {
      // اگر توی کش بود، همون رو برگردون
      if (cachedResponse) return cachedResponse;
      
      // اگر نبود، از اینترنت بگیر
      return fetch(e.request).then(networkResponse => {
        // اگر جواب درست بود، یه کپی ازش توی کش ذخیره کن
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(e.request, responseToCache);
        });
        return networkResponse;
      }).catch(() => {
        // اگر هم آفلاین بودی و هم توی کش نبود، صفحه اصلی رو نشون بده
        return caches.match('./index.html');
      });
    })
  );
});
