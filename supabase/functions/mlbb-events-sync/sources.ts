// Official, publicly readable MLBB/MOONTON announcement pages (robots.txt allows
// crawling). The in-game news on mobilelegends.com loads through a private,
// signed interface, so it is intentionally NOT used here.

export type Article = { source: string; url: string; title: string; published: string | null };

export const SOURCES = [
  { name: "MLBB Esports (official)", url: "https://mlbbesports.com/news" },
  { name: "MOONTON Games (official)", url: "https://en.moonton.com/news/index.html" },
] as const;

const UA = "KaungDigitalStore-EventsSync/1.0 (+https://kaung-pix-print.lovable.app)";

export async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "text/html" },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);
  return await res.text();
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", "#039": "'", ndash: "–", mdash: "—", rsquo: "’", lsquo: "‘", ldquo: "“", rdquo: "”", hellip: "…", middot: "·", uuml: "ü", ouml: "ö", auml: "ä", eacute: "é", egrave: "è", ccedil: "ç", Uuml: "Ü" };
export const decode = (s: string) =>
  s.replace(/&(#\d+|#x[0-9a-f]+|[a-z0-9]+);/gi, (m, e: string) => {
    if (e[0] === "#") {
      const n = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : m;
    }
    return ENTITIES[e] ?? ENTITIES[e.toLowerCase()] ?? m;
  });

const clean = (s: string) => decode(s.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();

const MONTHS = ["january","february","march","april","may","june","july","august","september","october","november","december"];

/** "October 28, 2026" → "2026-10-28" */
export function parseLongDate(s: string): string | null {
  const m = /([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})/.exec(s);
  if (!m) return null;
  const mi = MONTHS.indexOf(m[1].toLowerCase());
  if (mi < 0) return null;
  return `${m[3]}-${String(mi + 1).padStart(2, "0")}-${m[2].padStart(2, "0")}`;
}

export function parseMlbbEsportsList(html: string): Article[] {
  const out: Article[] = [];
  const re = /<a\s+href="(https:\/\/mlbbesports\.com\/news\/[a-z0-9-]+)"[^>]*class="mp-news-card[\s\S]*?<h2[^>]*>([\s\S]*?)<\/h2>([\s\S]*?)<\/a>/g;
  for (const m of html.matchAll(re)) {
    const date = /mp-card-date">([^<]+)</.exec(m[3]);
    out.push({ source: SOURCES[0].name, url: m[1], title: clean(m[2]), published: date ? parseLongDate(date[1]) : null });
  }
  return out;
}

export function parseMoontonList(html: string): Article[] {
  const out: Article[] = [];
  const re = /<a[^>]+href="(\/news\/\d+\.html)"[^>]*>[\s\S]*?<div class="d">(\d{4})\/(\d{2})\/(\d{2})<\/div>\s*<div class="t">([\s\S]*?)<\/div>/g;
  for (const m of html.matchAll(re)) {
    out.push({ source: SOURCES[1].name, url: `https://en.moonton.com${m[1]}`, title: clean(m[5]), published: `${m[2]}-${m[3]}-${m[4]}` });
  }
  return out;
}

/** Readable article text, starting at the headline to skip menus. */
export function articleText(html: string, title: string): string {
  const body = html
    .replace(/<head[\s\S]*?<\/head>/i, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<(nav|footer|header|noscript)[\s\S]*?<\/\1>/gi, " ");
  const text = clean(body);
  const head = title.slice(0, 40);
  const at = head ? text.indexOf(head) : -1;
  return (at >= 0 ? text.slice(at) : text).slice(0, 14000);
}

/** True when the text contains at least one full calendar date (day + month + year). */
export function hasExplicitDate(text: string): boolean {
  const mon = "(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*";
  return new RegExp(`\\b\\d{1,2}(?:st|nd|rd|th)?\\s+(?:(?:to|-|–|and)\\s+\\d{1,2}(?:st|nd|rd|th)?\\s+)?${mon}\\.?,?\\s+\\d{4}\\b`, "i").test(text)
    || new RegExp(`\\b${mon}\\.?\\s+\\d{1,2}(?:st|nd|rd|th)?,?\\s+\\d{4}\\b`, "i").test(text)
    || /\b\d{4}[\/.-]\d{1,2}[\/.-]\d{1,2}\b/.test(text);
}

export const MONTH_NAMES = MONTHS;
