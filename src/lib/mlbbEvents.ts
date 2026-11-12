// Shared rules for the MLBB Events Center (status, time zone, labels).
export const YANGON_TZ = "Asia/Yangon";
/** Yangon is UTC+06:30 all year (no daylight saving). */
export const YANGON_OFFSET = "+06:30";

/** The existing Mobile Legends top-up route (KGameShop auto top-up). */
export const MLBB_TOPUP_ROUTE = "/game?g=mobile-legends";
/** Game ids that represent Mobile Legends on the game page. */
export const MLBB_GAME_IDS = ["mobile-legends", "MLBB Diamonds"];

export const EVENT_CATEGORIES = [
  { key: "skins", label: "Upcoming Skins" },
  { key: "starlight", label: "Starlight Pass" },
  { key: "diamond", label: "Diamond Events" },
  { key: "recharge", label: "Recharge / Top-Up" },
  { key: "collab", label: "Collaboration" },
  { key: "special", label: "Special Events" },
  { key: "esports", label: "Esports" },
] as const;
export type EventCategory = (typeof EVENT_CATEGORIES)[number]["key"];
export const categoryLabel = (k: string) => EVENT_CATEGORIES.find((c) => c.key === k)?.label ?? "Event";

export type MlbbEvent = {
  id: string;
  title: string;
  category: EventCategory;
  description: string | null;
  image_url: string | null;
  image_permitted: boolean;
  starts_at: string | null;
  ends_at: string | null;
  verification: "verified" | "tentative";
  review_status: "pending" | "approved" | "hidden";
  source_name: string | null;
  source_url: string | null;
  evidence: string | null;
  show_topup: boolean;
  origin: "manual" | "sync";
  needs_review: boolean;
  schedule_changed_at: string | null;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
};

export const PUBLIC_EVENT_COLUMNS =
  "id,title,category,description,image_url,image_permitted,starts_at,ends_at,verification,review_status,source_name,source_url,show_topup,origin,needs_review,schedule_changed_at,last_synced_at,created_at,updated_at,evidence";

export type EventStatus = "upcoming" | "live" | "ended";
const DAY = 864e5;

/** A single-day event (no end) runs for 24 hours from its start. */
export function effectiveEnd(e: Pick<MlbbEvent, "starts_at" | "ends_at">): number | null {
  if (e.ends_at) return Date.parse(e.ends_at);
  if (e.starts_at) return Date.parse(e.starts_at) + DAY;
  return null;
}

export function eventStatus(e: Pick<MlbbEvent, "starts_at" | "ends_at">, now = Date.now()): EventStatus {
  const start = e.starts_at ? Date.parse(e.starts_at) : null;
  const end = effectiveEnd(e);
  if (end !== null && now >= end) return "ended";
  if (start !== null && now < start) return "upcoming";
  return "live";
}

/** Target for the live countdown: start for upcoming events, end for live ones. */
export function countdownTarget(e: Pick<MlbbEvent, "starts_at" | "ends_at">, now = Date.now()): { label: string; at: number } | null {
  const s = eventStatus(e, now);
  if (s === "upcoming" && e.starts_at) return { label: "Starts in", at: Date.parse(e.starts_at) };
  const end = effectiveEnd(e);
  if (s === "live" && end !== null) return { label: "Ends in", at: end };
  return null;
}

/** Live first, then upcoming (soonest first), then ended (most recent first). */
export function sortEvents<T extends Pick<MlbbEvent, "starts_at" | "ends_at">>(list: T[], now = Date.now()): T[] {
  const rank = { live: 0, upcoming: 1, ended: 2 } as const;
  return [...list].sort((a, b) => {
    const sa = eventStatus(a, now), sb = eventStatus(b, now);
    if (sa !== sb) return rank[sa] - rank[sb];
    if (sa === "ended") return (effectiveEnd(b) ?? 0) - (effectiveEnd(a) ?? 0);
    if (sa === "live") return (effectiveEnd(a) ?? Infinity) - (effectiveEnd(b) ?? Infinity);
    return Date.parse(a.starts_at ?? "") - Date.parse(b.starts_at ?? "");
  });
}

const dateFmt = new Intl.DateTimeFormat("en-GB", { timeZone: YANGON_TZ, day: "numeric", month: "short", year: "numeric" });
const dateTimeFmt = new Intl.DateTimeFormat("en-GB", { timeZone: YANGON_TZ, day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });

/** "14 Jan 2027" in Yangon time. */
export const formatYangonDate = (iso: string) => dateFmt.format(new Date(iso));
/** "14 Jan 2027, 09:30" in Yangon time. */
export const formatYangonDateTime = (iso: string) => dateTimeFmt.format(new Date(iso));

export function formatRange(e: Pick<MlbbEvent, "starts_at" | "ends_at">): string {
  if (e.starts_at && e.ends_at) return `${formatYangonDate(e.starts_at)} – ${formatYangonDate(e.ends_at)}`;
  if (e.starts_at) return `From ${formatYangonDate(e.starts_at)}`;
  if (e.ends_at) return `Until ${formatYangonDate(e.ends_at)}`;
  return "Date to be announced";
}

/** ISO → value for <input type="datetime-local"> in Yangon time. */
export function toYangonInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(Date.parse(iso) + 6.5 * 3600e3);
  return d.toISOString().slice(0, 16);
}

/** <input type="datetime-local"> value (Yangon time) → ISO, or null when empty. */
export function fromYangonInput(v: string): string | null {
  if (!v) return null;
  const d = new Date(`${v}:00${YANGON_OFFSET}`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function formatCountdown(ms: number): string {
  const t = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(t / 86400), h = Math.floor((t % 86400) / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
  const p = (n: number) => String(n).padStart(2, "0");
  return d > 0 ? `${d}d ${p(h)}h ${p(m)}m` : `${p(h)}:${p(m)}:${p(s)}`;
}
