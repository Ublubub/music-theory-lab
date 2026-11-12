// Service worker: lets the app work offline once it has been opened online.
// Strategy: network first (so you always get the latest version when online), cache as fallback.
const CACHE = 'mtl-v2';
const SHELL = [
  './', 'index.html', 'css/styles.css', 'manifest.webmanifest', 'icons/icon.svg', 'icons/icon-192.png',
  'js/theory.js', 'js/guitar.js', 'js/audio.js', 'js/fretboard.js', 'js/piano.js', 'js/mic.js', 'js/app.js',
  'js/tabs/progressions.js', 'js/tabs/advanced.js', 'js/tabs/ear.js', 'js/tabs/find.js', 'js/main.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    fetch(e.request)
      .then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); return res; })
      .catch(() => caches.match(e.request, { ignoreSearch: true }).then((r) => r || caches.match('index.html'))),
  );
});
