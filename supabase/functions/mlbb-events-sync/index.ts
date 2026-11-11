// Daily (and admin-triggered) sync of MLBB events from official, publicly
// readable announcement pages. Found events are saved as "pending" +
// "tentative" so nothing reaches shoppers until an admin approves it.
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { generateResponse, GatewayError, PaymentRequiredError } from "npm:@lovable.dev/ai-gateway@0.1.11";
import { authenticateCronRequest } from "../_shared/cron-auth.ts";
import { SOURCES, fetchText, parseMlbbEsportsList, parseMoontonList, articleText, hasExplicitDate, type Article } from "./sources.ts";
import { CATEGORIES, cleanEvents, titleKey, type AiEvent, type CleanEvent } from "./extract.ts";

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const MAX_AGE_DAYS = 45;
const MAX_PER_SOURCE = 10;

const sha256 = async (s: string) =>
  Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s))))
    .map((b) => b.toString(16).padStart(2, "0")).join("");

const EVENT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["events"],
  properties: {
    events: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "category", "summary", "starts_on", "start_time", "ends_on", "end_time", "utc_offset", "evidence"],
        properties: {
          title: { type: "string" },
          category: { type: "string", enum: [...CATEGORIES] },
          summary: { type: ["string", "null"] },
          starts_on: { type: ["string", "null"], description: "YYYY-MM-DD, only if the article states this exact day" },
          start_time: { type: ["string", "null"], description: "HH:MM 24h, only if stated" },
          ends_on: { type: ["string", "null"], description: "YYYY-MM-DD, only if the article states this exact day" },
          end_time: { type: ["string", "null"], description: "HH:MM 24h, only if stated" },
          utc_offset: { type: ["string", "null"], description: "e.g. +08:00, only if the article states the time zone" },
          evidence: { type: "string", description: "Exact sentence copied verbatim from the article that contains the dates" },
        },
      },
    },
  },
} as const;

const INSTRUCTIONS = `You extract upcoming Mobile Legends: Bang Bang (MLBB) event schedules from one official MOONTON/MLBB announcement.
Rules:
- Only list an event when the article explicitly states a calendar day (day + month, year stated or unambiguous from the article) for its start or end.
- Never guess, infer or convert dates. Month-only or "coming soon" mentions are NOT events.
- Ignore the article's own publication/dateline date and results of matches that already finished.
- "evidence" must be copied word-for-word from the article and must contain the dates.
- category: skins (new/upcoming skins), starlight (Starlight pass), diamond (diamond events/draws), recharge (top-up/recharge events), collab (collaborations), esports (tournaments, stages, finals), special (anything else).
- Return {"events": []} when there is nothing that qualifies.`;

async function extractEvents(a: Article, text: string): Promise<AiEvent[]> {
  const res = await generateResponse({
    model: "openai/gpt-6-astra",
    instructions: INSTRUCTIONS,
    reasoning: { effort: "low" },
    input: [{ role: "user", content: `Source: ${a.source}\nURL: ${a.url}\nPublished: ${a.published ?? "unknown"}\nTitle: ${a.title}\n\nArticle:\n${text}\n\nReturn JSON.` }],
    text: { format: { type: "json_schema", name: "mlbb_events", strict: true, schema: EVENT_SCHEMA } },
  });
  let out = "";
  for (const item of res.output ?? []) {
    if (item.type !== "message") continue;
    for (const c of item.content ?? []) if (c.type === "output_text") out += c.text;
  }
  if (!out) return [];
  const parsed = JSON.parse(out) as { events?: AiEvent[] };
  return Array.isArray(parsed.events) ? parsed.events : [];
}

type Counts = { inserted: number; updated: number; unchanged: number };

async function saveEvent(db: SupabaseClient, ev: CleanEvent, a: Article, counts: Counts) {
  const key = titleKey(ev.title);
  const now = new Date().toISOString();
  let q = db.from("mlbb_events").select("id,origin,starts_at,ends_at").limit(1);
  q = key ? q.eq("title_key", key) : q.eq("title", ev.title).eq("source_url", a.url);
  const { data: existing, error } = await q.maybeSingle();
  if (error) throw new Error(`lookup: ${error.message}`);

  if (!existing) {
    const { error: e } = await db.from("mlbb_events").insert({
      title: ev.title, category: ev.category, description: ev.description,
      starts_at: ev.starts_at, ends_at: ev.ends_at, evidence: ev.evidence,
      source_name: a.source, source_url: a.url,
      origin: "sync", review_status: "pending", verification: "tentative", needs_review: true,
      last_synced_at: now,
    });
    if (e) throw new Error(`insert: ${e.message}`);
    counts.inserted++;
    return;
  }
  if (existing.origin !== "sync") { counts.unchanged++; return; } // admin-entered events are never overwritten

  const same = (x: string | null, y: string | null) => (x ? Date.parse(x) : null) === (y ? Date.parse(y) : null);
  if (same(existing.starts_at, ev.starts_at) && same(existing.ends_at, ev.ends_at)) {
    await db.from("mlbb_events").update({ last_synced_at: now }).eq("id", existing.id);
    counts.unchanged++;
    return;
  }
  // Schedule changed at the source: update it, but drop back to Tentative until an admin re-checks.
  const { error: e } = await db.from("mlbb_events").update({
    starts_at: ev.starts_at, ends_at: ev.ends_at, evidence: ev.evidence, source_url: a.url, source_name: a.source,
    verification: "tentative", needs_review: true, schedule_changed_at: now, last_synced_at: now,
  }).eq("id", existing.id);
  if (e) throw new Error(`update: ${e.message}`);
  counts.updated++;
}

async function runSync(db: SupabaseClient, runId: string) {
  const counts: Counts = { inserted: 0, updated: 0, unchanged: 0 };
  const sources: Array<{ name: string; url: string; ok: boolean; articles: number; error?: string }> = [];
  const errors: string[] = [];
  let checked = 0, analyzed = 0, found = 0, aiStopped = false;
  const cutoff = new Date(Date.now() - MAX_AGE_DAYS * 864e5).toISOString().slice(0, 10);

  for (const src of SOURCES) {
    let articles: Article[] = [];
    try {
      const html = await fetchText(src.url);
      articles = src.url.includes("mlbbesports") ? parseMlbbEsportsList(html) : parseMoontonList(html);
      if (!articles.length) throw new Error("No articles found — the page layout may have changed");
      sources.push({ name: src.name, url: src.url, ok: true, articles: articles.length });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      sources.push({ name: src.name, url: src.url, ok: false, articles: 0, error: msg });
      errors.push(`${src.name}: ${msg}`);
      continue;
    }

    const recent = articles.filter((a) => !a.published || a.published >= cutoff).slice(0, MAX_PER_SOURCE);
    for (const a of recent) {
      checked++;
      try {
        const text = articleText(await fetchText(a.url), a.title);
        const hash = await sha256(text);
        const { data: seen } = await db.from("mlbb_event_source_items").select("content_hash,analyzed_at").eq("url", a.url).maybeSingle();
        const base = { url: a.url, source_name: a.source, title: a.title, published_on: a.published, last_seen_at: new Date().toISOString() };
        if (seen?.analyzed_at && seen.content_hash === hash) { await db.from("mlbb_event_source_items").update({ last_seen_at: base.last_seen_at }).eq("url", a.url); continue; }
        if (!hasExplicitDate(text)) {
          await db.from("mlbb_event_source_items").upsert({ ...base, content_hash: hash, analyzed_at: new Date().toISOString(), events_found: 0, last_error: null });
          continue;
        }
        if (aiStopped) continue;
        analyzed++;
        const events = cleanEvents(await extractEvents(a, text), text);
        found += events.length;
        for (const ev of events) await saveEvent(db, ev, a, counts);
        await db.from("mlbb_event_source_items").upsert({ ...base, content_hash: hash, analyzed_at: new Date().toISOString(), events_found: events.length, last_error: null });
      } catch (e) {
        let msg = e instanceof Error ? e.message : String(e);
        if (e instanceof GatewayError) {
          msg = `AI ${e.code}${e.httpStatus ? ` (${e.httpStatus})` : ""}: ${e.message}`;
          if (e instanceof PaymentRequiredError) { aiStopped = true; msg = "AI credits are used up — top up credits, then run the sync again."; }
        }
        errors.push(`${a.url}: ${msg}`);
        await db.from("mlbb_event_source_items").upsert({ url: a.url, source_name: a.source, title: a.title, published_on: a.published, last_error: msg.slice(0, 500), last_seen_at: new Date().toISOString() });
      }
    }
  }

  const anySourceOk = sources.some((s) => s.ok);
  const status = !anySourceOk ? "error" : errors.length ? "partial" : "success";
  await db.from("mlbb_event_sync_runs").update({
    status, finished_at: new Date().toISOString(), articles_checked: checked, articles_analyzed: analyzed,
    events_found: found, inserted: counts.inserted, updated: counts.updated, unchanged: counts.unchanged,
    sources, errors: errors.slice(0, 50),
  }).eq("id", runId);
  return { status, checked, analyzed, found, ...counts, errors };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const db = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  let trigger: "schedule" | "manual" = "schedule";
  let actor: string | null = null;
  if (authenticateCronRequest(req) !== null) {
    // Not the scheduler: must be a signed-in admin.
    const auth = req.headers.get("Authorization") ?? "";
    if (!auth.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
    const userDb = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { data: claims } = await userDb.auth.getClaims(auth.slice(7));
    actor = (claims?.claims?.sub as string | undefined) ?? null;
    if (!actor) return json({ error: "Unauthorized" }, 401);
    const { data: isAdmin } = await db.rpc("has_role", { _user_id: actor, _role: "admin" });
    if (!isAdmin) return json({ error: "Forbidden" }, 403);
    trigger = "manual";
  }

  // One run at a time; a run stuck for 15+ minutes is treated as dead.
  const { data: running } = await db.from("mlbb_event_sync_runs").select("id")
    .eq("status", "running").gte("started_at", new Date(Date.now() - 15 * 60e3).toISOString()).limit(1);
  if (running?.length) return json({ error: "A sync is already running. Try again in a few minutes." }, 409);

  const { data: run, error } = await db.from("mlbb_event_sync_runs").insert({ trigger, triggered_by: actor }).select("id").single();
  if (error || !run) return json({ error: `Could not start sync: ${error?.message}` }, 500);

  try {
    const result = await runSync(db, run.id);
    return json({ ok: true, run_id: run.id, ...result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("mlbb-events-sync failed", msg);
    await db.from("mlbb_event_sync_runs").update({ status: "error", finished_at: new Date().toISOString(), errors: [msg] }).eq("id", run.id);
    return json({ ok: false, run_id: run.id, error: msg }, 500);
  }
});
