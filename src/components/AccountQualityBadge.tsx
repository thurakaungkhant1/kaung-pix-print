import { cn } from "@/lib/utils";
import { Shield, AlertTriangle, Ban, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface AccountQualityBadgeProps {
  status: string;
  showCard?: boolean;
}

const STATUS_CONFIG = {
  good: {
    label: "Good Standing",
    description: "Your account is in good standing with no issues.",
    icon: CheckCircle,
    color: "text-green-500",
    bgColor: "bg-green-500/10",
    borderColor: "border-green-500/20",
  },
  warning: {
    label: "Warning",
    description: "Your account has received a warning. Please follow community guidelines.",
    icon: AlertTriangle,
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/20",
  },
  temporary_ban: {
    label: "Restricted",
    description: "Your account is temporarily restricted due to policy violations.",
    icon: Ban,
    color: "text-destructive",
    bgColor: "bg-destructive/10",
    borderColor: "border-destructive/20",
  },
};

const AccountQualityBadge = ({ status, showCard = true }: AccountQualityBadgeProps) => {
  const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.good;
  const Icon = config.icon;

  if (!showCard) {
    return (
      <div className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium", config.bgColor, config.color)}>
        <Icon className="h-3.5 w-3.5" />
        {config.label}
      </div>
    );
  }

  return (
    <Card className={cn("premium-card border-2", config.borderColor)}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <div className={cn("p-2 rounded-xl", config.bgColor)}>
            <Shield className={cn("h-5 w-5", config.color)} />
          </div>
          Account Quality
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-3">
          <div className={cn("p-3 rounded-full", config.bgColor)}>
            <Icon className={cn("h-6 w-6", config.color)} />
          </div>
          <div className="flex-1">
            <p className={cn("font-semibold", config.color)}>{config.label}</p>
            <p className="text-sm text-muted-foreground">{config.description}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AccountQualityBadge;