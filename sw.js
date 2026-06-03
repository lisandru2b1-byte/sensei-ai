const CACHE_NAME = 'sensei-ai-v1';
const OFFLINE_COURSES_KEY = 'sensei-offline-courses';

// Core app assets to cache on install
const CORE_ASSETS = [
  './',
  './index.html',
  './sw.js',
  'https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,300;0,400;0,500;0,700;1,400&family=Noto+Sans+JP:wght@300;400;700&family=DM+Mono:wght@400;500&display=swap'
];

// Install: cache core assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: cache-first for fonts/static, network-first for API
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Always go to network for Anthropic API
  if (url.hostname === 'api.anthropic.com') return;

  // Cache-first for Google Fonts
  if (url.hostname.includes('fonts.g')) {
    event.respondWith(
      caches.match(event.request).then(r => r || fetch(event.request).then(res => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
        return res;
      }))
    );
    return;
  }

  // Network-first for main app, fallback to cache
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});

// Handle messages from main thread (course downloads)
self.addEventListener('message', event => {
  if (event.data.type === 'CACHE_COURSE') {
    const { courseId, content } = event.data;
    // Store course in cache with special key
    caches.open(CACHE_NAME).then(cache => {
      const response = new Response(JSON.stringify(content), {
        headers: { 'Content-Type': 'application/json' }
      });
      cache.put(`/courses/${courseId}`, response);
    });
  }
});
