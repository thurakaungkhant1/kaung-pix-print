import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import { toast } from "sonner";

export type ProfilesAccessStatus = "ok" | "checking" | "unreachable" | "unknown_error";

let accessChecked = false;
let cachedStatus: ProfilesAccessStatus = "checking";
let cachedError: string | null = null;
const listeners = new Set<(s: ProfilesAccessStatus, err: string | null) => void>();

function setStatus(s: ProfilesAccessStatus, err: string | null) {
  cachedStatus = s;
  cachedError = err;
  listeners.forEach((l) => l(s, err));
}

export function subscribeProfilesAccess(
  cb: (status: ProfilesAccessStatus, error: string | null) => void
): () => void {
  listeners.add(cb);
  cb(cachedStatus, cachedError);
  return () => listeners.delete(cb);
}

export function getProfilesAccessStatus(): { status: ProfilesAccessStatus; error: string | null } {
  return { status: cachedStatus, error: cachedError };
}

/**
 * Startup check: verify the `profiles` table is reachable through the Data API.
 * Result is cached and exposed via subscribeProfilesAccess so UI can gate
 * sign-in until the connection + GRANT/RLS setup is confirmed.
 */
export async function checkProfilesAccess(force = false): Promise<ProfilesAccessStatus> {
  if (accessChecked && !force) return cachedStatus;
  accessChecked = true;
  setStatus("checking", null);
  try {
    const { error } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .limit(1);
    if (error) {
      const msg = (error.message || "").toLowerCase();
      if (
        msg.includes("permission denied") ||
        msg.includes("schema cache") ||
        msg.includes("could not find the table")
      ) {
        console.warn("[profiles access] Data API cannot reach public.profiles:", error);
        setStatus("unreachable", error.message);
        return "unreachable";
      }
      console.warn("[profiles access] Unexpected error probing profiles:", error);
      setStatus("unknown_error", error.message);
      return "unknown_error";
    }
    setStatus("ok", null);
    return "ok";
  } catch (e: any) {
    console.warn("[profiles access] probe failed:", e);
    setStatus("unknown_error", e?.message ?? String(e));
    return "unknown_error";
  }
}

async function reportUpsertResult(args: {
  success: boolean;
  provider?: string;
  stage?: string;
  error_code?: string | null;
  error_message?: string | null;
  error_details?: unknown;
}) {
  try {
    await supabase.functions.invoke("log-profile-upsert", { body: args });
  } catch (e) {
    console.warn("[reportUpsertResult] invoke failed:", e);
  }
}

/**
 * Ensure a profile row exists for the given auth user.
 * Emits a toast on failure and logs the outcome to the log-profile-upsert
 * edge function so admins can diagnose schema-cache / GRANT issues.
 */
export async function ensureProfileRow(user: User): Promise<boolean> {
  if (!user) return false;
  try {
    const meta = (user.user_metadata ?? {}) as Record<string, any>;
    const name =
      (meta.name as string) ||
      (meta.full_name as string) ||
      (meta.display_name as string) ||
      (user.email ? user.email.split("@")[0] : "User");
    const avatar_url = (meta.avatar_url as string) || (meta.picture as string) || null;
    const provider = (user.app_metadata as any)?.provider ?? "unknown";

    const { error } = await supabase
      .from("profiles")
      .upsert(
        [{
          id: user.id,
          email: user.email ?? "",
          name,
          avatar_url: avatar_url ?? undefined,
          phone_number: "",
        }],
        { onConflict: "id", ignoreDuplicates: true }
      );

    if (error) {
      console.warn("[ensureProfileRow] upsert failed:", error);
      const msg = (error.message || "").toLowerCase();
      const friendly = msg.includes("schema cache") || msg.includes("could not find the table")
        ? "Profile table is unreachable. Please contact support (schema cache)."
        : msg.includes("permission denied")
        ? "Profile permissions error. Please contact support (missing GRANT)."
        : "Could not save your profile. Please try again.";
      toast.error(friendly);
      reportUpsertResult({
        success: false,
        provider,
        stage: "profiles_upsert",
        error_code: (error as any).code ?? null,
        error_message: error.message,
        error_details: error,
      });
      return false;
    }

    // Silent success for background refreshes; a toast here would be noisy
    // on every token refresh. AuthCallback still surfaces sign-in success.
    reportUpsertResult({ success: true, provider, stage: "profiles_upsert" });
    return true;
  } catch (e: any) {
    console.warn("[ensureProfileRow] threw:", e);
    toast.error("Could not save your profile. Please try again.");
    reportUpsertResult({
      success: false,
      stage: "profiles_upsert",
      error_message: e?.message ?? String(e),
    });
    return false;
  }
}
