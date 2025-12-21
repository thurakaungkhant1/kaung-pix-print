import { Crown, Coins } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatPremiumIndicatorProps {
  isPremium: boolean;
  pointsEarned: number;
  elapsedMinutes: number;
}

const ChatPremiumIndicator = ({ isPremium, pointsEarned, elapsedMinutes }: ChatPremiumIndicatorProps) => {
  if (!isPremium) return null;

  return (
    <div className={cn(
      "flex items-center gap-2 px-3 py-1.5 rounded-full",
      "bg-amber-500/10 border border-amber-500/20",
      "animate-fade-in"
    )}>
      <Crown className="h-3.5 w-3.5 text-amber-500" />
      <div className="flex items-center gap-1.5 text-xs">
        <Coins className="h-3 w-3 text-green-500" />
        <span className="font-medium text-amber-600 dark:text-amber-400">
          +{pointsEarned.toFixed(2)}
        </span>
        <span className="text-muted-foreground">
          ({elapsedMinutes}m)
        </span>
      </div>
    </div>
  );
};

export default ChatPremiumIndicator;
