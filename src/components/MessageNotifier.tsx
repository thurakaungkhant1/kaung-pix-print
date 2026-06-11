import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { toast } from "sonner";

/**
 * Global in-app listener for new chat messages.
 * Shows a sonner toast + browser notification when a message arrives
 * for the current user, unless they are already viewing that thread.
 */
const MessageNotifier = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { notifyNewMessage } = usePushNotifications();
  const locationRef = useRef(location.pathname);

  useEffect(() => {
    locationRef.current = location.pathname;
  }, [location.pathname]);

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

          // confirm this conversation belongs to current user
          const { data: conv } = await supabase
            .from("conversations")
            .select("id, participant1_id, participant2_id")
            .eq("id", m.conversation_id)
            .maybeSingle();
          if (!conv) return;
          const isMine = conv.participant1_id === user.id || conv.participant2_id === user.id;
          if (!isMine) return;

          // Skip notifying if user is already viewing this thread
          if (locationRef.current === `/messages/${m.conversation_id}`) return;

          const { data: prof } = await supabase
            .from("profiles")
            .select("name")
            .eq("id", m.sender_id)
            .maybeSingle();
          const name = prof?.name || "Someone";
          const preview = (m.content || "").slice(0, 80);
          const isMention = /@me\b|@you\b/i.test(m.content || "");

          toast(`${isMention ? "🔔 " : "💬 "}${name}`, {
            description: preview,
            action: {
              label: "Open",
              onClick: () => navigate(`/messages/${m.conversation_id}`),
            },
          });
          notifyNewMessage(name, preview);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, navigate, notifyNewMessage]);

  return null;
};

export default MessageNotifier;
