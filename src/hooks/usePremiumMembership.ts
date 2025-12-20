import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface PremiumMembership {
  id: string;
  user_id: string;
  is_active: boolean;
  started_at: string;
  expires_at: string;
  total_chat_points_earned: number;
  created_at: string;
  updated_at: string;
}

export const usePremiumMembership = () => {
  const { user } = useAuth();
  const [membership, setMembership] = useState<PremiumMembership | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false);

  const loadMembership = useCallback(async () => {
    if (!user) {
      setMembership(null);
      setIsPremium(false);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("premium_memberships")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error loading membership:", error);
        return;
      }

      if (data) {
        setMembership(data as PremiumMembership);
        // Check if membership is active and not expired
        const isActive = data.is_active && new Date(data.expires_at) > new Date();
        setIsPremium(isActive);
      } else {
        setMembership(null);
        setIsPremium(false);
      }
    } catch (error) {
      console.error("Error loading membership:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadMembership();

    if (!user) return;

    // Subscribe to changes
    const channel = supabase
      .channel(`premium-membership-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "premium_memberships",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          loadMembership();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, loadMembership]);

  const activatePremium = async (durationMonths: number = 3) => {
    if (!user) return { error: "Not authenticated" };

    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + durationMonths);

    const { data, error } = await supabase
      .from("premium_memberships")
      .upsert({
        user_id: user.id,
        is_active: true,
        started_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
        total_chat_points_earned: membership?.total_chat_points_earned || 0,
      })
      .select()
      .single();

    if (error) {
      console.error("Error activating premium:", error);
      return { error: error.message };
    }

    setMembership(data as PremiumMembership);
    setIsPremium(true);
    return { data };
  };

  const addChatPoints = async (points: number) => {
    if (!user || !membership) return { error: "No membership" };

    const { error } = await supabase
      .from("premium_memberships")
      .update({
        total_chat_points_earned: membership.total_chat_points_earned + points,
      })
      .eq("user_id", user.id);

    if (error) {
      console.error("Error adding chat points:", error);
      return { error: error.message };
    }

    // Also update user's total points
    const { data: profile } = await supabase
      .from("profiles")
      .select("points")
      .eq("id", user.id)
      .single();

    if (profile) {
      await supabase
        .from("profiles")
        .update({ points: profile.points + points })
        .eq("id", user.id);
    }

    // Create point transaction
    await supabase.from("point_transactions").insert({
      user_id: user.id,
      amount: points,
      transaction_type: "chat_reward",
      description: `Earned ${points} points for 1 minute of chatting (Premium)`,
    });

    loadMembership();
    return { success: true };
  };

  const getDaysRemaining = () => {
    if (!membership || !isPremium) return 0;
    const now = new Date();
    const expires = new Date(membership.expires_at);
    const diff = expires.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  return {
    membership,
    loading,
    isPremium,
    activatePremium,
    addChatPoints,
    getDaysRemaining,
    refreshMembership: loadMembership,
  };
};
