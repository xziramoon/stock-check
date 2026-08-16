// service worker ของแอปเช็คสต๊อก — เก็บ shell ของแอปไว้ให้เปิดซ้ำได้แม้ไม่มีเน็ต
// ไม่แตะ WebSocket ของ MQTT เลย (fetch event ไม่เกี่ยวกับ WebSocket อยู่แล้ว)
const CACHE_NAME = 'sc-mobile-shell-v1';
const SHELL_FILES = [
  './stock_mobile.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then((c) => c.addAll(SHELL_FILES)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

// stale-while-revalidate: ตอบจาก cache ก่อนถ้ามี แล้วอัปเดต cache จากเน็ตเบื้องหลัง
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then((cached) => {
      const network = fetch(e.request)
        .then((res) => {
          if (res.ok && e.request.url.startsWith(self.location.origin)) {
            caches.open(CACHE_NAME).then((c) => c.put(e.request, res.clone()));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
