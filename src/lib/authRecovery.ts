/**
 * Recovery helpers for a corrupted / unrefreshable local auth session.
 *
 * Symptom this solves: a stale refresh token stored in localStorage makes the
 * auth client retry `token?grant_type=refresh_token` in a loop. Those retries
 * hold the internal auth lock, so a fresh `signInWithPassword` call can never
 * complete and surfaces as "Failed to fetch" on the Sign In screen.
 */

const projectRef = (import.meta.env.VITE_SUPABASE_PROJECT_ID as string | undefined) ?? "";

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

/** Reject a promise after `ms` so the UI never hangs on a dead network. */
export function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error(message)), ms);
    promise.then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        window.clearTimeout(timer);
        reject(error);
      }
    );
  });
}
