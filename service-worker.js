const SHELL_CACHE = 'shell-v10';
const RUNTIME_WX = 'runtime-wx-v1';
const SHELL_ASSETS = [
  'index.html','app.js','manifest.json',
  'assets/hero-1280x720.jpg',
  'icons/icon-192.png','icons/icon-512.png'
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(SHELL_CACHE).then(c => c.addAll(SHELL_ASSETS)));
});
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    if (self.registration.navigationPreload) await self.registration.navigationPreload.enable();
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => ![SHELL_CACHE, RUNTIME_WX].includes(k)).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (url.origin === location.origin) {
    e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
    return;
  }
  if (url.hostname === 'api.openweathermap.org') {
    e.respondWith((async () => {
      try {
        const res = await fetch(e.request);
        const cache = await caches.open(RUNTIME_WX);
        cache.put(e.request, res.clone());
        return res;
      } catch (err) {
        const cached = await caches.match(e.request);
        if (cached) return cached;
        throw err;
      }
    })());
  }
});