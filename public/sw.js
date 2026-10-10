const CACHE = 'wisquiz-shell-v2';
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    for (const path of ['/', '/game/solo?offline=1']) {
      const response = await fetch(path);
      if (!response.ok) throw new Error('App shell unavailable');
      const html = await response.clone().text();
      await cache.put(path === '/' ? '/' : '/game/solo', response);
      const assets = [...html.matchAll(/(?:src|href)="([^"<>]+)"/g)].map(match => new URL(match[1].replace(/&amp;/g, '&'), self.location.origin)).filter(url => url.origin === self.location.origin && url.pathname.startsWith('/_next/static/')).map(url => url.href);
      await cache.addAll([...new Set(assets)]);
    }
    await cache.addAll(['/icon.svg', '/manifest.webmanifest']);
  })());
});
self.addEventListener('activate', event => { event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('wisquiz-shell-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', event => {
  const request = event.request, url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/') || url.pathname.startsWith('/parties/') || request.headers.get('RSC') === '1') return;
  if (request.mode === 'navigate') {
    if (url.pathname !== '/' && url.pathname !== '/game/solo') return;
    event.respondWith(fetch(request).then(response => {
      if (response.ok) { const copy = response.clone(); event.waitUntil(caches.open(CACHE).then(cache => cache.put(url.pathname, copy))); }
      return response;
    }).catch(async () => (await caches.match(url.pathname)) || (await caches.match('/game/solo?offline=1'))));
  } else if (url.pathname.startsWith('/_next/static/') || ['/icon.svg', '/manifest.webmanifest'].includes(url.pathname)) {
    event.respondWith(caches.match(request).then(cached => cached || fetch(request).then(response => {
      if (response.ok) { const copy = response.clone(); event.waitUntil(caches.open(CACHE).then(cache => cache.put(request, copy))); }
      return response;
    })));
  }
});
