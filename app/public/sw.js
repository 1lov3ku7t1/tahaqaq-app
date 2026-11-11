// Offline cache: every file the app loads is saved on first visit, then served from the cache first.
// Bump VERSION to drop old files after a new build.
const VERSION = "tahaqaq-v1";
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin) return;   // never touch other hosts
  e.respondWith(caches.open(VERSION).then(async c => {
    const hit = await c.match(e.request);
    const net = fetch(e.request).then(r => { if (r.ok) c.put(e.request, r.clone()); return r; }).catch(() => hit);
    return hit || net;                                                       // cache first, refresh in background
  }));
});
