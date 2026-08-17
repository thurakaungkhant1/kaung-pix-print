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

const clearBlocked = () => {
  try {
    sessionStorage.removeItem(FLAG);
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

    const viaProxy = async () => {
      const res = await original(proxied, init ?? (input instanceof Request ? input : undefined));
      // A static host without rewrites answers with the SPA shell (HTML),
      // which would break JSON parsing. Treat that as "no proxy available".
      const type = res.headers.get("content-type") || "";
      if (type.includes("text/html")) throw new Error("proxy_unavailable");
      return res;
    };

    if (isBlocked()) {
      try {
        return await viaProxy();
      } catch {
        clearBlocked();
        return original(input, init);
      }
    }

    try {
      return await original(input, init);
    } catch (err) {
      try {
        const res = await viaProxy();
        setBlocked();
        return res;
      } catch {
        throw err;
      }
    }
  };
}

