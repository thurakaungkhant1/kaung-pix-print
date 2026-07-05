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
 * Award chat coins by invoking the `award-points` edge function.
 *
 * All positive point credits happen server-side under service_role so:
 *  - browsers cannot directly insert positive rows into point_transactions,
 *  - anti-abuse guards (VPN, cooldown, daily cap, min length) are enforced
 *    on the server against real DB state,
 *  - every credit writes a matching audit row.
 */
export const awardChatPoints = async (
  userId: string,
  message?: string
): Promise<AwardResult> => {
  if (!userId) return { amount: 0, reason: "no_user" };

  const text = (message || "").trim();

  // Client-side duplicate guard (UX only; server is authoritative)
  try {
    const prev = localStorage.getItem(lastMsgKey(userId));
    if (prev && prev === text) return { amount: 0, reason: "duplicate" };
    localStorage.setItem(lastMsgKey(userId), text);
  } catch {}

  const { data, error } = await supabase.functions.invoke("award-points", {
    body: { source: "chat", message: text },
  });
  if (error) return { amount: 0, reason: "error" };

  const amount = Number(data?.amount ?? 0);
  const reason = (data?.reason as AwardReason) || "error";
  const cooldownRemaining = data?.metadata?.cooldownRemaining as number | undefined;

  if (amount > 0) {
    setTodayChatEarned(userId, getTodayChatEarned(userId) + amount);
  }
  return { amount, reason, cooldownRemaining };
};
