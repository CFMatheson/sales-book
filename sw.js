// Keeps the app working without signal. Bump VERSION when the app changes.
const VERSION = 'salesbook-4';
const INBOX = 'salesbook-inbox';
const FILES = ['./', 'index.html', 'manifest.json', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== VERSION && k !== INBOX).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
// A file shared to the app (e.g. WhatsApp > Share > Sales Book): keep it
// for the page, then open the app, which picks it up.
async function receiveShare(request) {
  try {
    const form = await request.formData();
    const file = form.get('file');
    if (file && typeof file !== 'string') {
      const cache = await caches.open(INBOX);
      await cache.put('shared-file', new Response(file, {
        headers: { 'X-File-Name': encodeURIComponent(file.name || 'file') } }));
    }
  } catch (err) { /* open the app anyway */ }
  return Response.redirect('./?shared=1', 303);
}

// Network first (so updates arrive), the saved copy when offline.
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method === 'POST' && url.pathname.endsWith('/share-target')) {
    e.respondWith(receiveShare(e.request));
    return;
  }
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request).then(r => {
      const copy = r.clone();
      caches.open(VERSION).then(c => c.put(e.request, copy));
      return r;
    }).catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});
