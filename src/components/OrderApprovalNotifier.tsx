import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

/**
 * Listens for order-approval coin awards and shows a rich toast with
 * the exact coin amount in realtime. Also catches up on any awards that
 * happened while the app was closed / before the tab was focused.
 */
const OrderApprovalNotifier = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const storageKey = `oan:lastSeenTx:${user.id}`;
    const shown = new Set<string>();

    const showCoinToast = (id: string, amount: number, type: string, createdAt?: string) => {
      if (!id || shown.has(id)) return;
      shown.add(id);
      const isGame = type === "game_purchase";
      const label = isGame ? "game points" : "coins";
      const emoji = isGame ? "🎮" : "🪙";
      toast.success("Coins ရရှိပါပြီ 🎉", {
        description: `လူကြီးမင်း၏ ၀ယ်ယူမှုကြောင့် ${emoji} ${amount.toLocaleString()} ${label} ရရှိသွားပါပြီ။`,
        duration: 7000,
      });
      if (createdAt) {
        try {
          const prev = localStorage.getItem(storageKey);
          if (!prev || new Date(createdAt) > new Date(prev)) {
            localStorage.setItem(storageKey, createdAt);
          }
        } catch {}
      }
    };

    // Catch-up: show any coin awards that arrived while we were away.
    (async () => {
      let since: string | null = null;
      try {
        since = localStorage.getItem(storageKey);
      } catch {}
      // If nothing stored, look back only 10 minutes so we don't blast old toasts.
      const cutoff = since ?? new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from("point_transactions")
        .select("id, amount, transaction_type, created_at")
        .eq("user_id", user.id)
        .in("transaction_type", ["purchase", "game_purchase"])
        .gt("created_at", cutoff)
        .order("created_at", { ascending: true })
        .limit(10);
      if (data) {
        for (const row of data as any[]) {
          if (Number(row.amount) > 0) {
            showCoinToast(row.id, Number(row.amount), String(row.transaction_type), row.created_at);
          }
        }
      }
    })();

    // Realtime: authoritative coin-award toast from point_transactions
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
          if (!n?.id) return;
          const type = String(n.transaction_type || "");
          if (type !== "purchase" && type !== "game_purchase") return;
          const amount = Number(n.amount || 0);
          if (amount <= 0) return;
          showCoinToast(n.id, amount, type, n.created_at);
        }
      )
      .subscribe();

    // Realtime: non-coin personal notifications
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
          // Coin-award notifications are already handled via point_transactions.
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
