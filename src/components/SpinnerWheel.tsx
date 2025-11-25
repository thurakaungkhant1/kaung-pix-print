import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Gift } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface SpinnerWheelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPointsWon: (points: number) => void;
}

const SpinnerWheel = ({ open, onOpenChange, onPointsWon }: SpinnerWheelProps) => {
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [canSpin, setCanSpin] = useState(true);
  const [lastSpinDate, setLastSpinDate] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (open && user) {
      checkSpinStatus();
    }
  }, [open, user]);

  const checkSpinStatus = async () => {
    if (!user) return;

    const today = new Date().toISOString().split("T")[0];
    
    const { data } = await supabase
      .from("spinner_spins")
      .select("spin_date")
      .eq("user_id", user.id)
      .eq("spin_date", today)
      .maybeSingle();

    if (data) {
      setCanSpin(false);
      setLastSpinDate(data.spin_date);
    } else {
      setCanSpin(true);
    }
  };

  const handleSpin = async () => {
    if (!user || !canSpin || spinning) return;

    setSpinning(true);

    // Calculate rotation (multiple full spins + random landing position for visual effect)
    const baseRotation = 360 * 5; // 5 full spins
    const randomSegment = Math.floor(Math.random() * 15) + 1;
    const segmentAngle = 360 / 15;
    const targetAngle = (15 - randomSegment) * segmentAngle;
    const finalRotation = rotation + baseRotation + targetAngle;

    setRotation(finalRotation);

    // Wait for animation to complete
    setTimeout(async () => {
      const today = new Date().toISOString().split("T")[0];

      // Check how many points already earned from spins today
      const { data: todaySpins } = await supabase
        .from("spinner_spins")
        .select("points_won")
        .eq("user_id", user.id)
        .eq("spin_date", today);

      const todaySpinPoints = todaySpins?.reduce((sum, spin) => sum + spin.points_won, 0) || 0;
      
      // Calculate points to award - max 5 per day total from spins
      const maxDailySpinPoints = 5;
      const remainingPoints = Math.max(0, maxDailySpinPoints - todaySpinPoints);
      
      // Determine if this spin wins (segments 1-5)
      const isWinningSegment = randomSegment >= 1 && randomSegment <= 5;
      const pointsWon = isWinningSegment ? Math.min(remainingPoints, 5) : 0;

      // Record spin
      const { error: spinError } = await supabase
        .from("spinner_spins")
        .insert({
          user_id: user.id,
          spin_date: today,
          points_won: pointsWon,
        });

      if (spinError) {
        toast({
          title: "Error",
          description: "Failed to record spin",
          variant: "destructive",
        });
        setSpinning(false);
        return;
      }

      // Add transaction and update points only if points were won
      if (pointsWon > 0) {
        await supabase.from("point_transactions").insert({
          user_id: user.id,
          amount: pointsWon,
          transaction_type: "spin",
          description: `Won ${pointsWon} points from daily spinner`,
        });

        // Update user points
        const { data: profile } = await supabase
          .from("profiles")
          .select("points")
          .eq("id", user.id)
          .single();

        if (profile) {
          await supabase
            .from("profiles")
            .update({ points: profile.points + pointsWon })
            .eq("id", user.id);
        }
      }

      onPointsWon(pointsWon);
      setCanSpin(false);
      setSpinning(false);
      setLastSpinDate(today);
      
      // Show confirmation dialog
      setTimeout(() => {
        if (pointsWon > 0) {
          toast({
            title: "Congratulations! 🎉",
            description: `You have been awarded ${pointsWon} points!`,
            duration: 5000,
          });
        } else if (isWinningSegment && remainingPoints === 0) {
          toast({
            title: "Daily Limit Reached",
            description: "You've already earned the maximum 5 points from spins today. Try again tomorrow!",
            duration: 5000,
          });
        } else {
          toast({
            title: "Better luck tomorrow!",
            description: "You didn't win points this time. Try again tomorrow!",
            duration: 5000,
          });
        }
      }, 100);
    }, 4000);
  };

  const getTimeUntilNextSpin = () => {
    if (!lastSpinDate) return "";
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const diff = tomorrow.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5" />
            Daily Spinner Wheel
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="relative flex items-center justify-center">
            <div className="relative w-64 h-64">
              {/* Spinner wheel */}
              <div
                className="w-full h-full rounded-full border-8 border-primary relative overflow-hidden transition-transform duration-[4000ms] ease-out"
                style={{
                  transform: `rotate(${rotation}deg)`,
                  background: "conic-gradient(from 0deg, hsl(var(--primary)) 0%, hsl(var(--primary-glow)) 20%, hsl(var(--primary)) 40%, hsl(var(--primary-glow)) 60%, hsl(var(--primary)) 80%, hsl(var(--primary-glow)) 100%)",
                }}
              >
                {/* Segments */}
                {Array.from({ length: 15 }).map((_, i) => (
                  <div
                    key={i}
                    className="absolute top-1/2 left-1/2 origin-top-left text-sm text-primary-foreground font-bold"
                    style={{
                      transform: `rotate(${i * (360 / 15)}deg) translateX(5.5rem)`,
                      width: "2rem",
                    }}
                  >
                    {i + 1}
                  </div>
                ))}
              </div>

              {/* Center circle */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-background border-4 border-primary rounded-full flex items-center justify-center">
                <Gift className="h-6 w-6 text-primary" />
              </div>

              {/* Pointer */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 w-0 h-0 border-l-[12px] border-r-[12px] border-t-[20px] border-l-transparent border-r-transparent border-t-primary z-10" />
            </div>
          </div>

          <div className="text-center space-y-4">
            {canSpin ? (
              <>
                <p className="text-sm text-muted-foreground">
                  Spin the wheel daily! Land on segments 1-5 to win 15 points!
                </p>
                <Button
                  onClick={handleSpin}
                  disabled={spinning}
                  className="w-full"
                  size="lg"
                >
                  {spinning ? "Spinning..." : "Spin Now!"}
                </Button>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  You've already spun today. Come back tomorrow!
                </p>
                <p className="text-xs text-muted-foreground">
                  Next spin available in: {getTimeUntilNextSpin()}
                </p>
                <Button
                  onClick={() => {
                    onOpenChange(false);
                    navigate("/");
                  }}
                  className="w-full mt-4"
                  size="lg"
                  variant="default"
                >
                  Show More Point
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SpinnerWheel;
