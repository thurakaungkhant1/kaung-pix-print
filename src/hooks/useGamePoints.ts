import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { showInterstitialAd } from "@/lib/nativeAds";

interface GameSettings {
  base_play_points: number;
  win_bonus_points: number;
  high_score_bonus_points: number;
  high_score_threshold: number;
  daily_limit: number;
  cooldown_seconds: number;
}

const DEFAULT_SETTINGS: GameSettings = {
  base_play_points: 5,
  win_bonus_points: 20,
  high_score_bonus_points: 10,
  high_score_threshold: 100,
  daily_limit: 500,
  cooldown_seconds: 30,
};

export const useGamePoints = () => {
  const { user } = useAuth();
  const [gamePoints, setGamePoints] = useState(0);
  const [dailyEarned, setDailyEarned] = useState(0);
  const [streak, setStreak] = useState(0);
  const [lastGameTime, setLastGameTime] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    loadSettings();
    if (user) {
      loadGameData();
    }
  }, [user]);

  const loadSettings = async () => {
    const { data } = await supabase
      .from("game_settings")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) setSettings({
      base_play_points: data.base_play_points,
      win_bonus_points: data.win_bonus_points,
      high_score_bonus_points: data.high_score_bonus_points,
      high_score_threshold: data.high_score_threshold,
      daily_limit: data.daily_limit,
      cooldown_seconds: data.cooldown_seconds,
    });
  };

  const loadGameData = async () => {
    if (!user) return;
    try {
      const [profileRes, dailyRes, streakRes] = await Promise.all([
        supabase.from("profiles").select("game_points").eq("id", user.id).single(),
        supabase.rpc("get_daily_game_points", { p_user_id: user.id }),
        supabase.from("game_streaks").select("*").eq("user_id", user.id).single(),
      ]);

      if (profileRes.data) setGamePoints(profileRes.data.game_points || 0);
      if (dailyRes.data != null) setDailyEarned(dailyRes.data);
      if (streakRes.data) setStreak(streakRes.data.current_streak || 0);
    } catch (e) {
      console.error("Error loading game data:", e);
    } finally {
      setLoading(false);
    }
  };

  const canPlay = useCallback((gameName: string) => {
    const last = lastGameTime[gameName] || 0;
    return Date.now() - last >= settings.cooldown_seconds * 1000;
  }, [lastGameTime, settings.cooldown_seconds]);

  const getCooldownRemaining = useCallback((gameName: string) => {
    const last = lastGameTime[gameName] || 0;
    const remaining = settings.cooldown_seconds * 1000 - (Date.now() - last);
    return Math.max(0, Math.ceil(remaining / 1000));
  }, [lastGameTime, settings.cooldown_seconds]);

  const submitScore = useCallback(async (gameName: string, score: number, isWin: boolean) => {
    if (!user) return { success: false, pointsEarned: 0 };

    if (!canPlay(gameName)) {
      return { success: false, pointsEarned: 0, cooldown: true };
    }

    try {
      // Server-verified credit via edge function.
      // All positive game_points writes go through service_role.
      const { data, error } = await supabase.functions.invoke("award-points", {
        body: { source: "game", game_name: gameName, score, is_win: isWin },
      });
      if (error) {
        console.error("award-points error", error);
        return { success: false, pointsEarned: 0 };
      }
      const pointsEarned = Number(data?.amount ?? 0);
      const reason = data?.reason as string | undefined;

      // Local mission / streak bookkeeping still runs client-side (non-credit data)
      const today = new Date().toISOString().split("T")[0];
      const { data: mission } = await supabase
        .from("daily_missions")
        .select("*")
        .eq("user_id", user.id)
        .eq("mission_date", today)
        .maybeSingle();

      if (mission) {
        await supabase
          .from("daily_missions")
          .update({
            games_played: mission.games_played + 1,
            games_won: isWin ? mission.games_won + 1 : mission.games_won,
            missions_completed: mission.games_played + 1 >= 3,
          })
          .eq("id", mission.id);
      } else {
        await supabase.from("daily_missions").insert({
          user_id: user.id,
          mission_date: today,
          games_played: 1,
          games_won: isWin ? 1 : 0,
          missions_completed: false,
        });
      }

      const { data: streakData } = await supabase
        .from("game_streaks")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split("T")[0];

      if (streakData) {
        const newStreak = streakData.last_played_date === yesterdayStr
          ? streakData.current_streak + 1
          : streakData.last_played_date === today
            ? streakData.current_streak
            : 1;
        await supabase
          .from("game_streaks")
          .update({
            current_streak: newStreak,
            longest_streak: Math.max(newStreak, streakData.longest_streak),
            last_played_date: today,
          })
          .eq("user_id", user.id);
        setStreak(newStreak);
      } else {
        await supabase.from("game_streaks").insert({
          user_id: user.id,
          current_streak: 1,
          longest_streak: 1,
          last_played_date: today,
        });
        setStreak(1);
      }

      if (pointsEarned > 0) {
        setGamePoints((prev) => prev + pointsEarned);
        setDailyEarned((prev) => prev + pointsEarned);
      }
      setLastGameTime((prev) => ({ ...prev, [gameName]: Date.now() }));

      return {
        success: true,
        pointsEarned,
        dailyLimitReached: reason === "daily_cap",
        cooldown: reason === "cooldown",
      };
    } catch (e) {
      console.error("Error submitting score:", e);
      return { success: false, pointsEarned: 0 };
    }
  }, [user, canPlay]);

  return {
    gamePoints,
    dailyEarned,
    dailyLimit: settings.daily_limit,
    streak,
    loading,
    canPlay,
    getCooldownRemaining,
    submitScore,
    refreshData: loadGameData,
    settings,
  };
};
