// Minimalni service worker: aplikacija se može instalirati, statika se
// cachira, a bez mreže se umjesto greške preglednika prikaže /offline.
// Podaci (API, stranice) se NIKAD ne poslužuju iz cachea — rezultat mora biti
// svjež, a stranice su vezane uz prijavljeni račun.
// Promjena verzije pri aktivaciji briše stari cache (i chunkove svih starih deployeva).
const VERSION = "v2";
const STATIC_CACHE = `bela-static-${VERSION}`;
const OFFLINE_URL = "/offline";
// Svaki deploy donosi nove chunkove s novim hashom, a stari ostaju. Gornja
// granica drži cache malim; brišu se najstariji unosi (keys() je redom upisa).
const MAX_STATIC_ENTRIES = 150;

async function trimStaticCache() {
  const cache = await caches.open(STATIC_CACHE);
  const keys = await cache.keys();
  const protectedUrls = new Set([OFFLINE_URL, "/icon-192.png"]);
  const removable = keys.filter((key) => !protectedUrls.has(new URL(key.url).pathname));
  const excess = removable.length - MAX_STATIC_ENTRIES;
  if (excess > 0) await Promise.all(removable.slice(0, excess).map((key) => cache.delete(key)));
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll([OFFLINE_URL, "/icon-192.png"]))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== STATIC_CACHE).map((key) => caches.delete(key))),
      )
      // Navigation preload: zahtjev za stranicu kreće odmah, paralelno s
      // pokretanjem SW-a, umjesto tek kad se SW probudi (hladno pokretanje PWA).
      .then(() => self.registration.navigationPreload?.enable())
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          return (await event.preloadResponse) ?? (await fetch(request));
        } catch {
          return caches.match(OFFLINE_URL);
        }
      })(),
    );
    return;
  }

  // Next statika ima hash u imenu, pa je sigurna za cache-first.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ??
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              event.waitUntil(
                caches
                  .open(STATIC_CACHE)
                  .then((cache) => cache.put(request, copy))
                  .then(trimStaticCache),
              );
            }
            return response;
          }),
      ),
    );
  }
});
