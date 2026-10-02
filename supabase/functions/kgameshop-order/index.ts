// KGameShop package purchase + auto top-up via the owner's VPS.
// Price is computed server-side from the VPS catalog and the admin MMK rate.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { VPS, applyProvider as applyShared, checkPlayer, kgameshopNeedsServer, checkProviderStatus, notifyKgOrder } from "../_shared/kgameshop.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (o: unknown, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { ...cors, "Content-Type": "application/json" } });

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

  const applyProvider = (orderId: string, r: any, httpOk: boolean) => applyShared(admin, orderId, r, httpOk);

  // Admin: re-check provider status for an order (read-only, no new order)
  if (body.action === "check") {
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: uid, _role: "admin" });
    if (!isAdmin) return json({ error: "Forbidden" }, 403);
    const r = await checkProviderStatus(admin, String(body.order_id || ""));
    if ((r as any).error && !(r as any).status) return json({ error: (r as any).error }, 400);
    await notifyKgOrder(admin, String(body.order_id));
    return json({ ok: true, status: (r as any).status });
  }

  // Admin only: KGameShop account balance via VPS (secret stays server-side)
  if (body.action === "balance") {
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: uid, _role: "admin" });
    if (!isAdmin) return json({ error: "Forbidden" }, 403);
    const secret = Deno.env.get("KGAMESHOP_VPS_SECRET");
    if (!secret) return json({ error: "VPS secret not configured" }, 500);
    try {
      const res = await fetch(`${VPS}/balance`, { headers: { "X-Store-Secret": secret, Accept: "application/json" } });
      const r = await res.json().catch(() => ({}));
      const d = r?.data && typeof r.data === "object" ? { ...r.data, ...r } : r;
      if (!res.ok || d?.ok === false) return json({ error: String(d?.message || d?.error || `VPS returned ${res.status}`).slice(0, 200) }, 502);
      let balance: number | null = null; let currency: string | null = d?.currency ? String(d.currency) : null;
      const b = d?.balance ?? d?.amount ?? d?.credit;
      if (b && typeof b === "object") { const [k, v] = Object.entries(b)[0] ?? []; if (k) { currency = String(k).toUpperCase(); balance = Number(v); } }
      else if (b !== undefined && b !== null) balance = Number(b);
      return json({ ok: true, balance: Number.isFinite(balance) ? balance : null, currency, checked_at: new Date().toISOString() });
    } catch {
      return json({ error: "Could not reach VPS" }, 502);
    }
  }

  const game = String(body.game || "").trim().slice(0, 100);
  const playerId = String(body.player_id || "").trim().slice(0, 100);
  const needsServer = kgameshopNeedsServer(game);
  const serverId = needsServer ? String(body.server_id || "").trim().slice(0, 50) || null : null;
  if (needsServer && !serverId) return json({ error: "Server ID is required for this game" }, 400);
  const region = String(body.region || "").trim().slice(0, 20) || null;

  // Buyer: verify player name only (no charge)
  if (body.action === "check_player") {
    if (!game || !playerId) return json({ error: "game and player_id are required" }, 400);
    return json(await checkPlayer({ game, player_id: playerId, server_id: serverId, region }));
  }

  // Buyer: purchase a VPS package
  const productId = String(body.product_id || "").trim();
  if (!game || !productId || !playerId) return json({ error: "game, product_id and player_id are required" }, 400);

  const catRes = await fetch(`${VPS}/products?game=${encodeURIComponent(game)}`, { headers: { Accept: "application/json" } });
  const cat = await catRes.json().catch(() => ({}));
  const list = Array.isArray(cat) ? cat : cat?.products || cat?.data || [];
  const item = list.find((p: any) => String(p.product_id) === productId);
  if (!catRes.ok || !item) return json({ error: "Package is not available" }, 400);

  // Re-verify the player server-side before charging; block if not found or can_pay is false.
  const player = await checkPlayer({ game, player_id: playerId, server_id: serverId, region: region || cat?.region || null });
  if (!player.ok) return json({ error: player.message || "Player name could not be verified" }, 400);
  if (!player.can_pay) return json({ error: player.message || "This player cannot be topped up right now" }, 400);

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
      description: item.bundle_summary || null, category: game, points_value: 0, status: "available",
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
    p_player_name: player.username,
  });
  if (rpcErr) return json({ error: rpcErr.message }, 400);
  const orderId = (rpc as any)?.[0]?.order_id as string;
  const newBalance = (rpc as any)?.[0]?.new_balance;

  await admin.from("orders").update({ provider_cost: usd, provider_currency: "USD", fulfillment_provider: "kgameshop" }).eq("id", orderId);

  if (!secret) {
    await notifyKgOrder(admin, orderId).catch((e) => console.error("notify", e));
    return json({ ok: true, order_id: orderId, new_balance: newBalance, status: "pending", auto: false });
  }

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
  await notifyKgOrder(admin, orderId).catch((e) => console.error("notify", e));
  return json({ ok: true, order_id: orderId, new_balance: newBalance, status, auto: true });
});
