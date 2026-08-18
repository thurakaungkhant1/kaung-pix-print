// One-release cleanup for the previous app-shell service worker.
// It removes only Workbox/app-shell caches and then unregisters itself.
function isAppShellCache(name) {
  return /(^|-)precache-v\d+-|(^|-)runtime-|(^|-)googleAnalytics-|^app-pages$|^images-cache$|^google-fonts-cache$|^gstatic-fonts-cache$/.test(name);
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      await self.skipWaiting();
      await self.registration.unregister();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const cacheNames = await caches.keys();
        await Promise.allSettled(cacheNames.filter(isAppShellCache).map((name) => caches.delete(name)));
        await self.clients.claim();
        const clients = await self.clients.matchAll({ type: "window" });
        await Promise.allSettled(clients.map((client) => client.navigate(client.url)));
      } finally {
        await self.registration.unregister();
      }
    })(),
  );
});