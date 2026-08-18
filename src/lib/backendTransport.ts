const BACKEND_HOST = "ojoenxchuzqonpixomkl.supabase.co";
const PROXY_PREFIX = "/cloud-api";

let installed = false;

/**
 * Sends browser HTTP requests to the hosted backend through the app origin.
 * This prevents DNS/VPN/ad-block filters from blocking authentication while
 * preserving the standard SDK session and refresh behavior.
 */
export function installBackendTransport(): void {
  if (installed || typeof window === "undefined" || !window.location.protocol.startsWith("http")) {
    return;
  }

  installed = true;
  const nativeFetch = window.fetch.bind(window);

  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const sourceUrl = input instanceof Request ? input.url : input.toString();

    try {
      const url = new URL(sourceUrl, window.location.origin);
      if (url.hostname !== BACKEND_HOST) {
        return nativeFetch(input, init);
      }

      const proxyUrl = `${window.location.origin}${PROXY_PREFIX}${url.pathname}${url.search}`;
      if (input instanceof Request) {
        return nativeFetch(new Request(proxyUrl, input), init);
      }

      return nativeFetch(proxyUrl, init);
    } catch {
      return nativeFetch(input, init);
    }
  };
}