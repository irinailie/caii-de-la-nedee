// Crește versiunea la fiecare schimbare, ca telefoanele să ia datele noi.
const VERSIUNE = 'caii-nedee-v4';

const CAI = ['bobi', 'breazu', 'bruno', 'cezar', 'ciucurica', 'dochia', 'fulger', 'ghiuri', 'han', 'heidi', 'jar', 'lina', 'misu',
  'murgu', 'paco', 'piciu', 'praslea', 'sasa', 'saturn', 'sumi', 'suru', 'vizir', 'zorba'];

const FISIERE = [
  './', 'index.html', 'style.css', 'app.js', 'data/cai.json', 'manifest.webmanifest',
  'img/coperta.jpg', 'img/icon-192.png', 'img/icon-512.png', 'img/apple-touch-icon.png',
  ...CAI.flatMap((c) => [`img/${c}.jpg`, `img/${c}-mic.jpg`])
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSIUNE).then((c) => c.addAll(FISIERE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((chei) => Promise.all(chei.filter((k) => k !== VERSIUNE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Răspunde din cache imediat (merge fără semnal), iar în fundal ia varianta nouă când e semnal.
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const font = /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if (url.origin !== location.origin && !font) return;

  e.respondWith((async () => {
    const cache = await caches.open(VERSIUNE);
    const dinCache = (await cache.match(req, { ignoreSearch: true }))
      || (req.mode === 'navigate' ? await cache.match('index.html') : undefined);
    const dinRetea = fetch(req)
      .then((r) => { if (r.ok || r.type === 'opaque') cache.put(req, r.clone()); return r; })
      .catch(() => dinCache || Response.error());
    if (dinCache) { e.waitUntil(dinRetea.catch(() => {})); return dinCache; }
    return dinRetea;
  })());
});
