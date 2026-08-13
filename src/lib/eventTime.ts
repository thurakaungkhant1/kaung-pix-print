/**
 * Helpers for entering event end times in a chosen timezone and storing them
 * as absolute UTC timestamps, so countdowns are correct for every user location.
 */

export const TIMEZONES: { value: string; label: string }[] = [
  { value: "Asia/Yangon", label: "Myanmar (Yangon) UTC+6:30" },
  { value: "Asia/Bangkok", label: "Thailand (Bangkok) UTC+7" },
  { value: "Asia/Singapore", label: "Singapore UTC+8" },
  { value: "Asia/Kolkata", label: "India (Kolkata) UTC+5:30" },
  { value: "Asia/Dubai", label: "Dubai UTC+4" },
  { value: "Asia/Tokyo", label: "Japan (Tokyo) UTC+9" },
  { value: "Asia/Seoul", label: "Korea (Seoul) UTC+9" },
  { value: "Australia/Sydney", label: "Sydney" },
  { value: "Europe/London", label: "London" },
  { value: "Europe/Berlin", label: "Berlin / Paris" },
  { value: "America/New_York", label: "New York (ET)" },
  { value: "America/Los_Angeles", label: "Los Angeles (PT)" },
  { value: "UTC", label: "UTC" },
];

/** The viewer's own timezone, used as the default selection. */
export const localTimeZone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
};

/** Ensure the browser timezone is offered in the dropdown. */
export const timezoneOptions = (extra?: string | null) => {
  const list = [...TIMEZONES];
  const own = localTimeZone();
  for (const tz of [own, extra]) {
    if (tz && !list.some((t) => t.value === tz)) {
      list.unshift({ value: tz, label: `${tz} (device)` });
    }
  }
  return list;
};

const partsInZone = (date: Date, timeZone: string) => {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const p: Record<string, string> = {};
  for (const part of fmt.formatToParts(date)) {
    if (part.type !== "literal") p[part.type] = part.value;
  }
  return {
    year: +p.year,
    month: +p.month,
    day: +p.day,
    hour: +(p.hour === "24" ? "0" : p.hour),
    minute: +p.minute,
    second: +p.second,
  };
};

/** Offset (ms) of a timezone at a given instant. */
const zoneOffsetMs = (date: Date, timeZone: string) => {
  const p = partsInZone(date, timeZone);
  const asUTC = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUTC - Math.floor(date.getTime() / 1000) * 1000;
};

/**
 * Convert a `datetime-local` value ("YYYY-MM-DDTHH:mm") interpreted in `timeZone`
 * into an absolute ISO (UTC) timestamp.
 */
export const zonedInputToISO = (input: string, timeZone: string): string | null => {
  if (!input) return null;
  const [datePart, timePart = "00:00"] = input.split("T");
  const [y, m, d] = datePart.split("-").map(Number);
  const [hh, mm] = timePart.split(":").map(Number);
  if (!y || !m || !d) return null;
  const guessUTC = Date.UTC(y, m - 1, d, hh || 0, mm || 0, 0);
  let ts = guessUTC - zoneOffsetMs(new Date(guessUTC), timeZone);
  // Re-check once for DST boundaries.
  ts = guessUTC - zoneOffsetMs(new Date(ts), timeZone);
  const date = new Date(ts);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

/** Convert an ISO timestamp into a `datetime-local` value rendered in `timeZone`. */
export const isoToZonedInput = (iso?: string | null, timeZone = localTimeZone()): string => {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const p = partsInZone(date, timeZone);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`;
};

/** Human preview of an absolute timestamp in the viewer's own timezone. */
export const formatInViewerZone = (iso?: string | null) => {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.toLocaleString()} (${localTimeZone()})`;
};
