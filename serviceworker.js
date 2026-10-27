//Reference: https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Tutorials/CycleTracker/Service_workers

const VERSION = "v3"
const APP_NAME = "cleancab-filter-app";
const CACHE_NAME = `${APP_NAME}-${VERSION}`;

const APP_STATIC_RESOURCES = [
    '/app-images/appicon-144.png',
    '/app-images/appicon-192.png',
    '/app-images/appicon-256.png',
    '/app-images/appicon-512.png',
    '/index.html',
    '/fallback.html',
    '/manifest.json',
    '/cleancab.png',
    '/styleph.css';
                
self.addEventListener("install", (event) => {
  self.skipWaiting();
    
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      cache.addAll(APP_STATIC_RESOURCES).catch((err) => {
        console.error("Failed to cache resources during install:", err);
      });
    })(),
  );
});

self.addEventListener("activate", (event) => {
  console.log("🔄 Service worker activating...");

  event.waitUntil(
    (async () => {
      try {
        const cacheNames = await caches.keys();
        const oldCaches = cacheNames.filter(
          (name) => name !== CACHE_NAME && name.startsWith(APP_NAME)
        );

        if (oldCaches.length) {
          console.log("🧹 Deleting old caches:", oldCaches);
        } else {
          console.log("✅ No old caches to clean up.");
        }

        await Promise.all(
          oldCaches.map((name) =>
            caches.delete(name).then(() => {
              console.log(`🗑️ Deleted cache: ${name}`);
            })
          )
        );

        await clients.claim();
        console.log("🎉 Service worker is now active and ready!");
      } catch (err) {
        console.error("🚨 Error during activate handler:", err);
      }
    })()
  );
});

self.addEventListener("fetch", (event) => 
{
  console.log("Handling fetch event for", event.request.url);   

  if (event.request.mode === "navigate") 
  {
    event.respondWith(
      caches.match('/index.html').then((cachedResponse) => 
        cachedResponse || fetch(event.request).catch(() => caches.match('/index.html'))
      )
    );
    return;
  }

  // Handle other requests with caching updates
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      
      const requestUrl = new URL(event.request.url);
      const normalizedRequest = requestUrl.pathname;

      if (normalizedRequest === '/serviceworker.js') {
        return fetch(event.request);
      }

      console.log("Normalized fetch event for", normalizedRequest); 
  
      const cachedResponse = await cache.match(event.request) || await cache.match(normalizedRequest);

      if (cachedResponse) {
        console.log("Found response in cache:", cachedResponse);
        return cachedResponse;
      }

      console.log("No response found in cache. Fetching from network...");
      
      try {
        const response = await fetch(event.request);
        console.log("Response from network:", response);

        const responseClone = response.clone();
        cache.put(normalizedRequest, responseClone);

        return response;
      } catch (error) {
        console.error("Fetching failed:", error);
        return caches.match('/fallback.html').then((fallback) =>
            fallback || new Response("Offline", { status: 503 })
        );
      }
    })()
  );
});
