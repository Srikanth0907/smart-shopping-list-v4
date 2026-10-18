const CACHE_NAME = "smart-shopping-list-v4-v2";

const APP_FILES = [
  "./",
  "./index.html",
  "./manifest.json"
];

// Install the service worker and cache the essential app files.
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_FILES))
      .then(() => self.skipWaiting())
  );
});

// Activate the new version and remove older app caches.
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((name) =>
              name.startsWith("smart-shopping-list-v4-") &&
              name !== CACHE_NAME
            )
            .map((name) => caches.delete(name))
        )
      )
      .then(() => self.clients.claim())
  );
});

// Handle requests safely, always returning a valid Response.
self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") {
    return;
  }

  const requestUrl = new URL(request.url);

  // Leave requests to other websites untouched.
  if (requestUrl.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    (async () => {
      try {
        const networkResponse = await fetch(request);

        // Cache successful responses without delaying the page response.
        if (networkResponse && networkResponse.ok) {
          const responseCopy = networkResponse.clone();

          event.waitUntil(
            caches.open(CACHE_NAME)
              .then((cache) => cache.put(request, responseCopy))
              .catch((error) => {
                console.warn("Cache update failed:", error);
              })
          );
        }

        return networkResponse;
      } catch (error) {
        // Try the cache if the network request fails.
        const cachedResponse = await caches.match(request, {
          ignoreSearch: true
        });

        if (cachedResponse) {
          return cachedResponse;
        }

        // For page navigation, try the cached home page.
        if (request.mode === "navigate") {
          const homePage = await caches.match("./index.html");

          if (homePage) {
            return homePage;
          }
        }

        // Always provide a valid Response when nothing is cached.
        return new Response(
          "This page is temporarily unavailable. Please check your internet connection and try again.",
          {
            status: 503,
            statusText: "Service Unavailable",
            headers: {
              "Content-Type": "text/plain; charset=utf-8"
            }
          }
        );
      }
    })()
  );
});
