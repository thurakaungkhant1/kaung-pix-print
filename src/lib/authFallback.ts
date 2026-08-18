type PasswordAuthResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_at?: number;
  token_type: string;
  user: {
    id: string;
    email?: string;
  };
};

type AuthErrorBody = {
  error?: string;
  error_code?: string;
  msg?: string;
  message?: string;
};

export class PasswordAuthError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "PasswordAuthError";
    this.status = status;
    this.code = code;
  }
}

function parseJson<T>(value: string): T | null {
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

/**
 * Preview environments can inject a window.fetch wrapper that occasionally
 * blocks cross-origin auth calls. This fallback uses the browser's native XHR
 * transport, then persists the exact session shape expected by the auth SDK.
 */
export function signInWithPasswordFallback(
  email: string,
  password: string,
): Promise<PasswordAuthResponse> {
  const backendUrl = import.meta.env.VITE_SUPABASE_URL;
  const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;

  if (!backendUrl || !publishableKey || !projectId) {
    return Promise.reject(new PasswordAuthError("Authentication is not configured", 0));
  }

  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("POST", `${backendUrl}/auth/v1/token?grant_type=password`, true);
    request.withCredentials = false;
    request.setRequestHeader("apikey", publishableKey);
    request.setRequestHeader("Authorization", `Bearer ${publishableKey}`);
    request.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    request.timeout = 15_000;

    request.onload = () => {
      const response = parseJson<PasswordAuthResponse & AuthErrorBody>(request.responseText);
      if (request.status < 200 || request.status >= 300) {
        reject(new PasswordAuthError(
          response?.msg || response?.message || response?.error || "Unable to sign in",
          request.status,
          response?.error_code,
        ));
        return;
      }

      if (!response?.access_token || !response.refresh_token || !response.user?.id) {
        reject(new PasswordAuthError("The authentication server returned an invalid session", request.status));
        return;
      }

      const session: PasswordAuthResponse = {
        ...response,
        expires_at: response.expires_at ?? Math.floor(Date.now() / 1000) + response.expires_in,
      };
      localStorage.setItem(`sb-${projectId}-auth-token`, JSON.stringify(session));
      resolve(session);
    };

    request.onerror = () => reject(new PasswordAuthError("Failed to connect to authentication server", 0));
    request.onabort = () => reject(new PasswordAuthError("Authentication request was cancelled", 0));
    request.ontimeout = () => reject(new PasswordAuthError("Authentication request timed out", 0));
    request.send(JSON.stringify({ email, password }));
  });
}