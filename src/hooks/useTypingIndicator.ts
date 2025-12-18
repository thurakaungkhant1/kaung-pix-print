import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

interface UseTypingIndicatorProps {
  conversationId: string | null;
  userId: string | undefined;
  recipientId: string | undefined;
}

export const useTypingIndicator = ({
  conversationId,
  userId,
  recipientId,
}: UseTypingIndicatorProps) => {
  const [isRecipientTyping, setIsRecipientTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Set up channel subscription
  useEffect(() => {
    if (!conversationId || !userId || !recipientId) return;

    const channel = supabase.channel(`typing-${conversationId}`);
    channelRef.current = channel;

    channel
      .on("broadcast", { event: "typing" }, (payload) => {
        if (payload.payload.userId === recipientId) {
          setIsRecipientTyping(true);

          // Clear previous timeout
          if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
          }

          // Set timeout to hide typing indicator after 3 seconds of no typing
          typingTimeoutRef.current = setTimeout(() => {
            setIsRecipientTyping(false);
          }, 3000);
        }
      })
      .on("broadcast", { event: "stop_typing" }, (payload) => {
        if (payload.payload.userId === recipientId) {
          setIsRecipientTyping(false);
          if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
          }
        }
      })
      .subscribe();

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      supabase.removeChannel(channel);
    };
  }, [conversationId, userId, recipientId]);

  // Broadcast typing status
  const sendTypingStatus = useCallback(() => {
    if (!channelRef.current || !userId) return;

    channelRef.current.send({
      type: "broadcast",
      event: "typing",
      payload: { userId },
    });
  }, [userId]);

  // Broadcast stop typing
  const sendStopTyping = useCallback(() => {
    if (!channelRef.current || !userId) return;

    channelRef.current.send({
      type: "broadcast",
      event: "stop_typing",
      payload: { userId },
    });
  }, [userId]);

  return {
    isRecipientTyping,
    sendTypingStatus,
    sendStopTyping,
  };
};
