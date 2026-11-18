// Pure helpers that turn an AI answer into safe event rows. Anything the
// article does not state word-for-word is dropped.
import { MONTH_NAMES } from "./sources.ts";

export const CATEGORIES = ["skins", "starlight", "diamond", "recharge", "collab", "special", "esports"] as const;
export type Category = (typeof CATEGORIES)[number];

export type AiEvent = {
  title: string;
  category: string;
  summary: string | null;
  starts_on: string | null;
  start_time: string | null;
  ends_on: string | null;
  end_time: string | null;
  utc_offset: string | null;
  evidence: string;
};

export type CleanEvent = {
  title: string;
  category: Category;
  description: string | null;
  starts_at: string | null;
  ends_at: string | null;
  evidence: string;
};

export const titleKey = (t: string) => t.replace(/[^a-zA-Z0-9]+/g, "").toLowerCase();

const norm = (s: string) =>
  s.toLowerCase().replace(/[‐-―−]/g, "-").replace(/[‘’`´]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, " ").trim();

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
const OFFSET_RE = /^[+-](0\d|1[0-4]):([0-5]\d)$/;

/** The evidence must name this day and month (as a word, or numerically). */
function evidenceMentionsDate(evidence: string, date: string): boolean {
  const m = DATE_RE.exec(date);
  if (!m) return false;
  const day = String(Number(m[3]));
  const month = MONTH_NAMES[Number(m[2]) - 1];
  const e = norm(evidence);
  const hasDay = new RegExp(`(^|\\D)0?${day}(st|nd|rd|th)?(\\D|$)`).test(e);
  const hasMonth = e.includes(month.slice(0, 3)) || new RegExp(`(^|\\D)0?${Number(m[2])}[/.-]`).test(e) || new RegExp(`[/.-]0?${Number(m[2])}(\\D|$)`).test(e);
  return hasDay && hasMonth;
}

/**
 * The year must be written in the quote. When it is not, only accept the
 * nearest occurrence after the article was published (within ~11 months), so a
 * guessed year can never slip through.
 */
function yearIsSupported(evidence: string, date: string, published: string | null): boolean {
  const m = DATE_RE.exec(date);
  if (!m) return false;
  if (new RegExp(`(^|\\D)${m[1]}(\\D|$)`).test(evidence)) return true;
  if (!published || !DATE_RE.test(published)) return false;
  const pub = Date.parse(`${published}T00:00:00Z`);
  const d = Date.parse(`${date}T00:00:00Z`);
  return d >= pub - 31 * 864e5 && d <= pub + 335 * 864e5;
}

const STOP = new Set(["the", "and", "for", "with", "from", "event", "events", "mlbb", "mobile", "legends", "bang"]);
/** Title must share a meaningful word with the quote, so dates are not pinned on the wrong event. */
function titleMatchesEvidence(title: string, evidence: string): boolean {
  const words = norm(title).split(/[^a-z0-9]+/).filter((w) => w.length >= 3 && !STOP.has(w));
  const e = norm(evidence);
  return words.length === 0 || words.some((w) => e.includes(w));
}

function toIso(date: string | null, time: string | null, offset: string | null, fallbackTime: string): string | null {
  if (!date || !DATE_RE.test(date)) return null;
  const t = time && TIME_RE.test(time) ? time : fallbackTime;
  const o = offset && OFFSET_RE.test(offset) ? offset : "+06:30"; // Asia/Yangon when the source gives no zone
  const d = new Date(`${date}T${t}:00${o}`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function cleanEvents(raw: AiEvent[], articleText: string, now = Date.now(), published: string | null = null): CleanEvent[] {
  const text = norm(articleText);
  const out: CleanEvent[] = [];
  for (const e of raw ?? []) {
    const title = (e.title ?? "").trim().slice(0, 200);
    const evidence = (e.evidence ?? "").trim();
    if (!title || evidence.length < 8) continue;
    if (!text.includes(norm(evidence))) continue; // quote must be verbatim from the article
    if (!titleMatchesEvidence(title, evidence)) continue;
    const dateOk = (d: string | null) => !!d && evidenceMentionsDate(evidence, d) && yearIsSupported(evidence, d, published);
    const startOk = dateOk(e.starts_on);
    const endOk = dateOk(e.ends_on);
    if (!startOk && !endOk) continue; // no explicitly stated date → not an event we can list
    const starts_at = startOk ? toIso(e.starts_on, e.start_time, e.utc_offset, "00:00") : null;
    const ends_at = endOk ? toIso(e.ends_on, e.end_time, e.utc_offset, "23:59") : null;
    if (starts_at && ends_at && Date.parse(ends_at) < Date.parse(starts_at)) continue;
    const last = Date.parse(ends_at ?? starts_at ?? "");
    if (!Number.isFinite(last) || last < now - 7 * 864e5) continue; // already over
    const category = (CATEGORIES as readonly string[]).includes(e.category) ? (e.category as Category) : "special";
    out.push({ title, category, description: e.summary?.trim().slice(0, 600) || null, starts_at, ends_at, evidence: evidence.slice(0, 600) });
  }
  return out;
}
