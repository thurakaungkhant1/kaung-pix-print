import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Preview hosts change frequently. A service worker left behind by an older
// preview can keep serving an outdated auth bundle/backend URL even while the
// page itself is online. Production installs keep their normal PWA behavior.
const hostname = window.location.hostname;
const isLovablePreview =
  hostname.startsWith("id-preview--") ||
  hostname.startsWith("preview--") ||
  hostname.endsWith(".lovableproject.com") ||
  window.self !== window.top;

if ("serviceWorker" in navigator) {
  if (isLovablePreview) {
    void navigator.serviceWorker.getRegistrations().then((registrations) =>
      Promise.all(registrations.map((registration) => registration.unregister())),
    );
    if ("caches" in window) {
      void caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key))));
    }
  } else {
    // Production: ask an already-installed worker to check for the newest
    // build, and reload once when a new worker takes control so users can
    // never stay stuck on an outdated login bundle.
    let reloaded = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (reloaded) return;
      reloaded = true;
      window.location.reload();
    });
    void navigator.serviceWorker.getRegistrations().then((registrations) =>
      Promise.all(registrations.map((registration) => registration.update().catch(() => undefined))),
    );
  }
}

createRoot(document.getElementById("root")!).render(<App />);
