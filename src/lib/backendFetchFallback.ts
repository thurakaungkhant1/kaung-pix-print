const BACKEND_URL = import.meta.env.VITE_SUPABASE_URL as string;
const FALLBACK_ORIGIN = "https://kaungcomputer.com";

function isBackendRequest(input: RequestInfo | URL): boolean {
  const url = typeof input === "string"
    ? input
    : input instanceof URL
      ? input.href
      : input.url;
  return url.startsWith(`${BACKEND_URL}/`);
}

function backendPath(input: RequestInfo | URL): string {
  const url = typeof input === "string"
    ? input
    : input instanceof URL
      ? input.href
      : input.url;
  return url.slice(BACKEND_URL.length);
}

function gatewayUrl(path: string): string {
  const origin = window.location.hostname.endsWith("lovable.app") ||
    window.location.hostname.endsWith("lovableproject.com") ||
    window.location.hostname === "localhost"
    ? FALLBACK_ORIGIN
    : window.location.origin;
  return `${origin}/api/backend?path=${encodeURIComponent(path)}`;
}

/**
 * Retries blocked backend calls through the app's own Vercel domain. This is
 * primarily for networks that cannot resolve the direct backend hostname.
 */
export function installBackendFetchFallback(): void {
  const nativeFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    if (!isBackendRequest(input)) return nativeFetch(input, init);

    try {
      return await nativeFetch(input, init);
    } catch (directError) {
      try {
        return await nativeFetch(gatewayUrl(backendPath(input)), init);
      } catch {
        throw directError;
      }
    }
  };
}