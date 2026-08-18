import { registerSW } from "virtual:pwa-register";

const APP_SW_PATH = "/sw.js";

function isPreviewEnvironment() {
  const host = window.location.hostname;
  return (
    window.self !== window.top ||
    host.startsWith("id-preview--") ||
    host.startsWith("preview--") ||
    host === "lovableproject.com" ||
    host.endsWith(".lovableproject.com") ||
    host === "lovableproject-dev.com" ||
    host.endsWith(".lovableproject-dev.com") ||
    host === "beta.lovable.dev" ||
    host.endsWith(".beta.lovable.dev")
  );
}

async function unregisterAppWorker() {
  if (!("serviceWorker" in navigator)) return;
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(
    registrations
      .filter((registration) => registration.active?.scriptURL.endsWith(APP_SW_PATH))
      .map((registration) => registration.unregister()),
  );
}

export async function registerAppServiceWorker() {
  const disabled = new URLSearchParams(window.location.search).get("sw") === "off";
  if (!import.meta.env.PROD || isPreviewEnvironment() || disabled) {
    await unregisterAppWorker();
    return;
  }

  registerSW({ immediate: true });
}