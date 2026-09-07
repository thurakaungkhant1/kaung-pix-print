import { createRoot } from "react-dom/client";
import "./index.css";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Application root element was not found");

async function removeLegacyAppWorkers() {
  if (!("serviceWorker" in navigator)) return;

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    const rootScope = `${window.location.origin}/`;
    const legacyWorkers = registrations.filter((registration) => {
      const scriptUrl =
        registration.active?.scriptURL ??
        registration.waiting?.scriptURL ??
        registration.installing?.scriptURL ??
        "";

      return registration.scope === rootScope && !scriptUrl.endsWith("/notification-sw.js");
    });

    if (legacyWorkers.length === 0) return;
    await Promise.allSettled(legacyWorkers.map((registration) => registration.unregister()));

    // Old workers also leave stale precached bundles behind.
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.allSettled(keys.map((key) => caches.delete(key)));
    }

    // A tab already controlled by the old worker needs one clean navigation
    // before its fetch handler is fully detached.
    if (navigator.serviceWorker.controller && !sessionStorage.getItem("legacy-sw-cleaned-v1")) {
      sessionStorage.setItem("legacy-sw-cleaned-v1", "1");
      window.location.reload();
      await new Promise(() => undefined);
    }
  } catch (error) {
    console.warn("Legacy service-worker cleanup failed", error);
  }
}

async function bootstrap() {
  await removeLegacyAppWorkers();

  try {
    const { default: App } = await import("./App.tsx");
    createRoot(rootElement!).render(<App />);
  } catch (error) {
    console.error("Failed to load application module", error);

    // A stale cached module graph can break the first dynamic import.
    // Clear everything once and retry with a hard reload.
    if (!sessionStorage.getItem("app-chunk-recovery-v1")) {
      sessionStorage.setItem("app-chunk-recovery-v1", "1");
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.allSettled(keys.map((key) => caches.delete(key)));
      }
      window.location.reload();
      return;
    }

    throw error;
  }
}

void bootstrap();

