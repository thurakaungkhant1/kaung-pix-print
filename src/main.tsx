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

if (isLovablePreview && "serviceWorker" in navigator) {
  void navigator.serviceWorker.getRegistrations().then((registrations) =>
    Promise.all(registrations.map((registration) => registration.unregister())),
  );
  if ("caches" in window) {
    void caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key))));
  }
}

createRoot(document.getElementById("root")!).render(<App />);
