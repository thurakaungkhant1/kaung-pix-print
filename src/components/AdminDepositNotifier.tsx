import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { useAdminNotificationPrefs } from "@/hooks/useAdminNotificationPrefs";

/**
 * Realtime listener that alerts admins when a new wallet deposit request
 * is submitted. Plays a beep and shows a toast that links to the Deposits page.
 * Respects the admin's notification preferences (sound / badge).
 */
const AdminDepositNotifier = () => {
  const { isAdmin } = useAdminCheck({ redirectOnFail: false });
  const { prefs } = useAdminNotificationPrefs();
  const navigate = useNavigate();
  const audioRef = useRef<AudioContext | null>(null);

  const beep = () => {
    try {
      const Ctx = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext | undefined;
      if (!Ctx) return;
      if (!audioRef.current) audioRef.current = new Ctx();
      const ctx = audioRef.current;
      const play = (freq: number, delay: number) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = "sine";
        o.frequency.value = freq;
        g.gain.value = 0.08;
        o.connect(g).connect(ctx.destination);
        o.start(ctx.currentTime + delay);
        o.stop(ctx.currentTime + delay + 0.18);
      };
      play(880, 0);
      play(1175, 0.2);
    } catch {}
  };

  useEffect(() => {
    if (!isAdmin) return;
    const channel = supabase
      .channel("admin-deposits-notify")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "wallet_deposits" },
        async (payload: any) => {
          const d = payload.new;
          if (!d) return;

          let userName = "User";
          const { data: prof } = await supabase
            .from("profiles")
            .select("name")
            .eq("id", d.user_id)
            .maybeSingle();
          if (prof?.name) userName = prof.name;

          const amountStr =
            new Intl.NumberFormat("my-MM").format(Number(d.amount) || 0) + " Ks";

          if (prefs.deposit_sound_enabled) beep();
          toast(`💰 New Deposit from ${userName}`, {
            description: `Amount: ${amountStr}${d.transaction_id ? ` • TX: ${d.transaction_id}` : ""}`,
            icon: <Wallet className="h-4 w-4" />,
            duration: 8000,
            action: {
              label: "Review",
              onClick: () => navigate("/admin/deposits"),
            },
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin, navigate, prefs.deposit_sound_enabled]);

  return null;
};

export default AdminDepositNotifier;
