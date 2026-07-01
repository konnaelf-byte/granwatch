/**
 * GranWatch Service Worker
 *
 * Strategy:
 *  - App shell (index.html, icons): stale-while-revalidate
 *  - Static assets (JS/CSS — content-hashed by Vite): cache-first (long-lived)
 *  - tRPC API calls (/trpc/*): network-first with 5s timeout, fall back to cache
 *  - Fonts (googleapis): cache-first
 *  - Everything else: network-only (auth, payments, etc.)
 *
 * Works in both the web browser and Capacitor WebView (iOS / Android).
 */

const CACHE_VERSION = "gw-v3";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const API_CACHE = `${CACHE_VERSION}-api`;

// Files to pre-cache on install (app shell)
const PRECACHE_URLS = [
  "/",
  "/icon-192.png",
  "/icon-512.png",
  "/apple-touch-icon.png",
  "/manifest.webmanifest",
];

// ──────────────────────────────────────────────
// Message handler — supports SKIP_WAITING from the client
// ──────────────────────────────────────────────
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// ──────────────────────────────────────────────
// Install: pre-cache the app shell
// ──────────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  // Take control immediately so first-load is covered
  self.skipWaiting();
});

// ──────────────────────────────────────────────
// Activate: delete old caches
// ──────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== STATIC_CACHE && k !== API_CACHE)
          .map((k) => caches.delete(k))
      )
    )
  );
  // Claim clients so the SW is active for all existing tabs
  self.clients.claim();
});

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

/** Fetch with a hard timeout. Rejects after `ms` milliseconds. */
function fetchWithTimeout(request, ms = 5000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), ms);
    fetch(request)
      .then((res) => {
        clearTimeout(timer);
        resolve(res);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

/** Cache-first: serve from cache, fetch and update in background on hit. */
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

/** Network-first with cache fallback. */
async function networkFirst(request, cacheName, timeoutMs = 5000) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetchWithTimeout(request, timeoutMs);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    // Return a structured offline JSON response for tRPC calls
    return new Response(
      JSON.stringify({ error: { message: "You are offline. Showing cached data." } }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }
}

// ──────────────────────────────────────────────
// Fetch handler
// ──────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. Skip non-GET requests and chrome-extension/data URLs
  if (request.method !== "GET") return;
  if (!url.protocol.startsWith("http")) return;

  // 2. Skip auth endpoints (Clerk) and payment endpoints — always network-only
  if (
    url.hostname.includes("clerk.") ||
    url.hostname.includes("lemonsqueezy.") ||
    url.hostname.includes("revenuecat.") ||
    url.hostname.includes("stripe.") ||
    url.pathname.startsWith("/.well-known/") ||
    url.pathname.startsWith("/api/og/")
  ) {
    return; // fall through to browser
  }

  // 3. tRPC API calls: network-first with cache fallback
  if (url.pathname.startsWith("/api/trpc")) {
    event.respondWith(networkFirst(request, API_CACHE, 5000));
    return;
  }

  // 4. Vite-built static assets (content-hashed filenames): cache-first
  if (
    url.pathname.startsWith("/assets/") ||
    url.pathname.match(/\.(js|css|woff2?|ttf|otf|eot)$/)
  ) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // 5. Google Fonts stylesheets and font files: cache-first
  if (
    url.hostname === "fonts.googleapis.com" ||
    url.hostname === "fonts.gstatic.com"
  ) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // 6. Image files (icons, photos): cache-first
  if (url.pathname.match(/\.(png|jpg|jpeg|webp|svg|ico|gif)$/)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // 7. SPA navigation (HTML documents): serve cached index.html as fallback
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(STATIC_CACHE);
        return cache.match("/") ?? Response.error();
      })
    );
    return;
  }

  // 8. Everything else: network-only (don't interfere)
});
