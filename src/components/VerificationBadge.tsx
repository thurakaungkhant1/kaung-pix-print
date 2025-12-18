import { BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface VerificationBadgeProps {
  points: number;
  size?: "sm" | "md" | "lg";
  showTooltip?: boolean;
  className?: string;
}

const VERIFICATION_THRESHOLD = 5000;

const VerificationBadge = ({ 
  points, 
  size = "md", 
  showTooltip = true,
  className 
}: VerificationBadgeProps) => {
  if (points < VERIFICATION_THRESHOLD) return null;

  const sizeClasses = {
    sm: "h-3.5 w-3.5",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  };

  return (
    <div 
      className={cn("relative inline-flex items-center", className)}
      title={showTooltip ? `Verified member with ${points.toLocaleString()} points` : undefined}
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
