import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface PremiumStatus {
  isPremium: boolean;
  expiresAt: string | null;
}

const premiumCache = new Map<string, { data: PremiumStatus; timestamp: number }>();
const CACHE_TTL = 60000; // 1 minute

export const useUserPremiumStatus = (userId: string | null | undefined) => {
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkPremiumStatus = useCallback(async () => {
    if (!userId) {
      setIsPremium(false);
      setLoading(false);
      return;
    }

    // Check cache first
    const cached = premiumCache.get(userId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      setIsPremium(cached.data.isPremium);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("premium_memberships")
        .select("is_active, expires_at")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        console.error("Error checking premium status:", error);
        setIsPremium(false);
      } else if (data) {
        const isActive = data.is_active && new Date(data.expires_at) > new Date();
        setIsPremium(isActive);
        premiumCache.set(userId, {
          data: { isPremium: isActive, expiresAt: data.expires_at },
          timestamp: Date.now(),
        });
      } else {
        setIsPremium(false);
        premiumCache.set(userId, {
          data: { isPremium: false, expiresAt: null },
          timestamp: Date.now(),
        });
      }
    } catch (error) {
      console.error("Error checking premium status:", error);
      setIsPremium(false);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    checkPremiumStatus();
  }, [checkPremiumStatus]);

  return { isPremium, loading };
};

// Batch check for multiple users
export const useMultipleUsersPremiumStatus = (userIds: string[]) => {
  const [premiumStatuses, setPremiumStatuses] = useState<Map<string, boolean>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkStatuses = async () => {
      if (userIds.length === 0) {
        setLoading(false);
        return;
      }

      // Filter out cached users
      const uncachedIds = userIds.filter((id) => {
        const cached = premiumCache.get(id);
        return !cached || Date.now() - cached.timestamp >= CACHE_TTL;
      });

      // Build initial map from cache
      const statusMap = new Map<string, boolean>();
      userIds.forEach((id) => {
        const cached = premiumCache.get(id);
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
          statusMap.set(id, cached.data.isPremium);
        }
      });

      // Fetch uncached users
      if (uncachedIds.length > 0) {
        const { data, error } = await supabase
          .from("premium_memberships")
          .select("user_id, is_active, expires_at")
          .in("user_id", uncachedIds);

        if (!error && data) {
          data.forEach((membership) => {
            const isActive =
              membership.is_active && new Date(membership.expires_at) > new Date();
            statusMap.set(membership.user_id, isActive);
            premiumCache.set(membership.user_id, {
              data: { isPremium: isActive, expiresAt: membership.expires_at },
              timestamp: Date.now(),
            });
          });

          // Mark uncached users without memberships as non-premium
          uncachedIds.forEach((id) => {
            if (!statusMap.has(id)) {
              statusMap.set(id, false);
              premiumCache.set(id, {
                data: { isPremium: false, expiresAt: null },
                timestamp: Date.now(),
              });
            }
          });
        }
      }

      setPremiumStatuses(statusMap);
      setLoading(false);
    };

    checkStatuses();
  }, [userIds.join(",")]);

  return { premiumStatuses, loading };
};

// Clear cache for a specific user (useful after premium status changes)
export const clearPremiumCache = (userId?: string) => {
  if (userId) {
    premiumCache.delete(userId);
  } else {
    premiumCache.clear();
  }
};
