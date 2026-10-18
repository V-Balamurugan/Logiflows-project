/**
 * LogiFlows Intelligent Logistics Platform - Service Worker
 * Ensures zero data loss for couriers delivering in subterranean garages,
 * freight elevators, and remote areas with poor or intermittent cellular coverage.
 */

const CACHE_NAME = 'logiflows-v1-offline-cache';
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg',
  'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
];

// Install: Cache critical static shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Use catch so missing optional assets don't fail installation
      return Promise.allSettled(
        PRECACHE_ASSETS.map((url) =>
          cache.add(url).catch((err) => {
            console.warn('[ServiceWorker] Could not precache:', url, err);
          })
        )
      );
    }).then(() => self.skipWaiting())
  );
});

// Activate: Clean up older cache namespaces and claim clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Network-First with Cache Fallback for documents; Stale-While-Revalidate for assets
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignore chrome-extension or non-http requests
  if (!url.protocol.startsWith('http')) return;

  // Handle navigation / HTML requests
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => {
        const cached = await caches.match('/index.html') || await caches.match('/');
        if (cached) return cached;
        return new Response(
          '<!DOCTYPE html><html><head><title>LogiFlows Offline</title></head><body style="background:#020617;color:#f8fafc;font-family:sans-serif;padding:2rem;text-align:center;"><h2>LogiFlows Offline Mode Active</h2><p>You are currently operating in offline mode. Stored courier routes and queued deliveries remain active.</p></body></html>',
          { headers: { 'Content-Type': 'text/html' } }
        );
      })
    );
    return;
  }

  // Handle static assets & scripts with Stale-While-Revalidate
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});

// Background Sync Event (Standard Service Worker SyncManager)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-courier-outbox') {
    event.waitUntil(
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: 'SERVICE_WORKER_SYNC_TRIGGER',
            timestamp: Date.now()
          });
        });
      })
    );
  }
});

// Client Message Listener
self.addEventListener('message', (event) => {
  if (!event.data) return;

  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  } else if (event.data.type === 'PING') {
    event.ports && event.ports[0] && event.ports[0].postMessage({ type: 'PONG', status: 'ONLINE', timestamp: Date.now() });
  }
});
