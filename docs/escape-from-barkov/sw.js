// Escape from Barkov offline helper: keeps the game files on the device. Multiplayer stays online-only.
const CACHE = 'barkov-v1.0.0';
const CORE = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png',
  './js/data.js', './js/core.js', './js/audio.js', './js/ui.js', './js/world.js', './js/actors.js', './js/raid.js', './js/net.js', './js/prep.js',
  'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => Promise.all(CORE.map(u => c.add(new Request(u, { mode: u.startsWith('http') ? 'no-cors' : 'same-origin' })).catch(() => { })))).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return; const url = new URL(req.url);
  if (url.hostname.endsWith('peerjs.com') || url.protocol.startsWith('ws')) return;
  if (url.origin === location.origin) { // newest files first, cached copy when offline
    e.respondWith(fetch(req).then(r => { const cp = r.clone(); caches.open(CACHE).then(c => c.put(req, cp)); return r; }).catch(() => caches.match(req).then(r => r || caches.match('./index.html'))));
    return;
  }
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => { if (r && (r.ok || r.type === 'opaque')) { const cp = r.clone(); caches.open(CACHE).then(c => c.put(req, cp)); } return r; })));
});
