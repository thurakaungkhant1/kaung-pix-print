const CLOUD_PROXY_PREFIX = "/cloud-backend";

function shouldUseProxy(backendUrl: URL): boolean {
  if (!import.meta.env.PROD || typeof window === "undefined") return false;

  const hostname = window.location.hostname;
  const isLovableHosted = hostname.endsWith(".lovable.app") || hostname.endsWith(".lovableproject.com");

  return !isLovableHosted && backendUrl.origin !== window.location.origin;
}

/**
 * Routes Cloud HTTP calls through the Vercel/custom-domain origin. This keeps
 * authentication working on networks that block the upstream backend domain.
 */
export function installCloudFetchProxy(): void {
  const configuredUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!configuredUrl) return;

  let backendUrl: URL;
  try {
    backendUrl = new URL(configuredUrl);
  } catch {
    return;
  }

  if (!shouldUseProxy(backendUrl)) return;

  const nativeFetch = window.fetch.bind(window);
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const originalUrl = input instanceof Request ? input.url : input.toString();
    let requestUrl: URL;

    try {
      requestUrl = new URL(originalUrl, window.location.origin);
    } catch {
      return nativeFetch(input, init);
    }

    if (requestUrl.origin !== backendUrl.origin) return nativeFetch(input, init);

    const proxiedUrl = `${window.location.origin}${CLOUD_PROXY_PREFIX}${requestUrl.pathname}${requestUrl.search}`;
    if (input instanceof Request) {
      return nativeFetch(new Request(proxiedUrl, input), init);
    }

    return nativeFetch(proxiedUrl, init);
  };
}