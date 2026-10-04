// Inbound order-status webhook from the KokHant / KGameShop provider.
// Auth: shared secret KOKHANT_WEBHOOK_SECRET (header, bearer, query, or HMAC-SHA256 of the raw body).
// Idempotent: final orders are never changed again and status writes are conditional.
import { createClient } from "npm:@supabase/supabase-js@2";
import { notifyKgOrder } from "../_shared/kgameshop.ts";

const json = (o: unknown, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { "Content-Type": "application/json" } });

const safeEqual = (a: string, b: string) => {
  if (!a || a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
};

async function hmacHex(secret: string, raw: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(raw));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const pick = (o: any, keys: string[]) => {
  for (const k of keys) {
    const v = o?.[k];
    if (v !== undefined && v !== null && String(v).trim() !== "") return String(v).trim();
  }
  return "";
};

// Only explicit success/failure words are final; partial/refunded/unknown stay for admin review.
const mapStatus = (s: string): "approved" | "finished" | "rejected" | null => {
  const v = s.toLowerCase().replace(/[\s-]+/g, "_");
  if (["completed", "complete", "success", "succeeded", "successful", "done", "delivered"].includes(v)) return "finished";
  if (["failed", "failure", "fail", "error"].includes(v)) return "rejected";
  if (["processing", "pending", "in_progress", "queued", "partial", "partially_completed", "refunded", "partial_refund"].includes(v)) return "approved";
  return null;
};

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const secret = Deno.env.get("KOKHANT_WEBHOOK_SECRET");
  if (!secret) { console.error("KOKHANT_WEBHOOK_SECRET not configured"); return json({ error: "Webhook not configured" }, 503); }

  const raw = await req.text();
  const url = new URL(req.url);
  const provided =
    req.headers.get("x-webhook-secret") ?? req.headers.get("x-store-secret") ??
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? url.searchParams.get("secret") ?? "";
  const sigHeader = (req.headers.get("x-signature") ?? req.headers.get("x-hub-signature-256") ?? "").replace(/^sha256=/i, "").toLowerCase();
  const authed = safeEqual(provided, secret) || (!!sigHeader && safeEqual(sigHeader, await hmacHex(secret, raw)));
  if (!authed) return json({ error: "Unauthorized" }, 401);

  let body: any;
  try { body = JSON.parse(raw); } catch { return json({ error: "Invalid JSON" }, 400); }
  const d = body?.data && typeof body.data === "object" ? { ...body, ...body.data } : body;
  console.log("kokhant webhook keys", Object.keys(d ?? {}).join(","));

  const reference = pick(d, ["reference", "order_reference", "merchant_order_id", "external_id", "out_trade_no", "custom_id", "client_order_id"]);
  const providerId = pick(d, ["provider_order_id", "order_id", "orderId", "order_no", "id", "transaction_id"]);
  const rawStatus = pick(d, ["status", "order_status", "state", "result"]);
  const message = pick(d, ["message", "msg", "note", "reason", "error"]).slice(0, 500) || null;
  const next = mapStatus(rawStatus);
  if (!rawStatus) return json({ error: "Missing status field" }, 400);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const cols = "id,status,provider_order_id,provider_status,fulfillment_provider";
  let order: any = null;
  for (const cand of [reference, providerId].filter((v) => UUID_RE.test(v))) {
    const { data } = await admin.from("orders").select(cols).eq("id", cand).eq("fulfillment_provider", "kgameshop").maybeSingle();
    if (data) { order = data; break; }
  }
  if (!order && providerId) {
    const { data } = await admin.from("orders").select(cols).eq("provider_order_id", providerId).eq("fulfillment_provider", "kgameshop").limit(1).maybeSingle();
    order = data;
  }
  if (!order) return json({ error: "Order not found" }, 404);

  // Duplicate / late delivery: final orders and admin decisions are never overwritten.
  if (["finished", "rejected", "cancelled"].includes(order.status)) return json({ ok: true, duplicate: true, status: order.status });
  if (!next) {
    await admin.from("orders").update({ provider_status: rawStatus.slice(0, 50), provider_message: message }).eq("id", order.id);
    return json({ ok: true, ignored: true, reason: "Unknown status kept for admin review" });
  }
  if (order.status === next && order.provider_status === rawStatus) return json({ ok: true, duplicate: true, status: next });

  const update: Record<string, unknown> = { status: next, provider_status: rawStatus.slice(0, 50), provider_message: message };
  if (!order.provider_order_id && providerId && providerId !== order.id) update.provider_order_id = providerId;
  // Conditional write: only applies if nobody changed the order since we read it (race-safe).
  const { data: changed, error } = await admin.from("orders").update(update).eq("id", order.id).eq("status", order.status).select("id").maybeSingle();
  if (error) { console.error("update failed", error); return json({ error: "Update failed" }, 500); }
  if (!changed) return json({ ok: true, duplicate: true });

  await notifyKgOrder(admin, order.id).catch((e) => console.error("notify", e));
  return json({ ok: true, order_id: order.id, status: next });
});
