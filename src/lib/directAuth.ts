import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const cloudUrl = import.meta.env.VITE_SUPABASE_URL;
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

function xhrFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  return new Promise((resolve, reject) => {
    const request = input instanceof Request ? input : null;
    const url = request?.url ?? String(input);
    const xhr = new XMLHttpRequest();

    xhr.open(init?.method ?? request?.method ?? "GET", url, true);

    const headers = new Headers(request?.headers);
    if (init?.headers) {
      new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    }
    headers.forEach((value, key) => xhr.setRequestHeader(key, value));

    xhr.onload = () => {
      const responseHeaders = new Headers();
      xhr.getAllResponseHeaders().trim().split(/[\r\n]+/).forEach((line) => {
        const separator = line.indexOf(":");
        if (separator > 0) {
          responseHeaders.append(line.slice(0, separator).trim(), line.slice(separator + 1).trim());
        }
      });

      resolve(new Response(xhr.responseText, {
        status: xhr.status,
        statusText: xhr.statusText,
        headers: responseHeaders,
      }));
    };
    xhr.onerror = () => reject(new TypeError("Failed to connect to authentication server"));
    xhr.ontimeout = () => reject(new TypeError("Authentication request timed out"));
    xhr.onabort = () => reject(new DOMException("Authentication request was cancelled", "AbortError"));
    xhr.timeout = 20_000;

    if (init?.signal) {
      if (init.signal.aborted) {
        xhr.abort();
        return;
      }
      init.signal.addEventListener("abort", () => xhr.abort(), { once: true });
    }

    const body = init?.body ?? (request ? request.body : null);
    if (body instanceof ReadableStream) {
      reject(new TypeError("Streaming request bodies are not supported"));
      return;
    }
    xhr.send(body as XMLHttpRequestBodyInit | null | undefined);
  });
}

export async function signInDirect(email: string, password: string) {
  if (!cloudUrl || !publishableKey) {
    throw new Error("Authentication configuration is unavailable");
  }

  const authClient = createClient<Database>(cloudUrl, publishableKey, {
    global: { fetch: xhrFetch },
    auth: {
      storage: localStorage,
      persistSession: true,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  return authClient.auth.signInWithPassword({ email, password });
}