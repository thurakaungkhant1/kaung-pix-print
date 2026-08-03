import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface AppNotification {
  id: string;
  title: string;
  message: string;
  image_url: string | null;
  link_url: string | null;
  action_text: string | null;
  created_at: string;
}

/** Plays a short two-tone chime for new in-app notifications. */
const playChime = () => {
  try {
    const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const now = ctx.currentTime;
    [880, 1320].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, now + i * 0.16);
      gain.gain.exponentialRampToValueAtTime(0.25, now + i * 0.16 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.16 + 0.28);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + i * 0.16);
      osc.stop(now + i * 0.16 + 0.3);
    });
    setTimeout(() => ctx.close().catch(() => {}), 900);
  } catch {
    /* ignore */
  }
};

interface Props {
  className?: string;
  iconClassName?: string;
}

const NotificationBell = ({ className, iconClassName }: Props) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const firstLoad = useRef(true);

  const load = useCallback(async () => {
    const { data } = await (supabase as any)
      .from("notifications")
      .select("id,title,message,image_url,link_url,action_text,created_at")
      .order("created_at", { ascending: false })
      .limit(30);
    setItems((data || []) as AppNotification[]);

    if (user) {
      const { data: reads } = await (supabase as any)
        .from("notification_reads")
        .select("notification_id")
        .eq("user_id", user.id);
      setReadIds(new Set((reads || []).map((r: any) => r.notification_id)));
    }
    firstLoad.current = false;
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  // Realtime: new admin notifications arrive with a sound + toast
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`app-notifications-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        (payload: any) => {
          const n = payload.new;
          if (!n) return;
          if (n.target_type !== "all" && n.target_user_id !== user.id) return;
          setItems((prev) => [n as AppNotification, ...prev]);
          playChime();
          toast(n.title, { description: n.message });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const unread = items.filter((n) => !readIds.has(n.id));

  const markAllRead = async () => {
    if (!user || unread.length === 0) return;
    const rows = unread.map((n) => ({ notification_id: n.id, user_id: user.id }));
    setReadIds(new Set(items.map((n) => n.id)));
    await (supabase as any).from("notification_reads").insert(rows);
  };

  const handleOpen = (v: boolean) => {
    setOpen(v);
    if (v) markAllRead();
  };

  return (
    <>
      <button
        onClick={() => handleOpen(true)}
        className={cn(
          "relative w-10 h-10 rounded-xl bg-muted/70 border border-border/60 flex items-center justify-center hover:bg-muted transition-colors",
          className
        )}
        aria-label="Notifications"
      >
        <Bell className={cn("h-[18px] w-[18px] text-foreground", iconClassName)} />
        {unread.length > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
            {unread.length > 9 ? "9+" : unread.length}
          </span>
        )}
      </button>

      <Sheet open={open} onOpenChange={handleOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
          <SheetHeader className="p-4 border-b border-border/60">
            <SheetTitle className="text-base font-display">Notifications</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {items.length === 0 && (
              <div className="text-center py-16">
                <Bell className="h-10 w-10 mx-auto text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground mt-3">No notifications yet</p>
              </div>
            )}
            {items.map((n) => (
              <div
                key={n.id}
                className="rounded-2xl border border-border/60 bg-card p-3 space-y-2"
              >
                {n.image_url && (
                  <img
                    src={n.image_url}
                    alt={n.title}
                    loading="lazy"
                    className="w-full h-32 object-cover rounded-xl"
                  />
                )}
                <div>
                  <p className="text-sm font-bold leading-tight">{n.title}</p>
                  <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{n.message}</p>
                  <p className="text-[10px] text-muted-foreground/70 mt-1.5">
                    {new Date(n.created_at).toLocaleString()}
                  </p>
                </div>
                {n.link_url && (
                  <Button
                    size="sm"
                    className="h-8 rounded-full text-xs"
                    onClick={() => {
                      setOpen(false);
                      if (n.link_url!.startsWith("http")) window.open(n.link_url!, "_blank");
                      else navigate(n.link_url!);
                    }}
                  >
                    {n.action_text || "Open"}
                  </Button>
                )}
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default NotificationBell;
