// Service Worker for Small Business OS Offline PWA
const CACHE_NAME = 'sbos-v2-production';
const ASSETS_TO_CACHE = [
  '/',
  '/manifest.json',
  '/icon.svg',
  '/logo.jpg'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Purge all old caches (including legacy sbos-v1-static)
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  
  const url = new URL(event.request.url);

  // NEVER cache dev server modules, Vite HMR, API routes, or dynamic dependencies
  if (
    url.pathname.startsWith('/@') ||
    url.pathname.startsWith('/src/') ||
    url.pathname.startsWith('/node_modules/') ||
    url.pathname.startsWith('/api/') ||
    url.search.includes('?v=') ||
    url.search.includes('&v=') ||
    url.search.includes('?t=') ||
    url.search.includes('&t=')
  ) {
    return; // Let browser fetch directly with standard network
  }

  // Only handle same-origin static assets in production
  if (url.origin !== self.location.origin) return;

  // Network-first strategy for index.html / navigation to always get latest code
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match('/index.html') || caches.match('/');
      })
    );
    return;
  }
});
