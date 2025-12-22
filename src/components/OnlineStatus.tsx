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

  const dotSize = size === "sm" ? "w-2.5 h-2.5" : "w-3 h-3";
  const textSize = size === "sm" ? "text-[11px]" : "text-xs";

  const getLastSeenText = () => {
    if (!isActiveVisible) return "Offline";
    if (!lastActive) return "Offline";
    try {
      return formatDistanceToNow(new Date(lastActive), { addSuffix: true });
    } catch {
      return "Offline";
    }
  };

  // For header avatar style (no label) - absolute positioned dot
  if (!showLabel) {
    return (
      <span
        className={cn(
          "absolute bottom-0 right-0 rounded-full border-2 border-white dark:border-slate-900 flex-shrink-0",
          dotSize,
          online 
            ? "bg-emerald-500 animate-online-glow" 
            : "bg-slate-400 dark:bg-slate-600"
        )}
      />
    );
  }

  return (
    <span className={cn(
      textSize, 
      "font-medium",
      online ? "text-emerald-500" : "text-muted-foreground"
    )}>
      {online ? "Active Now" : getLastSeenText()}
    </span>
  );
};

export default OnlineStatus;
