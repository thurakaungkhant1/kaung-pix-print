import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { cleanEvents } from "./extract.ts";

const article = "Istanbul's ESA Esport Arena will host the M8 Knockout Stage from 14 to 19 January 2027. Tickets start soon.";
const base = { title: "M8 Knockout Stage", category: "esports", summary: null, start_time: null, end_time: null, utc_offset: null };
const NOW = Date.parse("2026-11-11T00:00:00Z");

Deno.test("keeps an event whose dates are quoted from the article", () => {
  const out = cleanEvents([{ ...base, starts_on: "2027-01-14", ends_on: "2027-01-19", evidence: "host the M8 Knockout Stage from 14 to 19 January 2027" }], article, NOW);
  assertEquals(out.length, 1);
  assertEquals(out[0].starts_at, "2027-01-13T17:30:00.000Z"); // 00:00 Yangon time
});

Deno.test("drops dates the article never states", () => {
  const out = cleanEvents([{ ...base, starts_on: "2027-01-20", ends_on: null, evidence: "host the M8 Knockout Stage from 14 to 19 January 2027" }], article, NOW);
  assertEquals(out.length, 0);
});

Deno.test("drops quotes that are not in the article", () => {
  const out = cleanEvents([{ ...base, starts_on: "2027-01-14", ends_on: null, evidence: "Grand Finals on 14 January 2027" }], article, NOW);
  assertEquals(out.length, 0);
});

Deno.test("drops a guessed year that the quote does not state", () => {
  const txt = "The M8 Knockout Stage runs from 14 to 19 January.";
  const ev = { ...base, starts_on: "2029-01-14", ends_on: "2029-01-19", evidence: "M8 Knockout Stage runs from 14 to 19 January" };
  assertEquals(cleanEvents([ev], txt, NOW, "2026-11-01").length, 0);
  // the nearest January after publication is accepted
  const ok = { ...ev, starts_on: "2027-01-14", ends_on: "2027-01-19" };
  assertEquals(cleanEvents([ok], txt, NOW, "2026-11-01").length, 1);
  // no publish date and no year in the quote → dropped
  assertEquals(cleanEvents([ok], txt, NOW, null).length, 0);
});

Deno.test("drops dates pinned on an event the quote is not about", () => {
  const txt = "Early-bird tickets go on sale from 24 October to 21 November 2026.";
  const ev = { ...base, title: "M8 Knockout Stage", starts_on: "2026-10-24", ends_on: "2026-11-21", evidence: "Early-bird tickets go on sale from 24 October to 21 November 2026" };
  assertEquals(cleanEvents([ev], txt, NOW, "2026-10-01").length, 0);
  assertEquals(cleanEvents([{ ...ev, title: "M8 early-bird tickets" }], txt, NOW, "2026-10-01").length, 1);
});
