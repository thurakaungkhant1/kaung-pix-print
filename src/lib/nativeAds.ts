// Bridge to native Android AdMob interstitial ads.
// The Android app exposes `AndroidAds.showInterstitial()` via a JavascriptInterface.
// On web (no bridge) this is a no-op.
//
// Ads are shown:
//   - after every finished game
//   - when the user switches from one game to another
//   - every 2 minutes while staying inside the same game

import { supabase } from "@/integrations/supabase/client";

declare global {
  interface Window {
    AndroidAds?: {
      showInterstitial?: () => void;
      showRewarded?: () => void;
      preloadInterstitial?: () => void;
      loadInterstitial?: () => void;
      cacheInterstitial?: () => void;
    };
    onRewardEarned?: (amount: number, type: string) => void;
    onAdClicked?: (adType?: string) => void;
  }
}

/** Fire-and-forget analytics log for ad impressions/clicks. */
export async function logAdEvent(
  eventType: "impression" | "click",
  adType: string = "interstitial",
  context?: string,
) {
  try {
    const { data } = await supabase.auth.getUser();
    await supabase.from("ad_events").insert({
      event_type: eventType,
      ad_type: adType,
      user_id: data.user?.id ?? null,
      context: context ?? null,
    });
  } catch (e) {
    console.warn("logAdEvent failed", e);
  }
}

if (typeof window !== "undefined") {
  // Native layer can report ad clicks back into the web view.
  window.onAdClicked = (adType?: string) => {
    void logAdEvent("click", adType || "interstitial");
  };
}

// Minimum gap between two ads so a long session doesn't spam back-to-back ads.
const MIN_SECONDS_BETWEEN_ADS = 25;
// While the user stays in one game, show an ad every this many minutes (admin-configurable).
export const DEFAULT_LONG_SESSION_MINUTES = 2;

const LAST_AD_TS_KEY = "ads:lastInterstitialTs";

function readNumber(key: string): number {
  try {
    const v = localStorage.getItem(key);
    return v ? Number(v) || 0 : 0;
  } catch {
    return 0;
  }
}

function writeNumber(key: string, value: number) {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    /* ignore */
  }
}

/** Ask the native layer to cache the next interstitial so it opens instantly. */
export function preloadInterstitialAd(): void {
  try {
    const bridge = typeof window !== "undefined" ? window.AndroidAds : undefined;
    const fn = bridge?.preloadInterstitial || bridge?.loadInterstitial || bridge?.cacheInterstitial;
    if (fn) fn.call(bridge);
  } catch (e) {
    console.warn("preloadInterstitial failed", e);
  }
}

function show(): boolean {
  try {
    if (typeof window !== "undefined" && window.AndroidAds?.showInterstitial) {
      window.AndroidAds.showInterstitial();
      writeNumber(LAST_AD_TS_KEY, Date.now());
      void logAdEvent("impression", "interstitial");
      // Immediately cache the next one so the following ad appears without delay.
      setTimeout(preloadInterstitialAd, 1000);
      return true;
    }
  } catch (e) {
    console.warn("showInterstitial failed", e);
  }
  return false;
}

/** Show an interstitial, respecting only a small anti-spam gap. */
export function showInterstitialAd(): void {
  const last = readNumber(LAST_AD_TS_KEY);
  if (last > 0 && (Date.now() - last) / 1000 < MIN_SECONDS_BETWEEN_ADS) return;
  show();
}

/** Call after each game finish — shows an ad every game. */
export function maybeShowInterstitialAfterGame(): void {
  showInterstitialAd();
}

/**
 * Start a repeating timer that shows an interstitial while the user keeps
 * playing the same game. Returns a cleanup function.
 */
export function startLongSessionAds(minutes = DEFAULT_LONG_SESSION_MINUTES): () => void {
  if (typeof window === "undefined") return () => {};
  const safeMinutes = Number.isFinite(minutes) && minutes > 0 ? minutes : DEFAULT_LONG_SESSION_MINUTES;
  preloadInterstitialAd();
  const id = window.setInterval(() => {
    showInterstitialAd();
  }, safeMinutes * 60 * 1000);
  return () => window.clearInterval(id);
}

/* ---------------- Rewarded ads (2x points) ---------------- */

/** True when the native Android rewarded-ad bridge is available. */
export function hasRewardedAds(): boolean {
  return typeof window !== "undefined" && typeof window.AndroidAds?.showRewarded === "function";
}

/**
 * Ask the Android app to show a rewarded ad.
 * The native side calls back into `window.onRewardEarned(amount, type)` on success.
 */
export function showRewardedAd(): boolean {
  try {
    if (hasRewardedAds()) {
      window.AndroidAds!.showRewarded!();
      void logAdEvent("impression", "rewarded");
      return true;
    }
  } catch (e) {
    console.warn("showRewarded failed", e);
  }
  return false;
}
