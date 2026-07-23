// Bridge to native Android AdMob interstitial ads.
// The Android app exposes `AndroidAds.showInterstitial()` via a JavascriptInterface.
// On web (no bridge) this is a no-op.

declare global {
  interface Window {
    AndroidAds?: {
      showInterstitial?: () => void;
    };
  }
}

export function showInterstitialAd(): void {
  try {
    if (typeof window !== "undefined" && window.AndroidAds?.showInterstitial) {
      window.AndroidAds.showInterstitial();
    }
  } catch (e) {
    console.warn("showInterstitialAd failed", e);
  }
}
