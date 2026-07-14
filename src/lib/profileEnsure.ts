import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

let accessChecked = false;

/**
 * Startup check: verify the `profiles` table is reachable through the Data API.
 * Logs a clear warning if grants/RLS are misconfigured so we can catch it early.
 */
export async function checkProfilesAccess(): Promise<void> {
  if (accessChecked) return;
  accessChecked = true;
  try {
    const { error } = await supabase.from("profiles").select("id", { count: "exact", head: true }).limit(1);
    if (error) {
      const msg = (error.message || "").toLowerCase();
      if (
        msg.includes("permission denied") ||
        msg.includes("schema cache") ||
        msg.includes("could not find the table")
      ) {
        console.warn(
          "[profiles access] Supabase Data-API cannot reach public.profiles. " +
            "Missing GRANTs or wrong table name. Original error:",
          error
        );
      } else {
        console.warn("[profiles access] Unexpected error probing profiles:", error);
      }
    }
  } catch (e) {
    console.warn("[profiles access] probe failed:", e);
  }
}

/**
 * Ensure a profile row exists for the given auth user.
 * Safe to call after every login — uses upsert with ignoreDuplicates so it
 * never overwrites an existing row and never throws if the trigger already
 * created it.
 */
export async function ensureProfileRow(user: User): Promise<void> {
  if (!user) return;
  try {
    const meta = (user.user_metadata ?? {}) as Record<string, any>;
    const name =
      (meta.name as string) ||
      (meta.full_name as string) ||
      (meta.display_name as string) ||
      (user.email ? user.email.split("@")[0] : "User");
    const avatar_url = (meta.avatar_url as string) || (meta.picture as string) || null;

    const { error } = await supabase
      .from("profiles")
      .upsert(
        {
          id: user.id,
          email: user.email ?? null,
          name,
          avatar_url,
        },
        { onConflict: "id", ignoreDuplicates: true }
      );
    if (error) console.warn("[ensureProfileRow] upsert failed:", error);
  } catch (e) {
    console.warn("[ensureProfileRow] threw:", e);
  }
}
