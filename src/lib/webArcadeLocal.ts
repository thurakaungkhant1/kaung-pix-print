import { supabase } from "@/integrations/supabase/client";

const HISTORY_KEY = "webArcadeHistory";
const FAV_KEY = "webArcadeFavorites";
const REWARD_KEY = "webArcadeRewardLog";
const HISTORY_LIMIT = 24;
const REWARD_PER_SESSION = 5;

export interface HistoryEntry {
  slug: string;
  ts: number;
}

/* ---------- Recently played ---------- */
export const getHistory = (): HistoryEntry[] => {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  } catch {
    return [];
  }
};

export const recordPlay = (slug: string) => {
  const list = getHistory().filter((e) => e.slug !== slug);
  list.unshift({ slug, ts: Date.now() });
  localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, HISTORY_LIMIT)));
  window.dispatchEvent(new CustomEvent("webArcadeHistoryUpdate"));
};

/* ---------- Favorites ---------- */
export const getFavorites = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(FAV_KEY) || "[]");
  } catch {
    return [];
  }
};

export const isFavorite = (slug: string) => getFavorites().includes(slug);

export const toggleFavorite = (slug: string): boolean => {
  const favs = getFavorites();
  const idx = favs.indexOf(slug);
  if (idx >= 0) favs.splice(idx, 1);
  else favs.unshift(slug);
  localStorage.setItem(FAV_KEY, JSON.stringify(favs));
  window.dispatchEvent(new CustomEvent("webArcadeFavoritesUpdate"));
  return idx < 0;
};

/* ---------- Coin reward (once per game per day) ---------- */
const todayKey = () => new Date().toISOString().slice(0, 10);

const getRewardLog = (): Record<string, string> => {
  try {
    return JSON.parse(localStorage.getItem(REWARD_KEY) || "{}");
  } catch {
    return {};
  }
};

const setRewardLog = (log: Record<string, string>) => {
  localStorage.setItem(REWARD_KEY, JSON.stringify(log));
};

/**
 * Award coins for playing a Web Arcade game.
 * Only rewards once per game slug per day per user.
 * Returns the amount awarded (0 if already rewarded / not signed in).
 */
export const awardArcadeCoins = async (slug: string): Promise<number> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 0;

    // Local guard: don't hit the server twice for the same day
    const log = getRewardLog();
    const key = `${user.id}:${slug}:${todayKey()}`;
    if (log[key]) return 0;

    // All positive credits go through the `award-points` edge function.
    // Server enforces once-per-day-per-slug and writes point_credit_audit.
    const { data, error } = await supabase.functions.invoke("award-points", {
      body: { source: "arcade", slug },
    });
    if (error) return 0;
    const amount = Number(data?.amount ?? 0);
    if (amount > 0) {
      log[key] = "1";
      setRewardLog(log);
    }
    return amount;
  } catch (e) {
    console.error("awardArcadeCoins failed", e);
    return 0;
  }
};

export const ARCADE_REWARD_PER_SESSION = REWARD_PER_SESSION;
