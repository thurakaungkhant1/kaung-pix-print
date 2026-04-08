import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Bell, ExternalLink, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface Notification {
  id: string;
  title: string;
  message: string;
  image_url: string | null;
  link_url: string | null;
  action_text: string | null;
  created_at: string;
}

const NotificationDialog = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadUnreadNotifications();
      subscribeToNotifications();
    }
  }, [user]);

  const loadUnreadNotifications = async () => {
    if (!user) return;

    // Get read notification IDs
    const { data: reads } = await supabase
      .from("notification_reads")
      .select("notification_id")
      .eq("user_id", user.id);

    const readIds = reads?.map((r) => r.notification_id) || [];

    // Get all notifications for this user
    const { data: notifs } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10);

    if (notifs) {
      const unread = notifs.filter((n) => !readIds.includes(n.id));
      if (unread.length > 0) {
        setNotifications(unread);
        setCurrentIndex(0);
        setOpen(true);
      }
    }
  };

  const subscribeToNotifications = () => {
    if (!user) return;

    const channel = supabase
      .channel("user-notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        (payload) => {
          const newNotif = payload.new as Notification;
          setNotifications((prev) => [newNotif, ...prev]);
          setCurrentIndex(0);
          setOpen(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const markAsRead = async (notifId: string) => {
    if (!user) return;
    await supabase.from("notification_reads").insert({
      notification_id: notifId,
      user_id: user.id,
    });
  };

  const handleClose = () => {
    // Mark all shown as read
    notifications.forEach((n) => markAsRead(n.id));
    setOpen(false);
    setNotifications([]);
  };

  const handleNext = () => {
    markAsRead(notifications[currentIndex].id);
    if (currentIndex < notifications.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      handleClose();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) setCurrentIndex((prev) => prev - 1);
  };

  if (notifications.length === 0) return null;

  const current = notifications[currentIndex];

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-sm p-0 overflow-hidden rounded-2xl border-border/50">
        {/* Header with gradient */}
        <div className="relative bg-gradient-to-br from-primary/90 to-primary p-5 pb-4">
          <div className="absolute inset-0 bg-grid-white/5" />
          <div className="absolute top-2 right-2 w-20 h-20 bg-white/10 rounded-full blur-2xl" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 rounded-lg bg-white/20 backdrop-blur-sm">
                <Bell className="h-4 w-4 text-white" />
              </div>
              {notifications.length > 1 && (
                <span className="text-xs text-white/70 ml-auto">
                  {currentIndex + 1} / {notifications.length}
                </span>
              )}
            </div>
            <h3 className="text-lg font-bold text-white leading-tight">
              {current.title}
            </h3>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={current.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {current.image_url && (
                <div className="w-full h-40 rounded-xl overflow-hidden mb-4 bg-muted">
                  <img
                    src={current.image_url}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {current.message}
              </p>
            </motion.div>
          </AnimatePresence>

          {current.link_url && (
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => window.open(current.link_url!, "_blank")}
            >
              <ExternalLink className="h-4 w-4" />
              {current.action_text || "Open Link"}
            </Button>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 pt-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="gap-1"
          >
            <ChevronLeft className="h-4 w-4" /> Prev
          </Button>
          <Button
            size="sm"
            onClick={handleNext}
            className="gap-1"
          >
            {currentIndex < notifications.length - 1 ? (
              <>Next <ChevronRight className="h-4 w-4" /></>
            ) : (
              "Got it!"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NotificationDialog;
