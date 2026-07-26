// Bridge to native Android AdMob interstitial ads.
// The Android app exposes `AndroidAds.showInterstitial()` via a JavascriptInterface.
// On web (no bridge) this is a no-op.
//
// Ads are shown:
//   - after every finished game
//   - when the user switches from one game to another
//   - periodically while staying inside the same game for a long time

declare global {
  interface Window {
    AndroidAds?: {
      showInterstitial?: () => void;
    };
  }
}

// Minimum gap between two ads so a long session doesn't spam back-to-back ads.
const MIN_SECONDS_BETWEEN_ADS = 25;
// While the user stays in one game, show an ad every this many minutes.
const LONG_SESSION_MINUTES = 3;

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

function show(): boolean {
  try {
    if (typeof window !== "undefined" && window.AndroidAds?.showInterstitial) {
      window.AndroidAds.showInterstitial();
      writeNumber(LAST_AD_TS_KEY, Date.now());
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
export function startLongSessionAds(): () => void {
  if (typeof window === "undefined") return () => {};
  const id = window.setInterval(() => {
    showInterstitialAd();
  }, LONG_SESSION_MINUTES * 60 * 1000);
  return () => window.clearInterval(id);
}
