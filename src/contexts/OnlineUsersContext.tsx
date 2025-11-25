import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";

interface UserPresence {
  userId: string;
  lastActive: string;
}

interface OnlineUsersContextType {
  onlineCount: number;
  onlineUserIds: Set<string>;
  isUserOnline: (userId: string) => boolean;
  getUserLastActive: (userId: string) => string | null;
}

const OnlineUsersContext = createContext<OnlineUsersContextType | undefined>(undefined);

export const OnlineUsersProvider = ({ children }: { children: ReactNode }) => {
  const [onlineCount, setOnlineCount] = useState(0);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
  const [userPresenceMap, setUserPresenceMap] = useState<Map<string, string>>(new Map());
  const { user } = useAuth();

  const isUserOnline = (userId: string) => onlineUserIds.has(userId);
  
  const getUserLastActive = (userId: string): string | null => {
    return userPresenceMap.get(userId) || null;
  };

  useEffect(() => {
    if (!user) {
      setOnlineCount(0);
      setOnlineUserIds(new Set());
      return;
    }

    const channel = supabase.channel("online-users");

    const updatePresenceState = () => {
      const state = channel.presenceState();
      const count = Object.keys(state).length;
      const userIds = new Set<string>();
      const presenceMap = new Map<string, string>(userPresenceMap);
      
      // Extract user IDs and last active timestamps from presence state
      Object.values(state).forEach((presences: any) => {
        presences.forEach((presence: any) => {
          if (presence.user_id) {
            userIds.add(presence.user_id);
            presenceMap.set(presence.user_id, presence.online_at);
          }
        });
      });
      
      setOnlineCount(count);
      setOnlineUserIds(userIds);
      setUserPresenceMap(presenceMap);
    };

    const handleLeave = ({ key, leftPresences }: any) => {
      // Preserve last active time when users leave
      leftPresences.forEach((presence: any) => {
        if (presence.user_id) {
          setUserPresenceMap(prev => {
            const newMap = new Map(prev);
            // Keep the timestamp they had when they left
            if (!newMap.has(presence.user_id)) {
              newMap.set(presence.user_id, presence.online_at);
            }
            return newMap;
          });
        }
      });
    };

    channel
      .on("presence", { event: "sync" }, updatePresenceState)
      .on("presence", { event: "join" }, updatePresenceState)
      .on("presence", { event: "leave" }, ({ key, leftPresences }) => {
        handleLeave({ key, leftPresences });
        updatePresenceState();
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            user_id: user.id,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      channel.unsubscribe();
    };
  }, [user]);

  return (
    <OnlineUsersContext.Provider value={{ onlineCount, onlineUserIds, isUserOnline, getUserLastActive }}>
      {children}
    </OnlineUsersContext.Provider>
  );
};

export const useOnlineUsers = () => {
  const context = useContext(OnlineUsersContext);
  if (context === undefined) {
    throw new Error("useOnlineUsers must be used within an OnlineUsersProvider");
  }
  return context;
};
