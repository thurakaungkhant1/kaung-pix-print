import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const MINUTE_IN_MS = 60 * 1000;

interface UseChatPointsTimerProps {
  isPremium: boolean;
  conversationId: string | null;
  isActive: boolean; // Whether user is actively in chat
}

export const useChatPointsTimer = ({ 
  isPremium, 
  conversationId, 
  isActive 
}: UseChatPointsTimerProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [elapsedMinutes, setElapsedMinutes] = useState(0);
  const [totalPointsEarned, setTotalPointsEarned] = useState(0);
  const [pointsPerMinute, setPointsPerMinute] = useState(0.01);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  // Load user's premium tier points rate
  useEffect(() => {
    const loadPremiumTier = async () => {
      if (!user || !isPremium) {
        setPointsPerMinute(0.01);
        return;
      }

      const { data: membership } = await supabase
        .from("premium_memberships")
        .select("points_per_minute")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();

      if (membership) {
        setPointsPerMinute(Number(membership.points_per_minute) || 0.01);
      }
    };

    loadPremiumTier();
  }, [user, isPremium]);

  const awardPoints = useCallback(async () => {
    if (!user || !isPremium) return;

    try {
      // Update user points
      const { data: profile } = await supabase
        .from("profiles")
        .select("points")
        .eq("id", user.id)
        .single();

      if (profile) {
        const newPoints = profile.points + pointsPerMinute;
        await supabase
          .from("profiles")
          .update({ points: newPoints })
          .eq("id", user.id);
      }

      // Update premium membership stats
      const { data: membership } = await supabase
        .from("premium_memberships")
        .select("total_chat_points_earned")
        .eq("user_id", user.id)
        .single();

      if (membership) {
        await supabase
          .from("premium_memberships")
          .update({
            total_chat_points_earned: Number(membership.total_chat_points_earned) + pointsPerMinute,
          })
          .eq("user_id", user.id);
      }

      // Create point transaction
      await supabase.from("point_transactions").insert({
        user_id: user.id,
        amount: pointsPerMinute,
        transaction_type: "chat_reward",
        description: `Earned ${pointsPerMinute} points for 1 minute of chatting (Premium)`,
      });

      setTotalPointsEarned((prev) => prev + pointsPerMinute);
      setElapsedMinutes((prev) => prev + 1);

      // Show toast notification
      toast({
        title: "🎉 Points Earned!",
        description: `You earned ${pointsPerMinute} points for 1 minute of chatting!`,
        duration: 3000,
      });
    } catch (error) {
      console.error("Error awarding chat points:", error);
    }
  }, [user, isPremium, pointsPerMinute, toast]);

  useEffect(() => {
    // Clear any existing timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Only start timer if all conditions are met
    if (!isPremium || !conversationId || !isActive || !user) {
      return;
    }

    // Reset elapsed time when conversation changes
    setElapsedMinutes(0);
    setTotalPointsEarned(0);
    lastActivityRef.current = Date.now();

    // Start the 1-minute interval timer
    timerRef.current = setInterval(() => {
      // Check if user was active in the last minute
      const timeSinceActivity = Date.now() - lastActivityRef.current;
      if (timeSinceActivity <= MINUTE_IN_MS * 2) {
        // User was active within last 2 minutes, award points
        awardPoints();
      }
    }, MINUTE_IN_MS);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isPremium, conversationId, isActive, user, awardPoints]);

  // Function to update activity timestamp
  const recordActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  return {
    elapsedMinutes,
    totalPointsEarned,
    recordActivity,
    pointsPerMinute,
  };
};