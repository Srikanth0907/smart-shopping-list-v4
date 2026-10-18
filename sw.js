
const CACHE_NAME = "smart-shopping-list-v4-v2";

const APP_FILES = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

// Install: cache the app's essential files.
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_FILES))
      .then(() => self.skipWaiting())
  );
});

// Activate: remove outdated app caches.
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => caches.delete(name))
        )
      )
      .then(() => self.clients.claim())
  );
});

// Fetch: use the network first, then fall back to cache.
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  const requestUrl = new URL(event.request.url);

  // Do not intercept requests to other origins.
  if (requestUrl.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const responseCopy = response.clone();

          // Cache in the background without delaying the response.
          event.waitUntil(
            caches.open(CACHE_NAME)
              .then((cache) =>
                cache.put(event.request, responseCopy)
              )
              .catch((error) => {
                console.warn("Could not update cache:", error);
              })
          );
        }

        return response;
      })
      .catch(async () => {
        const cachedResponse = await caches.match(event.request);

        if (cachedResponse) {
          return cachedResponse;
        }

        // Always return a valid Response when no cached copy exists.
        return new Response(
          "This page is unavailable offline. Please reconnect to the internet and try again.",
          {
            status: 503,
            statusText: "Service Unavailable",
            headers: {
              "Content-Type": "text/plain; charset=utf-8"
            }
          }
        );
      })
  );
});
