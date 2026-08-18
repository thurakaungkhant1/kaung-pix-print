import { createRoot } from "react-dom/client";
import "./index.css";

/**
 * One-time recovery for clients that still run a cached bundle from the
 * period when backend requests were routed through a same-origin
 * "/cloud-api" proxy. That cached code produced
 * "No API key found in request" errors. Clearing the stale service worker
 * caches once forces those clients onto the current bundle, which talks to
 * Lovable Cloud directly with the publishable key attached.
 */
const CLEANUP_FLAG = "cloud-api-proxy-cleanup-v1";

async function clearStaleServiceWorkerCaches() {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(CLEANUP_FLAG)) return;
  localStorage.setItem(CLEANUP_FLAG, "done");

  let hadStaleCache = false;
  try {
    if ("caches" in window) {
      const keys = await caches.keys();
      hadStaleCache = keys.length > 0;
      await Promise.all(keys.map((key) => caches.delete(key)));
    }
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.update()));
    }
  } catch {
    // Cache cleanup is best-effort; never block app start.
  }

  if (hadStaleCache) window.location.reload();
}

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Application root element was not found");

void clearStaleServiceWorkerCaches();

void import("./App.tsx").then(({ default: App }) => {
  createRoot(rootElement).render(<App />);
});
