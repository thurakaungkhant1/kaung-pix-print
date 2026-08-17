/**
 * Some ISPs (notably in Myanmar) block the backend API domain, so requests
 * only succeed while a VPN is on and fail with "Failed to fetch" otherwise.
 *
 * This patches the global fetch: any request to the backend origin that fails
 * at the network level is retried through the Cloud Function gateway.
 * Once a block is detected we keep using the proxy for the rest of the session.
 */
const BACKEND_URL: string = (import.meta.env.VITE_SUPABASE_URL || "").replace(/\/$/, "");
const PROJECT_REF = (() => {
  try {
    return new URL(BACKEND_URL).hostname.split(".")[0] || "";
  } catch {
    return "";
  }
})();
const PROXY_URL = PROJECT_REF
  ? `https://${PROJECT_REF}.functions.supabase.co/backend-proxy`
  : "";
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

const toProxyUrl = (url: string) => {
  const target = new URL(url);
  const proxy = new URL(PROXY_URL);
  proxy.searchParams.set("path", target.pathname);
  target.searchParams.forEach((value, key) => proxy.searchParams.append(key, value));
  return proxy.toString();
};

const isApiResponseUsable = async (response: Response) => {
  if (response.status === 204 || response.status === 205) return true;

  const type = response.headers.get("content-type")?.toLowerCase() || "";
  if (type.includes("text/html")) return false;

  // Auth and Data API errors must contain JSON. ISP block pages commonly
  // answer with an empty 404, which otherwise makes the auth SDK call
  // Response.json() and throw "Unexpected end of JSON input".
  if (response.status >= 400) {
    if (!type.includes("json")) return false;
    const body = await response.clone().text();
    if (!body.trim()) return false;
    try {
      JSON.parse(body);
    } catch {
      return false;
    }
  }

  return true;
};

const networkErrorResponse = () =>
  new Response(
    JSON.stringify({
      message: "Backend connection unavailable. Please check your connection and try again.",
      code: "backend_unreachable",
    }),
    {
      status: 503,
      headers: { "content-type": "application/json; charset=utf-8" },
    },
  );

const urlOf = (input: RequestInfo | URL): string => {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  return input.url;
};

export function installBackendFallbackFetch() {
  if (!BACKEND_URL || !PROXY_URL || typeof window === "undefined") return;
  const original = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = urlOf(input);
    if (!url.startsWith(BACKEND_URL)) return original(input, init);

    const proxied = toProxyUrl(url);

    const viaProxy = async () => {
      const res = await original(proxied, init ?? (input instanceof Request ? input : undefined));
      if (!(await isApiResponseUsable(res))) throw new Error("proxy_unavailable");
      return res;
    };

    if (isBlocked()) {
      try {
        return await viaProxy();
      } catch {
        clearBlocked();
        try {
          const direct = await original(input, init);
          return (await isApiResponseUsable(direct)) ? direct : networkErrorResponse();
        } catch {
          return networkErrorResponse();
        }
      }
    }

    try {
      const direct = await original(input, init);
      if (await isApiResponseUsable(direct)) return direct;

      const proxy = await viaProxy();
      setBlocked();
      return proxy;
    } catch (err) {
      try {
        const res = await viaProxy();
        setBlocked();
        return res;
      } catch {
        // Always return a JSON API error. The auth client parses every error
        // response as JSON, so returning an ISP/static-host empty body here
        // causes a misleading JSON parsing exception instead of a useful
        // connection error.
        console.warn("[backend fallback] Direct and proxy requests failed", err);
        return networkErrorResponse();
      }
    }
  };
}

