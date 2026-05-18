const STATIC_CACHE = 'vision-static-v1';
const TILE_CACHE = 'vision-3d-tiles-v1';
const TILE_CACHE_MAX_ENTRIES = 6000;
const PRECACHE_URLS = ['/', '/index.html', '/favicon.svg', '/icons.svg'];
const TILE_HOSTS = new Set(['tile.googleapis.com', 'assets.cesium.com']);

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(STATIC_CACHE);
    await cache.addAll(PRECACHE_URLS);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((key) => key !== STATIC_CACHE && key !== TILE_CACHE)
        .map((key) => caches.delete(key)),
    );
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  const payload = event.data;
  if (!payload || payload.type !== 'vision:precache-3d-root' || typeof payload.url !== 'string') {
    return;
  }

  event.waitUntil((async () => {
    try {
      const request = new Request(payload.url, { mode: 'cors', credentials: 'omit', cache: 'force-cache' });
      const response = await fetch(request);
      if (!response) {
        return;
      }
      const cache = await caches.open(TILE_CACHE);
      await cache.put(request, response.clone());
      await trimCache(cache, TILE_CACHE_MAX_ENTRIES);
    } catch {
      // Best-effort warmup.
    }
  })());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);
  if (shouldHandleStatic(url)) {
    event.respondWith(staleWhileRevalidate(request, STATIC_CACHE));
    return;
  }

  if (shouldHandleTiles(url)) {
    event.respondWith(cacheFirstTiles(request));
  }
});

function shouldHandleStatic(url) {
  if (url.origin !== self.location.origin) {
    return false;
  }

  if (url.pathname.startsWith('/api/')) {
    return false;
  }

  return (
    url.pathname.endsWith('.js')
    || url.pathname.endsWith('.css')
    || url.pathname.endsWith('.html')
    || url.pathname.endsWith('.svg')
    || url.pathname.endsWith('.json')
    || url.pathname.endsWith('.wasm')
    || url.pathname.startsWith('/cesiumStatic/')
  );
}

function shouldHandleTiles(url) {
  if (!TILE_HOSTS.has(url.hostname)) {
    return false;
  }

  return url.pathname.includes('/3dtiles/');
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const networkPromise = fetch(request)
    .then(async (networkResponse) => {
      if (networkResponse && networkResponse.ok) {
        await cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    })
    .catch(() => undefined);

  if (cached) {
    networkPromise.catch(() => undefined);
    return cached;
  }

  const network = await networkPromise;
  if (network) {
    return network;
  }

  return new Response('Offline', { status: 503, statusText: 'Offline' });
}

async function cacheFirstTiles(request) {
  const cache = await caches.open(TILE_CACHE);
  const cached = await cache.match(request);
  if (cached) {
    return cached;
  }

  const response = await fetch(request);
  if (canPersistTileResponse(response)) {
    await cache.put(request, response.clone());
    await trimCache(cache, TILE_CACHE_MAX_ENTRIES);
  }
  return response;
}

function canPersistTileResponse(response) {
  if (!response) {
    return false;
  }

  if (response.type === 'opaque') {
    return true;
  }

  if (!response.ok) {
    return false;
  }

  const cacheControl = response.headers.get('Cache-Control') ?? '';
  const normalized = cacheControl.toLowerCase();
  if (normalized.includes('no-store') || normalized.includes('no-cache')) {
    return false;
  }

  return true;
}

async function trimCache(cache, maxEntries) {
  const keys = await cache.keys();
  if (keys.length <= maxEntries) {
    return;
  }

  const removeCount = keys.length - maxEntries;
  await Promise.all(keys.slice(0, removeCount).map((key) => cache.delete(key)));
}
