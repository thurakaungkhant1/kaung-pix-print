// Lightweight client analytics. Forwards events to dataLayer / gtag
// when present, otherwise no-ops. Safe to call from anywhere.

export type AnalyticsProps = Record<string, string | number | boolean | null | undefined>;

export const track = (event: string, props: AnalyticsProps = {}) => {
  try {
    const w = window as any;
    w.dataLayer = w.dataLayer || [];
    w.dataLayer.push({ event, ...props });
    if (typeof w.gtag === "function") {
      w.gtag("event", event, props);
    }
    // Mirror to console so devs can confirm during QA.
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.info("[analytics]", event, props);
    }
  } catch {
    /* swallow — analytics must never break UX */
  }
};

/** Gift QR / link funnel events */
export const GiftEvents = {
  QrScanSuccess: "gift_qr_scan_success",
  QrScanInvalid: "gift_qr_scan_invalid",
  QrDecodeFailed: "gift_qr_decode_failed",
  CameraDenied: "gift_qr_camera_denied",
  StatusApproved: "gift_status_approved",
  StatusError: "gift_status_error",
} as const;
