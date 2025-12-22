import { createContext, useContext, useEffect, useRef, ReactNode, useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "react-router-dom";
import { usePushNotifications } from "@/hooks/usePushNotifications";

interface GlobalMessageNotificationContextType {
  isEnabled: boolean;
  setIsEnabled: (enabled: boolean) => void;
}

const GlobalMessageNotificationContext = createContext<GlobalMessageNotificationContextType | undefined>(undefined);

const SOUND_ENABLED_KEY = "chat_sound_notifications_enabled";
const NOTIFICATION_SOUND = "/sounds/message.mp3";

// Cache for sender names to avoid repeated lookups
const senderNameCache = new Map<string, string>();

export const GlobalMessageNotificationProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const location = useLocation();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const subscribedConversationsRef = useRef<Set<string>>(new Set());
  const channelsRef = useRef<ReturnType<typeof supabase.channel>[]>([]);
  const { notifyNewMessage, requestPermission } = usePushNotifications();
  const [isEnabled, setIsEnabled] = useState(() => {
    const stored = localStorage.getItem(SOUND_ENABLED_KEY);
    return stored === null ? true : stored === "true";
  });

  // Request notification permission on mount
  useEffect(() => {
    requestPermission();
  }, [requestPermission]);

  // Initialize audio element
  useEffect(() => {
    audioRef.current = new Audio(NOTIFICATION_SOUND);
    audioRef.current.volume = 0.5;
    
    return () => {
      audioRef.current = null;
    };
  }, []);

  // Update localStorage when enabled state changes
  useEffect(() => {
    localStorage.setItem(SOUND_ENABLED_KEY, String(isEnabled));
  }, [isEnabled]);

  const getSenderName = async (senderId: string): Promise<string> => {
    if (senderNameCache.has(senderId)) {
      return senderNameCache.get(senderId)!;
    }
    
    const { data } = await supabase
      .from("profiles")
      .select("name")
      .eq("id", senderId)
      .single();
    
    const name = data?.name || "Someone";
    senderNameCache.set(senderId, name);
    return name;
  };

  const playNotificationSound = useCallback(() => {
    if (!isEnabled || !audioRef.current) return;
    
    // Don't play if we're currently on a chat page (Chat.tsx handles its own sounds)
    if (location.pathname.startsWith("/chat/")) return;
    
    try {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch((error) => {
        console.log("Audio playback blocked by browser:", error);
      });
    } catch (error) {
      console.error("Error playing notification sound:", error);
    }
  }, [isEnabled, location.pathname]);

  const handleNewMessage = useCallback(async (senderId: string, content?: string) => {
    // Don't notify if on chat page
    if (location.pathname.startsWith("/chat/")) return;
    
    playNotificationSound();
    
    // Get sender name and show push notification
    const senderName = await getSenderName(senderId);
    const preview = content && content.length > 50 ? content.substring(0, 50) + "..." : content;
    notifyNewMessage(senderName, preview);
  }, [location.pathname, playNotificationSound, notifyNewMessage]);

  // Subscribe to all user's conversations for new messages
  useEffect(() => {
    if (!user) return;

    const subscribeToUserConversations = async () => {
      // Get all conversations for this user
      const { data: conversations, error } = await supabase
        .from("conversations")
        .select("id")
        .or(`participant1_id.eq.${user.id},participant2_id.eq.${user.id}`);

      if (error) {
        console.error("Error fetching conversations:", error);
        return;
      }

      if (!conversations || conversations.length === 0) return;

      // Subscribe to new messages in all conversations
      conversations.forEach((conv) => {
        if (subscribedConversationsRef.current.has(conv.id)) return;
        subscribedConversationsRef.current.add(conv.id);

        const channel = supabase
          .channel(`global-messages-${conv.id}`)
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "messages",
              filter: `conversation_id=eq.${conv.id}`,
            },
            (payload) => {
              const newMessage = payload.new as { sender_id: string; content?: string };
              // Only notify for messages from others
              if (newMessage.sender_id !== user.id) {
                handleNewMessage(newMessage.sender_id, newMessage.content);
              }
            }
          )
          .subscribe();

        channelsRef.current.push(channel);
      });
    };

    subscribeToUserConversations();

    // Also subscribe to conversations table for new conversations
    const newConvChannel = supabase
      .channel("global-new-conversations")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "conversations",
        },
        (payload) => {
          const newConv = payload.new as { id: string; participant1_id: string; participant2_id: string };
          // If user is part of this new conversation, subscribe to it
          if (newConv.participant1_id === user.id || newConv.participant2_id === user.id) {
            if (!subscribedConversationsRef.current.has(newConv.id)) {
              subscribedConversationsRef.current.add(newConv.id);
              
              const channel = supabase
                .channel(`global-messages-${newConv.id}`)
                .on(
                  "postgres_changes",
                  {
                    event: "INSERT",
                    schema: "public",
                    table: "messages",
                    filter: `conversation_id=eq.${newConv.id}`,
                  },
                  (payload) => {
                    const newMessage = payload.new as { sender_id: string; content?: string };
                    if (newMessage.sender_id !== user.id) {
                      handleNewMessage(newMessage.sender_id, newMessage.content);
                    }
                  }
                )
                .subscribe();

              channelsRef.current.push(channel);
            }
          }
        }
      )
      .subscribe();

    channelsRef.current.push(newConvChannel);

    return () => {
      channelsRef.current.forEach((channel) => {
        supabase.removeChannel(channel);
      });
      channelsRef.current = [];
      subscribedConversationsRef.current.clear();
    };
  }, [user, handleNewMessage]);

  return (
    <GlobalMessageNotificationContext.Provider value={{ isEnabled, setIsEnabled }}>
      {children}
    </GlobalMessageNotificationContext.Provider>
  );
};

export const useGlobalMessageNotification = () => {
  const context = useContext(GlobalMessageNotificationContext);
  if (context === undefined) {
    throw new Error("useGlobalMessageNotification must be used within a GlobalMessageNotificationProvider");
  }
  return context;
};
