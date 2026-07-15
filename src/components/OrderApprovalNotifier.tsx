import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

/**
 * Listens for order-approval coin awards and surfaces a rich toast
 * with the exact coin amount, in realtime.
 */
const OrderApprovalNotifier = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    // Track recently shown transactions to avoid duplicates from both channels
    const shown = new Set<string>();
    const showCoinToast = (amount: number, type: string) => {
      const isGame = type === "game_purchase";
      const label = isGame ? "game points" : "coins";
      const emoji = isGame ? "🎮" : "🪙";
      toast.success("Coins ရရှိပါပြီ 🎉", {
        description: `လူကြီးမင်း၏ ၀ယ်ယူမှုကြောင့် ${emoji} ${amount.toLocaleString()} ${label} ရရှိသွားပါပြီ။`,
        duration: 7000,
      });
    };

    // 1) Authoritative: point_transactions row inserted for this user
    const txChannel = supabase
      .channel(`user-point-tx-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "point_transactions",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const n: any = payload.new;
          if (!n || !n.id) return;
          if (shown.has(n.id)) return;
          const type = String(n.transaction_type || "");
          if (type !== "purchase" && type !== "game_purchase") return;
          const amount = Number(n.amount || 0);
          if (amount <= 0) return;
          shown.add(n.id);
          showCoinToast(amount, type);
        }
      )
      .subscribe();

    // 2) Fallback: personal notification rows (non-coin notifications too)
    const notifChannel = supabase
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
          // Coin-award notifications are already handled via point_transactions;
          // skip them here to avoid double toasts.
          if (typeof n.message === "string" && /coin\s*\d+/i.test(n.message)) return;
          toast.success(n.title || "Notification", {
            description: n.message,
            duration: 6000,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(txChannel);
      supabase.removeChannel(notifChannel);
    };
  }, [user]);

  return null;
};

export default OrderApprovalNotifier;
