const CACHE_NAME='money-diary-merge-stats-quickdate-v1';
const APP_SHELL = ['./manifest.webmanifest','./favicon.png','./icon-120.png','./icon-152.png','./icon-167.png','./icon-180.png','./icon-192.png','./icon-384.png','./icon-512.png','./icon-1024.png','./app-logo-master.png'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL.map(u => new Request(u,{cache:'reload'})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (event.request.mode === 'navigate' || url.pathname.endsWith('/index.html')) {
    event.respondWith(fetch(event.request, {cache:'reload'}).catch(() => caches.match('./index.html')));
    return;
  }
  event.respondWith(fetch(event.request, {cache:'reload'}).then(response => {
    if (response && response.ok) caches.open(CACHE_NAME).then(cache => cache.put(event.request, response.clone()));
    return response;
  }).catch(() => caches.match(event.request)));
});
self.addEventListener('message', event => { if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting(); });
