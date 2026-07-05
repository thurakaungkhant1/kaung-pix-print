import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { toast } from "sonner";

/**
 * Global in-app listener for new chat messages.
 * - Plain in-app toast when foregrounded.
 * - SW notification (works while tab is in background) when the page is hidden.
 * - Honors per-conversation mention toggle stored in localStorage.
 * - Skips messages from users the current user has blocked.
 *
 * Note: True closed-app push requires VAPID + a push server (FCM). The included
 * /notification-sw.js is set up to receive `push` events when that is added.
 */
const MessageNotifier = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { notifyNewMessage, isEnabled } = usePushNotifications();
  const locationRef = useRef(location.pathname);
  const swRef = useRef<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    locationRef.current = location.pathname;
  }, [location.pathname]);

  // Register background notification service worker
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    // Avoid registering inside Lovable iframe preview
    const host = window.location.hostname;
    const inPreview =
      host.startsWith("id-preview--") ||
      host.startsWith("preview--") ||
      host.endsWith(".lovableproject.com") ||
      window.self !== window.top;
    if (inPreview) return;
    navigator.serviceWorker
      .register("/notification-sw.js", { scope: "/" })
      .then((reg) => {
        swRef.current = reg;
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`global-msg-notify-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        async (payload: any) => {
          const m = payload.new;
          if (!m || m.sender_id === user.id) return;

          const { data: conv } = await supabase
            .from("conversations")
            .select("id, participant1_id, participant2_id")
            .eq("id", m.conversation_id)
            .maybeSingle();
          if (!conv) return;
          const isMine = conv.participant1_id === user.id || conv.participant2_id === user.id;
          if (!isMine) return;

          // Skip if blocked
          const { data: blocked } = await supabase
            .from("blocked_users")
            .select("id")
            .eq("blocker_id", user.id)
            .eq("blocked_id", m.sender_id)
            .maybeSingle();
          if (blocked) return;

          // Skip if already viewing
          if (locationRef.current === `/messages/${m.conversation_id}`) return;

          const { data: prof } = await supabase
            .from("public_profiles")
            .select("name")
            .eq("id", m.sender_id)
            .maybeSingle();
          const name = prof?.name || "Someone";
          const preview = (m.content || "").slice(0, 80);
          const isMention = /@me\b|@you\b/i.test(m.content || "");

          // Mention toggle stored per conversation peer
          if (isMention) {
            const mentionPref = localStorage.getItem(`chat_mentions_${user.id}_${m.sender_id}`);
            if (mentionPref === "false") return;
          }

          // In-app toast (always)
          toast(`${isMention ? "🔔 " : "💬 "}${name}`, {
            description: preview,
            action: {
              label: "Open",
              onClick: () => navigate(`/messages/${m.conversation_id}`),
            },
          });

          // Background / OS-level notification when tab is hidden
          const hidden = typeof document !== "undefined" && document.hidden;
          if (hidden && isEnabled()) {
            const reg = swRef.current;
            if (reg && reg.active) {
              reg.active.postMessage({
                type: "SHOW_NOTIFICATION",
                payload: {
                  title: `${isMention ? "🔔 " : ""}${name}`,
                  body: preview,
                  tag: `chat-${m.conversation_id}`,
                  url: `/messages/${m.conversation_id}`,
                },
              });
            } else {
              notifyNewMessage(name, preview);
            }
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, navigate, notifyNewMessage, isEnabled]);

  return null;
};

export default MessageNotifier;
