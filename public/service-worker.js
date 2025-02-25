// service-worker.js
const CACHE_NAME = "my-app-cache-v1";

// Immediately take control of pages
self.addEventListener("install", (event) => {
    // Pre-cache only the absolute bare minimum you need for offline startup
    // Typically at least "/" or "/index.html"
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(["/", "/index.html"]);
        })
    );
    self.skipWaiting(); // Force the SW to activate immediately
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    // if (cache !== CACHE_NAME) {
                    //     return caches.delete(cache);
                    // }
                })
            );
        })
    );
    self.clients.claim();
});

self.addEventListener("fetch", (event) => {
    const request = event.request;

    // 1) For page navigations (HTML documents), do Network First, fallback to cached index.html.
    //    This ensures you always get the latest index.html if online, but still work offline.
    if (request.mode === "navigate") {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    // Cache a copy of this page
                    const copy = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
                    return response;
                })
                .catch(() => {
                    // Offline => fallback to /index.html
                    return caches.match("/index.html");
                })
        );
        return; // Done handling "navigate" requests
    }

    // 2) For static assets like script, style, images, do a Cache First strategy.
    //    If it’s in the cache, return it. Otherwise, fetch & cache it.
    if (["script", "style", "image", "font"].includes(request.destination)) {
        event.respondWith(
            caches.match(request).then((cachedResponse) => {
                if (cachedResponse) {
                    return cachedResponse;
                }
                return fetch(request).then((response) => {
                    const copy = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
                    return response;
                });
            })
        );
        return;
    }

    // 3) For everything else (e.g., JSON fetches, APIs), do a Network First approach,
    //    fallback to cache if offline.
    event.respondWith(
        fetch(request)
            .then((response) => {
                const copy = response.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
                return response;
            })
            .catch(() => {
                return caches.match(request);
            })
    );
});
