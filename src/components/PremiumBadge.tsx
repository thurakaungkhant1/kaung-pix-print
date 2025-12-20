import { Crown, BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface PremiumBadgeProps {
  isPremium: boolean;
  showVerified?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const PremiumBadge = ({ isPremium, showVerified = false, size = "md", className }: PremiumBadgeProps) => {
  if (!isPremium) return null;

  const sizeClasses = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  };

  if (showVerified) {
    return (
      <BadgeCheck
        className={cn(
          sizeClasses[size],
          "text-blue-500 fill-blue-500/20",
          className
        )}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex items-center gap-1 px-2 py-0.5 rounded-full",
        "bg-gradient-to-r from-amber-500/20 to-yellow-500/20",
        "border border-amber-500/30",
        className
      )}
    >
      <Crown className={cn(sizeClasses[size], "text-amber-500")} />
      <span className={cn(
        "font-semibold text-amber-500",
        size === "sm" && "text-xs",
        size === "md" && "text-xs",
        size === "lg" && "text-sm"
      )}>
        Premium
      </span>
    </div>
  );
};

export default PremiumBadge;
