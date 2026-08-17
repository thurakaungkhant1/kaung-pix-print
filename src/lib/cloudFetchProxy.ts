const CLOUD_PROXY_PREFIX = "/cloud-backend";
const REFRESH_FAILURE_WINDOW_MS = 15_000;
const REFRESH_FAILURE_LIMIT = 3;
const RECOVERY_RELOAD_KEY = "auth-refresh-recovery-reloaded-at";

let refreshFailures: number[] = [];

function isRefreshRequest(url: URL): boolean {
  return url.pathname.endsWith("/auth/v1/token") && url.searchParams.get("grant_type") === "refresh_token";
}

function clearPersistedAuthSessions(): void {
  for (let index = localStorage.length - 1; index >= 0; index -= 1) {
    const key = localStorage.key(index);
    if (key?.startsWith("sb-") && key.endsWith("-auth-token")) {
      localStorage.removeItem(key);
    }
  }
}

function recoverFromStaleSession(): void {
  clearPersistedAuthSessions();

  const lastReload = Number(sessionStorage.getItem(RECOVERY_RELOAD_KEY) ?? 0);
  if (Date.now() - lastReload < REFRESH_FAILURE_WINDOW_MS) return;

  sessionStorage.setItem(RECOVERY_RELOAD_KEY, String(Date.now()));
  window.location.reload();
}

function recordRefreshFailure(forceRecovery = false): void {
  const now = Date.now();
  refreshFailures = refreshFailures.filter((timestamp) => now - timestamp < REFRESH_FAILURE_WINDOW_MS);
  refreshFailures.push(now);

  if (forceRecovery || refreshFailures.length >= REFRESH_FAILURE_LIMIT) {
    recoverFromStaleSession();
  }
}

function shouldUseProxy(backendUrl: URL): boolean {
  if (typeof window === "undefined") return false;

  const hostname = window.location.hostname;
  const isLovableHosted =
    hostname.endsWith(".lovable.app") ||
    hostname.endsWith(".lovableproject.com");
  const isNativeWebView = window.location.protocol === "capacitor:";

  // The same-origin rewrite is deployed by Vercel for custom domains. Lovable
  // preview/published hosts and native WebViews do not expose that rewrite;
  // attempting it there returns the app shell (or a gateway error) instead of
  // an Auth response.
  return !isLovableHosted && !isNativeWebView && backendUrl.origin !== window.location.origin;
}

function canTrySameOriginProxy(): boolean {
  if (typeof window === "undefined") return false;
  const hostname = window.location.hostname;
  return (
    window.location.protocol !== "capacitor:" &&
    !hostname.endsWith(".lovable.app") &&
    !hostname.endsWith(".lovableproject.com")
  );
}

function proxyUrlFor(requestUrl: URL): string {
  return `${window.location.origin}${CLOUD_PROXY_PREFIX}${requestUrl.pathname}${requestUrl.search}`;
}

/**
 * Routes Cloud HTTP calls through the Vercel/custom-domain origin. This keeps
 * authentication working on networks that block the upstream backend domain.
 */
export function installCloudFetchProxy(): void {
  const configuredUrl = import.meta.env.VITE_SUPABASE_URL;
  let backendUrl: URL | null = null;
  try {
    backendUrl = configuredUrl ? new URL(configuredUrl) : null;
  } catch {
    backendUrl = null;
  }

  const nativeFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const originalUrl = input instanceof Request ? input.url : input.toString();
    let requestUrl: URL;

    try {
      requestUrl = new URL(originalUrl, window.location.origin);
    } catch {
      return nativeFetch(input, init);
    }

    const refreshRequest = isRefreshRequest(requestUrl);
    let requestInput: RequestInfo | URL = input;
    const isBackendRequest = backendUrl && requestUrl.origin === backendUrl.origin;

    if (isBackendRequest && shouldUseProxy(backendUrl)) {
      const proxiedUrl = proxyUrlFor(requestUrl);
      requestInput = input instanceof Request ? new Request(proxiedUrl, input) : proxiedUrl;
    }

    try {
      const response = await nativeFetch(requestInput, init);
      if (refreshRequest) {
        if (response.status === 400 || response.status === 401) recordRefreshFailure(true);
        else if (response.ok) refreshFailures = [];
      }
      return response;
    } catch (error) {
      if (refreshRequest) recordRefreshFailure();

      // A Vercel/custom-domain deployment has the same-origin rewrite. Lovable
      // hosts and native WebViews do not, so never send Auth calls to a route
      // that would return HTML or expose a raw upstream connection error.
      if (isBackendRequest && requestInput === input && canTrySameOriginProxy()) {
        const proxiedUrl = proxyUrlFor(requestUrl);
        const fallbackInput = input instanceof Request ? new Request(proxiedUrl, input.clone()) : proxiedUrl;
        return nativeFetch(fallbackInput, init);
      }
      throw error;
    }
  };
}