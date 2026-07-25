// Mix Vault service worker — app-shell caching so the site opens with no
// network. It deliberately does NOT touch the audio/artwork CDN: downloaded
// track bytes live in OPFS/IndexedDB and are played back through blob URLs, so
// the SW's only job is keeping the app itself reachable offline.
//
// Bump CACHE_VERSION whenever the caching logic here changes so old caches are
// dropped on activate.
const CACHE_VERSION = "v1";
const CACHE_NAME = `mix-vault-shell-${CACHE_VERSION}`;

// The minimum needed to boot the client app offline. Route HTML is cached at
// runtime as it's visited; this just guarantees a shell to fall back to.
const PRECACHE_URLS = ["/", "/player", "/downloads"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      // Best-effort: a single missing URL shouldn't abort the whole install.
      await Promise.allSettled(PRECACHE_URLS.map((url) => cache.add(url)));
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith("mix-vault-shell-") && key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

// Network-first for page navigations: always prefer fresh HTML, but fall back
// to the cached copy of that route (then the app shell) when offline.
async function handleNavigation(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response && response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    const cached = (await cache.match(request)) || (await cache.match("/"));
    if (cached) return cached;
    throw new Error("offline and no cached shell available");
  }
}

// Cache-first for hashed static assets (immutable, so a cached hit is always
// correct), revalidating in the background to pick up new deploys.
async function handleAsset(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((response) => {
      if (response && response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => null);
  return cached || (await network) || Response.error();
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  // Only ever handle same-origin requests. Cross-origin (notably the audio
  // CDN) is left to the browser — offline audio comes from OPFS, not here.
  if (url.origin !== self.location.origin) return;

  // Never cache the API — stale track data offline would be worse than a
  // clean failure the client can handle.
  if (url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(handleNavigation(request));
    return;
  }

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/_next/image")) {
    event.respondWith(handleAsset(request));
    return;
  }

  // Other same-origin GETs (favicon, manifest, public assets): cache-first too.
  event.respondWith(handleAsset(request));
});
