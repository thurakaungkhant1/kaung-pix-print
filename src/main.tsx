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

void removeLegacyAppWorkers().then(() =>
  import("./App.tsx").then(({ default: App }) => {
    createRoot(rootElement).render(<App />);
  }),
);
