import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

/**
 * Listens for personal notifications (order-approval coin awards, etc.)
 * and surfaces them as a toast in realtime.
 */
const OrderApprovalNotifier = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`user-notifications-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `target_user_id=eq.${user.id}`,
        },
        (payload) => {
          const n: any = payload.new;
          if (!n) return;
          toast.success(n.title || "Notification", {
            description: n.message,
            duration: 6000,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return null;
};

export default OrderApprovalNotifier;
