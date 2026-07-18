import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface AdminNotificationPrefs {
  deposit_sound_enabled: boolean;
  deposit_badge_enabled: boolean;
}

const DEFAULT_PREFS: AdminNotificationPrefs = {
  deposit_sound_enabled: true,
  deposit_badge_enabled: true,
};

/**
 * Loads and persists the current admin's notification preferences
 * (deposit sound and badge/red-dot).
 */
export const useAdminNotificationPrefs = () => {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<AdminNotificationPrefs>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("admin_notification_settings")
      .select("deposit_sound_enabled, deposit_badge_enabled")
      .eq("user_id", user.id)
      .maybeSingle();
    if (data) setPrefs(data as AdminNotificationPrefs);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  // Realtime: reflect changes made from other tabs/devices
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`admin-notif-prefs-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "admin_notification_settings",
          filter: `user_id=eq.${user.id}`,
        },
        (payload: any) => {
          if (payload.new) {
            setPrefs({
              deposit_sound_enabled: !!payload.new.deposit_sound_enabled,
              deposit_badge_enabled: !!payload.new.deposit_badge_enabled,
            });
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const update = async (patch: Partial<AdminNotificationPrefs>) => {
    if (!user) return;
    const next = { ...prefs, ...patch };
    setPrefs(next);
    await supabase
      .from("admin_notification_settings")
      .upsert(
        { user_id: user.id, ...next },
        { onConflict: "user_id" }
      );
  };

  return { prefs, loading, update, reload: load };
};
