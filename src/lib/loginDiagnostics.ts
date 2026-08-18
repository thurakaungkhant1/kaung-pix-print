export type LoginFailure = {
  /** Short, user-facing headline */
  title: string;
  /** Plain-language explanation of what went wrong */
  message: string;
  /** What the user can do next */
  hint?: string;
  /** Machine detail shown in the small print + console */
  detail: string;
};

type AnyAuthError = {
  name?: string;
  message?: string;
  code?: string;
  status?: number;
  __isAuthError?: boolean;
};

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;

/** Quick reachability probe of the auth server (never throws). */
export async function probeAuthServer(): Promise<{ ok: boolean; status?: number; error?: string }> {
  if (!SUPABASE_URL) return { ok: false, error: "VITE_SUPABASE_URL is not configured" };
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(`${SUPABASE_URL}/auth/v1/health`, {
      method: "GET",
      headers: { apikey: (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string) ?? "" },
      signal: controller.signal,
    });
    clearTimeout(timer);
    return { ok: res.ok, status: res.status };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export function classifyLoginError(caught: unknown): LoginFailure {
  const err = (caught ?? {}) as AnyAuthError;
  const raw = err.message ?? String(caught);
  const code = err.code;
  const status = err.status;
  const detail = [code && `code=${code}`, status !== undefined && `status=${status}`, `msg=${raw}`]
    .filter(Boolean)
    .join(" · ");

  if (/invalid login credentials/i.test(raw) || code === "invalid_credentials") {
    return {
      title: "Wrong email or password",
      message: "The email and password combination does not match any account.",
      hint: "Check for typos, or use “Forgot Password?” to reset it.",
      detail,
    };
  }
  if (/email not confirmed/i.test(raw) || code === "email_not_confirmed") {
    return {
      title: "Email not verified",
      message: "This account exists but the email address has not been confirmed yet.",
      hint: "Open the confirmation link we emailed you, then sign in again.",
      detail,
    };
  }
  if (status === 429 || code === "over_request_rate_limit" || /rate limit/i.test(raw)) {
    return {
      title: "Too many attempts",
      message: "The server temporarily blocked further sign-in attempts from this device.",
      hint: "Wait about 60 seconds, then try once more.",
      detail,
    };
  }
  if (code === "user_banned" || /banned/i.test(raw)) {
    return {
      title: "Account suspended",
      message: "This account has been suspended by an administrator.",
      hint: "Contact support if you believe this is a mistake.",
      detail,
    };
  }
  if (/failed to fetch|networkerror|load failed|timeout|aborted/i.test(raw) || status === 0) {
    return {
      title: "Cannot reach the sign-in server",
      message: "The request never got a response — this is a network or connection problem, not a wrong password.",
      hint: "Check your internet connection, disable VPN/ad-blockers, then retry.",
      detail,
    };
  }
  if (status && status >= 500) {
    return {
      title: "Server error",
      message: "The authentication server returned an internal error.",
      hint: "Please try again in a few minutes.",
      detail,
    };
  }
  return {
    title: "Sign in failed",
    message: raw || "An unexpected error occurred while signing in.",
    hint: "Please try again. If it keeps happening, share the detail below with support.",
    detail,
  };
}

export function logLoginError(context: Record<string, unknown>, caught: unknown, failure: LoginFailure) {
  /* eslint-disable no-console */
  console.group("%c[Login] sign-in failed", "color:#ef4444;font-weight:bold");
  console.error("Reason:", failure.title, "—", failure.message);
  console.info("Detail:", failure.detail);
  console.info("Context:", { ...context, authUrl: SUPABASE_URL ? `${SUPABASE_URL}/auth/v1/token` : "(missing)" });
  console.error("Raw error:", caught);
  console.groupEnd();
  /* eslint-enable no-console */
}
