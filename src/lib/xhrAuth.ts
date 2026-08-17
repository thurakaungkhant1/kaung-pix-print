/**
 * Fallback sign-in transport.
 *
 * Some environments break `window.fetch` for our backend calls: browser
 * extensions, VPN/proxy shims, or embedded webviews that monkey-patch fetch.
 * When that happens supabase-js reports a bare "Failed to fetch" even though
 * the network is fine. XMLHttpRequest uses a different code path, so we retry
 * the password grant through it and hand the resulting tokens back to
 * supabase-js via `setSession`.
 */
import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

type TokenResponse = {
  access_token?: string;
  refresh_token?: string;
  error?: string;
  error_description?: string;
  msg?: string;
  message?: string;
};

function xhrPost(url: string, body: unknown, timeoutMs = 20000): Promise<{ status: number; json: TokenResponse }> {
  return new Promise((resolve, reject) => {
    try {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", url, true);
      xhr.timeout = timeoutMs;
      xhr.setRequestHeader("Content-Type", "application/json");
      xhr.setRequestHeader("apikey", SUPABASE_KEY);
      xhr.setRequestHeader("Authorization", `Bearer ${SUPABASE_KEY}`);
      xhr.onload = () => {
        let json: TokenResponse = {};
        try {
          json = JSON.parse(xhr.responseText || "{}");
        } catch {
          json = {};
        }
        resolve({ status: xhr.status, json });
      };
      xhr.onerror = () => reject(new Error("Failed to fetch"));
      xhr.ontimeout = () => reject(new Error("Failed to fetch"));
      xhr.send(JSON.stringify(body));
    } catch (error) {
      reject(error);
    }
  });
}

/** Signs in without using `fetch`. Throws a normal auth-style error on failure. */
export async function signInWithPasswordViaXhr(email: string, password: string) {
  const { status, json } = await xhrPost(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    email,
    password,
    gotrue_meta_security: {},
  });

  if (status < 200 || status >= 300 || !json.access_token || !json.refresh_token) {
    const message =
      json.error_description || json.msg || json.message || json.error || "Invalid login credentials";
    const error = new Error(message) as Error & { status?: number };
    error.status = status;
    throw error;
  }

  const { data, error } = await supabase.auth.setSession({
    access_token: json.access_token,
    refresh_token: json.refresh_token,
  });
  if (error) throw error;
  return data;
}
