import { supabase } from "@/integrations/supabase/client";

// Reward 1 coin per message, max 20/day per user (tracked in point_transactions).
export const CHAT_REWARD_PER_MESSAGE = 1;
export const CHAT_REWARD_DAILY_CAP = 20;

const todayKey = (uid: string) => {
  const d = new Date();
  const ymd = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  return `chat_earn_${uid}_${ymd}`;
};

export const getTodayChatEarned = (uid: string): number => {
  try {
    const v = localStorage.getItem(todayKey(uid));
    return v ? parseInt(v, 10) || 0 : 0;
  } catch {
    return 0;
  }
};

const setTodayChatEarned = (uid: string, n: number) => {
  try {
    localStorage.setItem(todayKey(uid), String(n));
  } catch {}
};

// Detect VPN by checking if user's IP country is outside Myanmar (MM).
// Result cached for 10 minutes in sessionStorage.
const VPN_CACHE_KEY = "vpn_check_v1";
const VPN_CACHE_TTL = 10 * 60 * 1000;

export const isUsingVPN = async (): Promise<boolean> => {
  try {
    const cached = sessionStorage.getItem(VPN_CACHE_KEY);
    if (cached) {
      const { ts, vpn } = JSON.parse(cached);
      if (Date.now() - ts < VPN_CACHE_TTL) return vpn;
    }
  } catch {}

  try {
    const res = await fetch("https://ipapi.co/json/", { cache: "no-store" });
    const data = await res.json();
    // If country is NOT Myanmar, treat as VPN-on.
    const country = (data?.country || data?.country_code || "").toUpperCase();
    const vpn = !!country && country !== "MM";
    try {
      sessionStorage.setItem(VPN_CACHE_KEY, JSON.stringify({ ts: Date.now(), vpn }));
    } catch {}
    return vpn;
  } catch {
    return false;
  }
};

/**
 * Award chat coins for sending a message. Capped per day client-side and
 * server-side (we read today's point_transactions before inserting).
 * Returns the amount awarded (0 if cap reached).
 */
export const awardChatPoints = async (userId: string): Promise<number> => {
  if (!userId) return 0;
  const localUsed = getTodayChatEarned(userId);
  if (localUsed >= CHAT_REWARD_DAILY_CAP) return 0;

  // Cross-check with DB (in case of multi-device)
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const { data: txns } = await supabase
    .from("point_transactions")
    .select("amount")
    .eq("user_id", userId)
    .eq("transaction_type", "chat")
    .gte("created_at", start.toISOString());
  const dbUsed = (txns || []).reduce((s, t: any) => s + (t.amount || 0), 0);
  if (dbUsed >= CHAT_REWARD_DAILY_CAP) {
    setTodayChatEarned(userId, dbUsed);
    return 0;
  }

  const remaining = CHAT_REWARD_DAILY_CAP - dbUsed;
  const amount = Math.min(CHAT_REWARD_PER_MESSAGE, remaining);

  // Get current points then increment
  const { data: prof } = await supabase
    .from("profiles")
    .select("points")
    .eq("id", userId)
    .maybeSingle();
  const next = (prof?.points || 0) + amount;

  const { error: upErr } = await supabase
    .from("profiles")
    .update({ points: next })
    .eq("id", userId);
  if (upErr) return 0;

  await supabase.from("point_transactions").insert({
    user_id: userId,
    amount,
    transaction_type: "chat",
    description: `Earned ${amount} coin from chat message`,
  });

  setTodayChatEarned(userId, dbUsed + amount);
  return amount;
};
