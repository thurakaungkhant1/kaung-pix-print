/**
 * Some ISPs (notably in Myanmar) block the backend API domain, so requests
 * only succeed while a VPN is on and fail with "Failed to fetch" otherwise.
 *
 * This patches the global fetch: any request to the backend origin that fails
 * at the network level is retried through a same-origin proxy path (`/sb/...`),
 * which is rewritten to the backend by the hosting layer (see vercel.json).
 * Once a block is detected we keep using the proxy for the rest of the session.
 */
const BACKEND_URL: string = (import.meta.env.VITE_SUPABASE_URL || "").replace(/\/$/, "");
const PROXY_PREFIX = "/sb";
const FLAG = "backend_blocked_v1";

const isBlocked = () => {
  try {
    return sessionStorage.getItem(FLAG) === "1";
  } catch {
    return false;
  }
};

const setBlocked = () => {
  try {
    sessionStorage.setItem(FLAG, "1");
  } catch {
    /* ignore */
  }
};

const toProxyUrl = (url: string) =>
  `${window.location.origin}${PROXY_PREFIX}${url.slice(BACKEND_URL.length)}`;

const urlOf = (input: RequestInfo | URL): string => {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  return input.url;
};

export function installBackendFallbackFetch() {
  if (!BACKEND_URL || typeof window === "undefined") return;
  const original = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = urlOf(input);
    if (!url.startsWith(BACKEND_URL)) return original(input, init);

    const proxied = toProxyUrl(url);

    if (isBlocked()) {
      try {
        return await original(proxied, init ?? (input instanceof Request ? input : undefined));
      } catch {
        // Proxy unavailable (e.g. static host without rewrites) — try direct.
        return original(input, init);
      }
    }

    try {
      return await original(input, init);
    } catch (err) {
      // Network-level failure only (CORS/DNS/blocked). HTTP errors never throw.
      try {
        const res = await original(proxied, init ?? (input instanceof Request ? input : undefined));
        setBlocked();
        return res;
      } catch {
        throw err;
      }
    }
  };
}
