import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Crown, BadgeCheck, Edit3, Coins, Sparkles, Loader2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePremiumMembership } from "@/hooks/usePremiumMembership";
import { useToast } from "@/hooks/use-toast";

interface PremiumFeaturesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PREMIUM_BENEFITS = [
  {
    icon: BadgeCheck,
    title: "Verified Blue Mark",
    description: "Stand out with a verified badge next to your name for 3 months",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  {
    icon: Edit3,
    title: "Custom Name Change",
    description: "Ability to change your display name anytime",
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
  },
  {
    icon: Coins,
    title: "Passive Point Earning",
    description: "Earn 0.01 points per minute while actively chatting",
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
  },
];

const PremiumFeaturesDialog = ({ open, onOpenChange }: PremiumFeaturesDialogProps) => {
  const { isPremium, membership, activatePremium, getDaysRemaining, loading } = usePremiumMembership();
  const [activating, setActivating] = useState(false);
  const { toast } = useToast();

  const handleActivate = async () => {
    setActivating(true);
    const result = await activatePremium(3);
    setActivating(false);

    if (result.error) {
      toast({
        title: "Error",
        description: result.error,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Premium Activated! 🎉",
        description: "Welcome to Premium! Enjoy your exclusive benefits.",
      });
      onOpenChange(false);
    }
  };

  const daysRemaining = getDaysRemaining();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-center mb-2">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-amber-500/30 to-yellow-500/30 rounded-full blur-xl animate-pulse" />
              <div className="relative p-4 rounded-full bg-gradient-to-br from-amber-500/20 to-yellow-500/20 border border-amber-500/30">
                <Crown className="h-8 w-8 text-amber-500" />
              </div>
            </div>
          </div>
          <DialogTitle className="text-center text-xl">
            {isPremium ? "Your Premium Status" : "Upgrade to Premium"}
          </DialogTitle>
          <DialogDescription className="text-center">
            {isPremium
              ? `${daysRemaining} days remaining • Expires ${new Date(membership?.expires_at || "").toLocaleDateString()}`
              : "Unlock exclusive features and earn more points"}
          </DialogDescription>
        </DialogHeader>

        {isPremium && membership && (
          <div className="bg-gradient-to-r from-amber-500/10 to-yellow-500/10 rounded-xl p-4 border border-amber-500/20 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Chat Points Earned</p>
                <p className="text-2xl font-bold text-amber-500">
                  {Number(membership.total_chat_points_earned).toFixed(2)}
                </p>
              </div>
              <CheckCircle2 className="h-10 w-10 text-green-500" />
            </div>
          </div>
        )}

        <div className="space-y-3">
          {PREMIUM_BENEFITS.map((benefit, index) => (
            <div
              key={index}
              className={cn(
                "flex items-start gap-3 p-3 rounded-xl",
                "bg-muted/50 hover:bg-muted transition-colors"
              )}
            >
              <div className={cn("p-2 rounded-lg", benefit.bgColor)}>
                <benefit.icon className={cn("h-5 w-5", benefit.color)} />
              </div>
              <div className="flex-1">
                <h4 className="font-medium">{benefit.title}</h4>
                <p className="text-sm text-muted-foreground">{benefit.description}</p>
              </div>
              {isPremium && (
                <CheckCircle2 className="h-5 w-5 text-green-500 mt-1" />
              )}
            </div>
          ))}
        </div>

        {!isPremium && (
          <Button
            className={cn(
              "w-full mt-4 h-12",
              "bg-gradient-to-r from-amber-500 to-yellow-500",
              "hover:from-amber-600 hover:to-yellow-600",
              "text-white font-semibold"
            )}
            onClick={handleActivate}
            disabled={activating || loading}
          >
            {activating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Activating...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Activate Premium (3 Months)
              </>
            )}
          </Button>
        )}

        {isPremium && (
          <div className="flex items-center justify-center gap-2 mt-4 text-sm text-muted-foreground">
            <Badge variant="secondary" className="bg-green-500/10 text-green-500 border-green-500/20">
              Active
            </Badge>
            <span>Premium membership is active</span>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PremiumFeaturesDialog;
