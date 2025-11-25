import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";

interface OnlineUsersContextType {
  onlineCount: number;
  onlineUserIds: Set<string>;
  isUserOnline: (userId: string) => boolean;
}

const OnlineUsersContext = createContext<OnlineUsersContextType | undefined>(undefined);

export const OnlineUsersProvider = ({ children }: { children: ReactNode }) => {
  const [onlineCount, setOnlineCount] = useState(0);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
  const { user } = useAuth();

  const isUserOnline = (userId: string) => onlineUserIds.has(userId);

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
      
      // Extract user IDs from presence state
      Object.values(state).forEach((presences: any) => {
        presences.forEach((presence: any) => {
          if (presence.user_id) {
            userIds.add(presence.user_id);
          }
        });
      });
      
      setOnlineCount(count);
      setOnlineUserIds(userIds);
    };

    channel
      .on("presence", { event: "sync" }, updatePresenceState)
      .on("presence", { event: "join" }, updatePresenceState)
      .on("presence", { event: "leave" }, updatePresenceState)
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
    <OnlineUsersContext.Provider value={{ onlineCount, onlineUserIds, isUserOnline }}>
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
