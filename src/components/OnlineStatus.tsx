import { useEffect, useState } from "react";
import { useOnlineUsers } from "@/contexts/OnlineUsersContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface OnlineStatusProps {
  userId: string;
  showLabel?: boolean;
  size?: "sm" | "md";
}

const OnlineStatus = ({ userId, showLabel = true, size = "md" }: OnlineStatusProps) => {
  const { isUserOnline, getUserLastActive } = useOnlineUsers();
  const [isActiveVisible, setIsActiveVisible] = useState(true);
  
  const online = isUserOnline(userId) && isActiveVisible;
  const lastActive = getUserLastActive(userId);

  // Check if user has active status visibility enabled
  useEffect(() => {
    const checkActiveVisibility = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("is_active_visible")
        .eq("id", userId)
        .single();

      if (data) {
        setIsActiveVisible(data.is_active_visible ?? true);
      }
    };

    checkActiveVisibility();
  }, [userId]);

  const dotSize = size === "sm" ? "w-2 h-2" : "w-2.5 h-2.5";
  const textSize = size === "sm" ? "text-[10px]" : "text-xs";

  const getLastSeenText = () => {
    if (!isActiveVisible) return "Offline";
    if (!lastActive) return "Offline";
    try {
      return formatDistanceToNow(new Date(lastActive), { addSuffix: true });
    } catch {
      return "Offline";
    }
  };

  return (
    <div className="flex items-center gap-1.5">
      <span
        className={cn(
          "rounded-full flex-shrink-0",
          dotSize,
          online ? "bg-green-500 animate-pulse" : "bg-muted-foreground/40"
        )}
      />
      {showLabel && (
        <span className={cn(textSize, "text-muted-foreground")}>
          {online ? "Active Now" : getLastSeenText()}
        </span>
      )}
    </div>
  );
};

export default OnlineStatus;
