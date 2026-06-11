// Background notification service worker for Kaung Computer
// Shows OS-level notifications when the app posts a message via postMessage,
// or via Push API (if subscribed in the future).

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("message", (event) => {
  const data = event.data || {};
  if (data.type === "SHOW_NOTIFICATION") {
    const { title, body, tag, url } = data.payload || {};
    self.registration.showNotification(title || "New message", {
      body: body || "",
      tag: tag || "chat",
      icon: "/pwa-192x192.png",
      badge: "/pwa-192x192.png",
      data: { url: url || "/" },
      renotify: true,
    });
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          client.focus();
          if ("navigate" in client) {
            try { client.navigate(targetUrl); } catch (e) {}
          }
          return;
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    })
  );
});

// Optional: future web-push payload
self.addEventListener("push", (event) => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; } catch (e) {}
  const { title = "New message", body = "", tag = "chat", url = "/" } = payload;
  event.waitUntil(
    self.registration.showNotification(title, {
      body, tag, icon: "/pwa-192x192.png", badge: "/pwa-192x192.png", data: { url },
    })
  );
});
