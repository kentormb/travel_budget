const CACHE_NAME = "expenses-tracker-cache-v5"; // ⬅️ Update this to force a refresh
const urlsToCache = [
    "/",
    "/index.html",
    "/settings",
    "/manifest.json",
    "/favicon.ico",
    "/assets/logo.png",
    "/assets/icons/marker-icon-2x.png",
    "/assets/icons/marker-shadow.png",
    "/assets/placeholder.svg",
];

// Install event: Cache essential files
self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(urlsToCache);
        })
    );
    self.skipWaiting(); // Activate immediately
});

// Fetch event: Ignore extension requests & use network-first strategy
self.addEventListener("fetch", (event) => {
    if (!event.request.url.startsWith("http")) return; // Ignore browser extensions

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                return caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, response.clone());
                    return response;
                });
            })
            .catch(() => caches.match(event.request)) // If offline, use cache
    );
});

// Activate event: Delete old caches and update immediately
self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((cache) => cache !== CACHE_NAME) // Remove old caches
                    .map((cache) => caches.delete(cache))
            );
        })
    );
    self.clients.claim(); // Apply new service worker immediately
});
