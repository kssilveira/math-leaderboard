const CACHE_NAME = 'math-leaderboard-v77';
const STUDY_DATA_CACHE = 'math-leaderboard-study-data-v1';
const APP_SHELL = [
  './',
  './index.html',
  './privacy.html',
  './style.css',
  './data/geo-map-data.js',
  './data/quiz-datasets.js',
  './lib/study-meta.js',
  './js/study-meta-bridge.js',
  './js/geo-maps.js',
  './js/quiz-data.js',
  './js/app.js',
  './manifest.json',
  './assets/icons/favicon.svg',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

function isStudyDataRequest(url) {
  return url.pathname.includes('/data/study-') && url.pathname.endsWith('.js');
}

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME && key !== STUDY_DATA_CACHE) {
            return caches.delete(key);
          }
          return null;
        })
      )
    )
  );
  self.clients.claim();
});

// Network-first for same-origin app assets so updates deploy immediately when online,
// with cache fallback for offline play. Lazy Study packs live in STUDY_DATA_CACHE so
// APP_SHELL version bumps do not wipe already-downloaded offline courses.
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  const targetCache = isStudyDataRequest(url) ? STUDY_DATA_CACHE : CACHE_NAME;

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response && response.status === 200) {
          const copy = response.clone();
          caches.open(targetCache).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request, { ignoreSearch: true });
        if (cached) return cached;
        if (request.mode === 'navigate') {
          return caches.match('./index.html');
        }
        return Response.error();
      })
  );
});
