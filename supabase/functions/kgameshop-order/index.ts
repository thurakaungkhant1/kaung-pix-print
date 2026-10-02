// KGameShop package purchase + auto top-up via the owner's VPS.
// Price is computed server-side from the VPS catalog and the admin MMK rate.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const VPS = "https://study.kaungcomputer.com/api/kgameshop";
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (o: unknown, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { ...cors, "Content-Type": "application/json" } });

// Only an explicit "failed" result fails (and refunds) an order. Partial/refunded/
// unknown results and transport errors stay Processing for admin review.
const mapStatus = (s: string | undefined) => {
  const v = String(s || "").toLowerCase();
  if (v === "completed") return "finished";
  if (v === "failed") return "rejected";
  return "approved";
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const auth = req.headers.get("Authorization") || "";
  if (!auth.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

  const url = Deno.env.get("SUPABASE_URL")!;
  const userDb = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: claims } = await userDb.auth.getClaims(auth.slice(7));
  const uid = claims?.claims?.sub as string | undefined;
  if (!uid) return json({ error: "Unauthorized" }, 401);

  const secret = Deno.env.get("KGAMESHOP_VPS_SECRET");
  let body: any;
  try { body = await req.json(); } catch { return json({ error: "Invalid body" }, 400); }

  const applyProvider = async (orderId: string, r: any, httpOk: boolean) => {
    const status = mapStatus(r?.status);
    const update: Record<string, unknown> = {
      status,
      fulfillment_provider: "kgameshop",
      provider_status: String(r?.status || (httpOk ? "unknown" : "http_error")),
      provider_message: String(r?.message || r?.error || "").slice(0, 500) || null,
      provider_sent_at: new Date().toISOString(),
    };
    if (r?.provider_order_id) update.provider_order_id = String(r.provider_order_id);
    await admin.from("orders").update(update).eq("id", orderId);
    return status;
  };

  // Admin: re-check provider status for an order
  if (body.action === "check") {
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: uid, _role: "admin" });
    if (!isAdmin) return json({ error: "Forbidden" }, 403);
    if (!secret) return json({ error: "VPS secret not configured" }, 400);
    const { data: order } = await admin.from("orders").select("id,provider_order_id").eq("id", body.order_id).single();
    if (!order?.provider_order_id) return json({ error: "No provider order" }, 400);
    const res = await fetch(`${VPS}/order/${encodeURIComponent(order.provider_order_id)}`, { headers: { "X-Store-Secret": secret } });
    const r = await res.json().catch(() => ({}));
    const status = await applyProvider(order.id, { ...r, provider_order_id: order.provider_order_id }, res.ok);
    return json({ ok: true, status });
  }

  // Buyer: purchase a VPS package
  const game = String(body.game || "").trim();
  const productId = String(body.product_id || "").trim();
  const playerId = String(body.player_id || "").trim();
  const serverId = String(body.server_id || "").trim() || null;
  if (!game || !productId || !playerId) return json({ error: "game, product_id and player_id are required" }, 400);

  const catRes = await fetch(`${VPS}/products?game=${encodeURIComponent(game)}`, { headers: { Accept: "application/json" } });
  const cat = await catRes.json().catch(() => ({}));
  const list = Array.isArray(cat) ? cat : cat?.products || cat?.data || [];
  const item = list.find((p: any) => String(p.product_id) === productId);
  if (!catRes.ok || !item) return json({ error: "Package is not available" }, 400);

  const { data: rateRow } = await admin.from("ad_settings").select("setting_value").eq("setting_key", "usd_to_mmk_rate").maybeSingle();
  const rate = Number(rateRow?.setting_value || 0);
  if (!(rate > 0)) return json({ error: "MMK rate not configured" }, 500);
  const usd = Number(item.price_usd || 0);
  const autoPrice = Math.round(usd * rate);

  const { data: existing } = await admin.from("products").select("id,kgameshop_region")
    .eq("kgameshop_enabled", true).eq("kgameshop_game", game).eq("kgameshop_product_id", productId).limit(1).maybeSingle();
  let productRowId = existing?.id as number | undefined;
  if (!productRowId) {
    const { data: ins, error } = await admin.from("products").insert({
      name: String(item.name), price: autoPrice, cost_price: autoPrice, image_url: body.icon || "/placeholder.svg",
      description: item.bundle_summary || null, category: game, points_value: 0, status: "active",
      kgameshop_enabled: true, kgameshop_game: game, kgameshop_product_id: productId, kgameshop_region: "auto",
    }).select("id").single();
    if (error) return json({ error: error.message }, 500);
    productRowId = ins.id;
  } else if (existing?.kgameshop_region === "auto") {
    await admin.from("products").update({ price: autoPrice, cost_price: autoPrice, name: String(item.name) }).eq("id", productRowId);
  } else {
    await admin.from("products").update({ cost_price: autoPrice }).eq("id", productRowId);
  }

  const { data: rpc, error: rpcErr } = await userDb.rpc("purchase_product_wallet", {
    p_product_id: productRowId, p_quantity: 1, p_game_id: playerId, p_server_id: serverId,
    p_phone_number: null, p_plan_id: null, p_plan_name: String(item.name), p_delivery_address: "",
    p_player_name: body.player_name || null,
  });
  if (rpcErr) return json({ error: rpcErr.message }, 400);
  const orderId = (rpc as any)?.[0]?.order_id as string;
  const newBalance = (rpc as any)?.[0]?.new_balance;

  await admin.from("orders").update({ provider_cost: usd, provider_currency: "USD", fulfillment_provider: "kgameshop" }).eq("id", orderId);

  if (!secret) return json({ ok: true, order_id: orderId, new_balance: newBalance, status: "pending", auto: false });

  let status = "approved";
  try {
    const res = await fetch(`${VPS}/order`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Store-Secret": secret },
      body: JSON.stringify({ reference: orderId, game, product_id: productId, player_id: playerId, server_id: serverId }),
    });
    const r = await res.json().catch(() => ({}));
    status = await applyProvider(orderId, r, res.ok);
  } catch (e) {
    // Network issue: keep order Processing for admin to check
    await admin.from("orders").update({ status: "approved", provider_message: String(e).slice(0, 300) }).eq("id", orderId);
  }
  return json({ ok: true, order_id: orderId, new_balance: newBalance, status, auto: true });
});
