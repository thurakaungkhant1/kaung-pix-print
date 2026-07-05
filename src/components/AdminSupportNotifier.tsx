import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminCheck } from "@/hooks/useAdminCheck";

/**
 * Realtime listener that alerts admins when a new support / Pending Admin Info
 * request arrives. Plays a soft beep and shows a sonner toast that links to
 * the Support Inbox.
 */
const AdminSupportNotifier = () => {
  const { isAdmin } = useAdminCheck({ redirectOnFail: false });
  const navigate = useNavigate();
  const audioRef = useRef<AudioContext | null>(null);

  const beep = () => {
    try {
      const Ctx = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext | undefined;
      if (!Ctx) return;
      if (!audioRef.current) audioRef.current = new Ctx();
      const ctx = audioRef.current;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = 880;
      g.gain.value = 0.06;
      o.connect(g).connect(ctx.destination);
      o.start();
      o.stop(ctx.currentTime + 0.18);
    } catch {}
  };

  useEffect(() => {
    if (!isAdmin) return;
    const channel = supabase
      .channel("admin-support-notify")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "support_messages" },
        async (payload: any) => {
          const m = payload.new;
          if (!m || m.sender_role !== "user") return;

          let userName = "User";
          const { data: prof } = await supabase
            .from("public_profiles")
            .select("name")
            .eq("id", m.user_id)
            .maybeSingle();
          if (prof?.name) userName = prof.name;

          const isOrderRequest = !!m.order_id;
          const title = isOrderRequest
            ? `🆕 Pending Admin Info from ${userName}`
            : `New support message from ${userName}`;

          beep();
          toast(title, {
            description: (m.body || "").slice(0, 120),
            icon: <Bell className="h-4 w-4" />,
            action: {
              label: "Open",
              onClick: () => navigate("/admin/support"),
            },
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin, navigate]);

  return null;
};

export default AdminSupportNotifier;
