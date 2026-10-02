// Shared KGameShop helpers: provider status mapping, VPS status check and
// once-per-status Telegram notifications. Secrets stay server-side.
export const VPS = "https://study.kaungcomputer.com/api/kgameshop";
const CHAT_ID = "7642545999";

// Only an explicit "failed" fails (refunds); everything unclear stays Processing.
export const mapStatus = (s: string | undefined) => {
  const v = String(s || "").toLowerCase();
  if (v === "completed") return "finished";
  if (v === "failed") return "rejected";
  return "approved";
};

const LABEL: Record<string, string> = {
  pending: "⏳ Pending", approved: "🔄 Processing", finished: "✅ Completed",
  rejected: "❌ Failed (refunded)", cancelled: "🚫 Cancelled",
};

export async function applyProvider(admin: any, orderId: string, r: any, httpOk: boolean) {
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
}

// Read-only status check; never places a new order.
export async function checkProviderStatus(admin: any, orderId: string) {
  const secret = Deno.env.get("KGAMESHOP_VPS_SECRET");
  if (!secret) return { error: "VPS secret not configured" };
  const { data: order } = await admin.from("orders").select("id,status,provider_order_id").eq("id", orderId).maybeSingle();
  if (!order?.provider_order_id) return { error: "No provider order ID yet" };
  // Do not override admin-final decisions
  if (["finished", "rejected", "cancelled"].includes(order.status)) return { status: order.status, unchanged: true };
  const res = await fetch(`${VPS}/order/${encodeURIComponent(order.provider_order_id)}`, { headers: { "X-Store-Secret": secret } });
  const r = await res.json().catch(() => ({}));
  if (!res.ok && !r?.status) return { status: order.status, error: `VPS returned ${res.status}` };
  const status = await applyProvider(admin, order.id, { ...r, provider_order_id: order.provider_order_id }, res.ok);
  return { status };
}

// Verifies the player name via the VPS (server-side secret). Never charges anything.
export async function checkPlayer(input: { game: string; player_id: string; server_id?: string | null; region?: string | null }) {
  const secret = Deno.env.get("KGAMESHOP_VPS_SECRET");
  if (!secret) return { ok: false, can_pay: false, message: "Player check is not configured" };
  const payload: Record<string, string> = { game: input.game, player_id: input.player_id };
  if (input.server_id) payload.server_id = input.server_id;
  if (input.region) payload.region = input.region;
  try {
    const res = await fetch(`${VPS}/check-player`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Store-Secret": secret },
      body: JSON.stringify(payload),
    });
    const r = await res.json().catch(() => ({}));
    const d = r?.data && typeof r.data === "object" ? { ...r.data, ...r } : r;
    const username = String(d?.username ?? d?.player_name ?? d?.nickname ?? d?.name ?? "").trim();
    const ok = res.ok && d?.ok !== false && !!username;
    const can_pay = ok && d?.can_pay !== false;
    const message = String(d?.message || d?.error || (ok ? "" : `Player not found (${res.status})`)).slice(0, 200);
    return { ok, can_pay, username: username || null, message };
  } catch (_e) {
    return { ok: false, can_pay: false, message: "Could not reach player check service" };
  }
}

// Sends one Telegram message per distinct status; claims atomically to avoid duplicates.
export async function notifyKgOrder(admin: any, orderId: string) {
  const token = Deno.env.get("TELEGRAM_BOT_TOKEN");
  if (!token) return false;
  const { data: o } = await admin.from("orders")
    .select("id,user_id,product_id,status,price,game_id,server_id,game_name,plan_name,provider_order_id,provider_status,provider_message,telegram_notified_status,created_at")
    .eq("id", orderId).maybeSingle();
  if (!o || o.telegram_notified_status === o.status) return false;

  let q = admin.from("orders").update({ telegram_notified_status: o.status }).eq("id", o.id);
  q = o.telegram_notified_status == null ? q.is("telegram_notified_status", null) : q.eq("telegram_notified_status", o.telegram_notified_status);
  const { data: claimed } = await q.select("id").maybeSingle();
  if (!claimed) return false;

  const [{ data: profile }, { data: product }] = await Promise.all([
    admin.from("profiles").select("name").eq("id", o.user_id).maybeSingle(),
    admin.from("products").select("name,kgameshop_game").eq("id", o.product_id).maybeSingle(),
  ]);
  const isNew = o.telegram_notified_status == null;
  const line = (l: string, v: unknown) => (v === null || v === undefined || v === "" ? "" : `${l}: ${v}\n`);
  const text =
    `${isNew ? "🤖 New API Order (KGameShop)" : "🔔 API Order Status Changed"}\n\n` +
    `🆔 Order ID: #${String(o.id).slice(0, 8).toUpperCase()}\n` +
    `📦 Package: ${product?.name ?? o.plan_name ?? "-"}\n` +
    line("🎮 Game", product?.kgameshop_game) +
    line("🎯 Player ID", o.game_id) +
    line("🌐 Server ID", o.server_id) +
    line("🧑‍💻 Player Name", String(o.game_name ?? "").match(/\(([^)]+)\)\s*$/)?.[1] ?? null) +
    `💰 Price: ${new Intl.NumberFormat("en-US").format(Number(o.price) || 0)} MMK\n` +
    `👤 Customer: ${profile?.name ?? "Unknown"}\n` +
    line("🧾 Provider order", o.provider_order_id) +
    line("📡 Provider status", o.provider_status) +
    line("💬 Message", o.provider_message) +
    `📌 Status: ${LABEL[o.status] ?? o.status}\n` +
    (isNew ? "" : line("↩️ Previous", LABEL[o.telegram_notified_status] ?? o.telegram_notified_status)) +
    `📅 ${new Date().toLocaleString("en-GB", { timeZone: "Asia/Yangon" })}`;

  const active = !["finished", "rejected", "cancelled"].includes(o.status) && o.provider_order_id;
  const body: Record<string, unknown> = { chat_id: CHAT_ID, text };
  if (active) body.reply_markup = { inline_keyboard: [[{ text: "🔍 Check status", callback_data: `kgcheck:${o.id}` }]] };
  const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  if (!r.ok) console.error("kg telegram send failed", r.status, await r.text());
  return r.ok;
}
