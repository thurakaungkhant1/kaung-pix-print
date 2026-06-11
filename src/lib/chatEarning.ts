import { supabase } from "@/integrations/supabase/client";

// Defaults — overridden by `chat_earning_settings` row when present.
export const CHAT_REWARD_PER_MESSAGE = 1;
export const CHAT_REWARD_DAILY_CAP = 20;

export interface ChatEarningSettings {
  enabled: boolean;
  require_vpn: boolean;
  home_country: string;
  reward_per_message: number;
  daily_cap: number;
  min_message_length: number;
  cooldown_seconds: number;
}

const DEFAULT_SETTINGS: ChatEarningSettings = {
  enabled: true,
  require_vpn: true,
  home_country: "MM",
  reward_per_message: CHAT_REWARD_PER_MESSAGE,
  daily_cap: CHAT_REWARD_DAILY_CAP,
  min_message_length: 2,
  cooldown_seconds: 10,
};

let settingsCache: { ts: number; data: ChatEarningSettings } | null = null;
const SETTINGS_TTL = 60 * 1000;

export const getChatEarningSettings = async (): Promise<ChatEarningSettings> => {
  if (settingsCache && Date.now() - settingsCache.ts < SETTINGS_TTL) {
    return settingsCache.data;
  }
  try {
    const { data } = await supabase
      .from("chat_earning_settings")
      .select("*")
      .maybeSingle();
    const merged: ChatEarningSettings = { ...DEFAULT_SETTINGS, ...(data || {}) };
    settingsCache = { ts: Date.now(), data: merged };
    return merged;
  } catch {
    return DEFAULT_SETTINGS;
  }
};

const todayKey = (uid: string) => {
  const d = new Date();
  const ymd = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  return `chat_earn_${uid}_${ymd}`;
};
const lastAwardKey = (uid: string) => `chat_earn_last_${uid}`;
const lastMsgKey = (uid: string) => `chat_earn_lastmsg_${uid}`;

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

// VPN detection: cache for 10 minutes
const VPN_CACHE_KEY = "vpn_check_v1";
const VPN_CACHE_TTL = 10 * 60 * 1000;

export const detectCountry = async (): Promise<string | null> => {
  try {
    const res = await fetch("https://ipapi.co/json/", { cache: "no-store" });
    const data = await res.json();
    return ((data?.country || data?.country_code || "") as string).toUpperCase() || null;
  } catch {
    return null;
  }
};

export const isUsingVPN = async (homeCountry = "MM"): Promise<boolean> => {
  try {
    const cached = sessionStorage.getItem(VPN_CACHE_KEY);
    if (cached) {
      const { ts, vpn, home } = JSON.parse(cached);
      if (Date.now() - ts < VPN_CACHE_TTL && home === homeCountry) return vpn;
    }
  } catch {}
  const country = await detectCountry();
  const vpn = !!country && country !== homeCountry.toUpperCase();
  try {
    sessionStorage.setItem(
      VPN_CACHE_KEY,
      JSON.stringify({ ts: Date.now(), vpn, home: homeCountry })
    );
  } catch {}
  return vpn;
};

export type AwardReason =
  | "ok"
  | "disabled"
  | "no_user"
  | "vpn_required"
  | "too_short"
  | "cooldown"
  | "duplicate"
  | "daily_cap"
  | "error";

export interface AwardResult {
  amount: number;
  reason: AwardReason;
  cooldownRemaining?: number;
}

const logAttempt = async (
  userId: string,
  amount: number,
  reason: AwardReason,
  message?: string,
  cooldownRemaining?: number,
  country?: string | null
) => {
  try {
    await supabase.from("chat_reward_logs").insert({
      user_id: userId,
      amount,
      reason,
      message_preview: message ? message.slice(0, 120) : null,
      cooldown_remaining: cooldownRemaining ?? null,
      country: country ?? null,
    });
  } catch {}
};

/**
 * Award chat coins for sending a message with anti-abuse guards:
 * - admin-controlled settings (enabled, VPN required, caps, cooldown, min length)
 * - per-message cooldown (rate limit)
 * - duplicate message guard
 * - daily cap cross-checked against `point_transactions`
 * Every attempt is also written to `chat_reward_logs` for admin audit.
 */
export const awardChatPoints = async (
  userId: string,
  message?: string
): Promise<AwardResult> => {
  if (!userId) return { amount: 0, reason: "no_user" };

  const settings = await getChatEarningSettings();
  if (!settings.enabled) {
    await logAttempt(userId, 0, "disabled", message);
    return { amount: 0, reason: "disabled" };
  }

  // Min message length
  const text = (message || "").trim();
  if (text.length < settings.min_message_length) {
    await logAttempt(userId, 0, "too_short", text);
    return { amount: 0, reason: "too_short" };
  }

  // Duplicate guard: same exact message back-to-back doesn't earn
  try {
    const prev = localStorage.getItem(lastMsgKey(userId));
    if (prev && prev === text) {
      await logAttempt(userId, 0, "duplicate", text);
      return { amount: 0, reason: "duplicate" };
    }
    localStorage.setItem(lastMsgKey(userId), text);
  } catch {}

  // Per-message cooldown rate-limit
  try {
    const last = parseInt(localStorage.getItem(lastAwardKey(userId)) || "0", 10);
    const elapsedMs = Date.now() - last;
    const cdMs = settings.cooldown_seconds * 1000;
    if (last && elapsedMs < cdMs) {
      const remaining = Math.ceil((cdMs - elapsedMs) / 1000);
      await logAttempt(userId, 0, "cooldown", text, remaining);
      return { amount: 0, reason: "cooldown", cooldownRemaining: remaining };
    }
  } catch {}

  // VPN requirement
  let detectedCountry: string | null = null;
  if (settings.require_vpn) {
    detectedCountry = await detectCountry();
    const vpnOn = !!detectedCountry && detectedCountry !== settings.home_country.toUpperCase();
    if (!vpnOn) {
      await logAttempt(userId, 0, "vpn_required", text, undefined, detectedCountry);
      return { amount: 0, reason: "vpn_required" };
    }
  }

  const localUsed = getTodayChatEarned(userId);
  if (localUsed >= settings.daily_cap) {
    await logAttempt(userId, 0, "daily_cap", text, undefined, detectedCountry);
    return { amount: 0, reason: "daily_cap" };
  }

  // Cross-check daily cap with DB
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const { data: txns } = await supabase
    .from("point_transactions")
    .select("amount")
    .eq("user_id", userId)
    .eq("transaction_type", "chat")
    .gte("created_at", start.toISOString());
  const dbUsed = (txns || []).reduce((s, t: any) => s + (t.amount || 0), 0);
  if (dbUsed >= settings.daily_cap) {
    setTodayChatEarned(userId, dbUsed);
    await logAttempt(userId, 0, "daily_cap", text, undefined, detectedCountry);
    return { amount: 0, reason: "daily_cap" };
  }

  const remaining = settings.daily_cap - dbUsed;
  const amount = Math.max(0, Math.min(settings.reward_per_message, remaining));
  if (amount === 0) {
    await logAttempt(userId, 0, "daily_cap", text, undefined, detectedCountry);
    return { amount: 0, reason: "daily_cap" };
  }

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
  if (upErr) {
    await logAttempt(userId, 0, "error", text, undefined, detectedCountry);
    return { amount: 0, reason: "error" };
  }

  await supabase.from("point_transactions").insert({
    user_id: userId,
    amount,
    transaction_type: "chat",
    description: `Earned ${amount} coin from chat message`,
  });

  setTodayChatEarned(userId, dbUsed + amount);
  try {
    localStorage.setItem(lastAwardKey(userId), String(Date.now()));
  } catch {}
  await logAttempt(userId, amount, "ok", text, undefined, detectedCountry);
  return { amount, reason: "ok" };
};
