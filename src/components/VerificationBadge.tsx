import { BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUserPremiumStatus } from "@/hooks/useUserPremiumStatus";

interface VerificationBadgeProps {
  points: number;
  userId?: string;
  size?: "sm" | "md" | "lg";
  showTooltip?: boolean;
  className?: string;
}

const VERIFICATION_THRESHOLD = 5000;

const VerificationBadge = ({ 
  points, 
  userId,
  size = "md", 
  showTooltip = true,
  className 
}: VerificationBadgeProps) => {
  const { isPremium } = useUserPremiumStatus(userId);
  
  // Show badge if user is premium OR has enough points
  const shouldShow = isPremium || points >= VERIFICATION_THRESHOLD;
  
  if (!shouldShow) return null;

  const sizeClasses = {
    sm: "h-3.5 w-3.5",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  };

  const tooltipText = isPremium 
    ? "Premium Member" 
    : `Verified member with ${points.toLocaleString()} points`;

  return (
    <div 
      className={cn("relative inline-flex items-center", className)}
      title={showTooltip ? tooltipText : undefined}
    >
      <BadgeCheck 
        className={cn(
          sizeClasses[size],
          "text-blue-500 fill-blue-500"
        )} 
      />
    </div>
  );
};

export default VerificationBadge;
export { VERIFICATION_THRESHOLD };
