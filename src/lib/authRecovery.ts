/**
 * Recovery helpers for a corrupted / unrefreshable local auth session.
 *
 * Symptom this solves: a stale refresh token stored in localStorage makes the
 * auth client retry `token?grant_type=refresh_token` in a loop. Those retries
 * hold the internal auth lock, so a fresh `signInWithPassword` call can never
 * complete and surfaces as "Failed to fetch" on the Sign In screen.
 */

const configuredProjectRef = (import.meta.env.VITE_SUPABASE_PROJECT_ID as string | undefined) ?? "";
const backendUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? "";
const projectRefFromUrl = (() => {
  try {
    return new URL(backendUrl).hostname.split(".")[0] ?? "";
  } catch {
    return "";
  }
})();
const projectRef = configuredProjectRef || projectRefFromUrl;

export const AUTH_STORAGE_KEY = projectRef ? `sb-${projectRef}-auth-token` : "";

/** Remove any locally stored session/lock so the next sign-in starts clean. */
export function clearStoredAuthSession() {
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && (k.startsWith("sb-") || k.startsWith("lock:sb-"))) keys.push(k);
    }
    keys.forEach((k) => localStorage.removeItem(k));
  } catch {
    /* storage unavailable — nothing to clean */
  }
}

/**
 * Called before a password sign-in. If a token blob exists but is expired or
 * unparseable, drop it so the auth client does not try to refresh it first.
 */
export function purgeStaleAuthSession() {
  if (!AUTH_STORAGE_KEY) return;
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    const expiresAt = Number(parsed?.expires_at ?? 0);
    if (!expiresAt || expiresAt * 1000 <= Date.now()) {
      clearStoredAuthSession();
    }
  } catch {
    clearStoredAuthSession();
  }
}

