// service worker ของแอปเช็คสต๊อก — เก็บ shell ของแอปไว้ให้เปิดซ้ำได้แม้ไม่มีเน็ต
// ไม่แตะ WebSocket ของ MQTT เลย (fetch event ไม่เกี่ยวกับ WebSocket อยู่แล้ว)
//
// สำคัญ: ต้องขึ้นเลขเวอร์ชัน CACHE_NAME ทุกครั้งที่แก้ stock_mobile.html แล้ว deploy
// ไม่งั้นเครื่องที่ติดตั้งแอปไว้แล้วจะยังเห็นโค้ดเก่าค้างอยู่ (เช่นบั๊กที่เคยเจอ:
// มือถือไม่เห็นชื่อบริษัทที่คอมส่งมา เพราะแอปที่ติดตั้งไว้ยังรันโค้ดเวอร์ชันเก่าอยู่)
const CACHE_NAME = 'sc-mobile-shell-v2';
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

// network-first สำหรับหน้าแอปเอง (HTML/manifest) — ต้องได้โค้ดล่าสุดทันทีที่มีเน็ต
// ใช้ cache เป็น fallback ตอนไม่มีเน็ตเท่านั้น กันปัญหาแอปที่ติดตั้งไว้ค้างโค้ดเก่า
// ไอคอนไม่ค่อยเปลี่ยนก็ยังใช้ cache-first ได้ตามเดิมเพื่อความไว
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const isShellDoc = e.request.mode === 'navigate' || e.request.url.includes('stock_mobile.html') || e.request.url.includes('manifest.json');

  if (isShellDoc) {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          if (res.ok) caches.open(CACHE_NAME).then((c) => c.put(e.request, res.clone()));
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

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
