const CACHE_NAME='nuellie-money-diary-critical-wallet-budget-v3';
const APP_SHELL=['./','./index.html','./manifest.webmanifest','./favicon.png','./icon-192.png','./icon-512.png'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(APP_SHELL)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const req=event.request,url=new URL(req.url);
  if(req.mode==='navigate'||url.pathname.endsWith('/index.html')){
    event.respondWith(fetch(req,{cache:'no-store'}).then(res=>{if(res&&res.ok)caches.open(CACHE_NAME).then(c=>c.put('./index.html',res.clone()));return res;}).catch(()=>caches.match('./index.html').then(r=>r||caches.match('./'))));return;
  }
  event.respondWith(caches.match(req).then(cached=>cached||fetch(req).then(res=>{if(res&&res.ok)caches.open(CACHE_NAME).then(c=>c.put(req,res.clone()));return res;})));
});
self.addEventListener('message',event=>{if(event.data&&event.data.type==='SKIP_WAITING')self.skipWaiting();});
