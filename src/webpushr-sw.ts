declare let __COMMIT_HASH__: string;
declare let __API_HOST__: string;
const cacheName = `liftosaur-sw-${__COMMIT_HASH__}`;

const filesToCache = [
  `/main.css?version=${__COMMIT_HASH__}`,
  `/main.js?version=${__COMMIT_HASH__}`,
  /\/externalimages\/exercises\//,
  "/",
  "/index.html",
  "/icons/icon192.png",
  "/icons/icon512.png",
  "/notification.m4r",
];

function initialize(service: ServiceWorkerGlobalScope): void {
  service.addEventListener("install", (event) => {
    event.waitUntil(
      caches.open(cacheName).then((cache) => {
        return cache.addAll(filesToCache.filter((f) => typeof f === "string") as string[]);
      })
    );
  });

  service.addEventListener("fetch", (e) => {
    console.log("[Service Worker] Fetched resource " + e.request.url);

    e.respondWith(
      caches.match(e.request).then((r) => {
        console.log("[Service Worker] Fetching resource: " + e.request.url);
        return (
          r ||
          fetch(e.request).then((response) => {
            if (
              e.request.method === "GET" &&
              filesToCache.some((f) => {
                if (typeof f === "string") {
                  const u = new URL(e.request.url);
                  return `${u.pathname}${u.search}` === f;
                } else {
                  const u = new URL(e.request.url);
                  return f.test(`${u.pathname}${u.search}`);
                }
              })
            ) {
              return caches.open(cacheName).then((cache) => {
                console.log("[Service Worker] Caching new resource: " + e.request.url);
                // eslint-disable-next-line @typescript-eslint/no-floating-promises
                cache.put(e.request, response.clone());
                return response;
              });
            } else {
              return response;
            }
          })
        );
      })
    );
  });

  // eslint-disable-next-line @typescript-eslint/ban-types
  self.addEventListener("activate", async (event: object) => {
    console.log("Activate Service Worker", event);
    const keys = (await caches.keys()).filter((k) => k !== cacheName);
    console.log(keys);
    for (const key of keys) {
      await caches.delete(key);
    }
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
initialize(self as any);

if (self.importScripts != null) {
  self.importScripts("https://cdn.webpushr.com/sw-server.min.js");
}
