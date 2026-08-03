import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Counts unread admin replies in the user's support thread and keeps the
 * number in sync in realtime. UI-only helper — no message logic changes.
 */
export const useSupportUnread = () => {
  const { user } = useAuth();
  const [unread, setUnread] = useState(0);

  const load = useCallback(async () => {
    if (!user) {
      setUnread(0);
      return;
    }
    const { count } = await (supabase as any)
      .from("support_messages")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("sender_role", "admin")
      .eq("is_read", false);
    setUnread(count || 0);
  }, [user]);

  useEffect(() => {
    load();
    if (!user) return;
    const channel = supabase
      .channel(`support-unread-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "support_messages", filter: `user_id=eq.${user.id}` },
        () => load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, load]);

  const markRead = useCallback(async () => {
    if (!user) return;
    await (supabase as any)
      .from("support_messages")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("sender_role", "admin")
      .eq("is_read", false);
    setUnread(0);
  }, [user]);

  return { unread, markRead, reload: load };
};
