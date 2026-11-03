// Cache only this app's page; keep other apps on the same origin untouched.
const PAGE = new URL('index.html', self.registration.scope).href;
const ROOT = self.registration.scope;
const PREFIX = 'larry-' + new URL(ROOT).pathname + '-';
const CACHE = PREFIX + 'v3';
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll([ROOT, PAGE])).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(names => Promise.all(
    names.filter(name => name.startsWith(PREFIX) && name !== CACHE).map(name => caches.delete(name))
  )).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || event.request.mode !== 'navigate') return;
  const url = new URL(event.request.url);
  url.search = '';
  if (url.href !== ROOT && url.href !== PAGE) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const response = await fetch(event.request);
      if (response.ok && response.type === 'basic' && !response.redirected) {
        await Promise.all([cache.put(ROOT, response.clone()), cache.put(PAGE, response.clone())]);
        return response;
      }
      return (await cache.match(PAGE)) || response;
    } catch (error) {
      const cached = await cache.match(PAGE);
      if (cached) return cached;
      throw error;
    }
  })());
});
