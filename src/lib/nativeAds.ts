// Bridge to native Android AdMob interstitial ads.
// The Android app exposes `AndroidAds.showInterstitial()` via a JavascriptInterface.
// On web (no bridge) this is a no-op.
//
// Frequency cap: only show one interstitial after BOTH
//   - MIN_MINUTES_BETWEEN_ADS minutes have passed since last ad, AND
//   - MIN_GAMES_BETWEEN_ADS games have been played since last ad.

declare global {
  interface Window {
    AndroidAds?: {
      showInterstitial?: () => void;
    };
  }
}

const MIN_MINUTES_BETWEEN_ADS = 3; // X minutes
const MIN_GAMES_BETWEEN_ADS = 3;   // Y games

const LAST_AD_TS_KEY = "ads:lastInterstitialTs";
const GAMES_SINCE_AD_KEY = "ads:gamesSinceLastInterstitial";

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

/**
 * Call after each game finish. Increments the game counter and
 * shows an interstitial only when the frequency cap allows it.
 */
export function maybeShowInterstitialAfterGame(): void {
  try {
    const games = readNumber(GAMES_SINCE_AD_KEY) + 1;
    writeNumber(GAMES_SINCE_AD_KEY, games);

    const lastTs = readNumber(LAST_AD_TS_KEY);
    const minutesSince = (Date.now() - lastTs) / 60000;

    if (games < MIN_GAMES_BETWEEN_ADS) return;
    if (lastTs > 0 && minutesSince < MIN_MINUTES_BETWEEN_ADS) return;

    if (typeof window !== "undefined" && window.AndroidAds?.showInterstitial) {
      window.AndroidAds.showInterstitial();
      writeNumber(LAST_AD_TS_KEY, Date.now());
      writeNumber(GAMES_SINCE_AD_KEY, 0);
    }
  } catch (e) {
    console.warn("maybeShowInterstitialAfterGame failed", e);
  }
}

/** Force-show an interstitial (ignores frequency cap). Rarely needed. */
export function showInterstitialAd(): void {
  try {
    if (typeof window !== "undefined" && window.AndroidAds?.showInterstitial) {
      window.AndroidAds.showInterstitial();
      writeNumber(LAST_AD_TS_KEY, Date.now());
      writeNumber(GAMES_SINCE_AD_KEY, 0);
    }
  } catch (e) {
    console.warn("showInterstitialAd failed", e);
  }
}
