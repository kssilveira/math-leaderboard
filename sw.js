const CACHE_NAME = 'math-leaderboard-v80';
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
  './js/quiz-engine.js',
  './js/audio-speech.js',
  './js/storage.js',
  './js/leaderboard.js',
  './js/firebase.js',
  './js/review.js',
  './js/overview.js',
  './js/replay.js',
  './js/game.js',
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

// Stale-while-revalidate for same-origin app assets so cached shell, datasets, and
// icons load immediately while refreshing in the background. Lazy Study packs live
// in STUDY_DATA_CACHE so APP_SHELL version bumps preserve offline courses.
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  const isNavigate = request.mode === 'navigate';
  const targetCache = isStudyDataRequest(url) ? STUDY_DATA_CACHE : CACHE_NAME;
  const cacheKey = isNavigate
    ? (url.pathname.endsWith('/') ? './index.html' : `${url.origin}${url.pathname}`)
    : request;

  event.respondWith(
    caches.open(targetCache).then(async (cache) => {
      const cached = await cache.match(cacheKey, { ignoreSearch: true });
      const networkPromise = fetch(request)
        .then((response) => {
          if (response && response.status === 200 && response.type === 'basic') {
            cache.put(cacheKey, response.clone()).catch(() => {});
          }
          return response;
        })
        .catch(() => null);

      if (cached) {
        event.waitUntil(networkPromise);
        return cached;
      }

      const networkResponse = await networkPromise;
      if (networkResponse) return networkResponse;

      if (isNavigate) {
        const fallback = await caches.match('./index.html');
        if (fallback) return fallback;
      }
      return Response.error();
    })
  );
});
