import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { kgFetch, notifyAdminTelegram, mapProviderStatus, shortId, getApiKey } from '../_shared/kgameshop.ts';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const supabase = createClient(supabaseUrl, serviceKey);

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: 'Invalid JSON body' }, 400); }

  const orderId = typeof body.order_id === 'string' ? body.order_id.trim() : '';
  const force = body.force === true; // admin retry, bypasses the global toggle snapshot
  if (!UUID_RE.test(orderId)) return json({ error: 'order_id must be a valid UUID' }, 400);

  // ---- Auth: internal service call, or an authenticated admin ----
  const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  let isAdmin = token === serviceKey;
  if (!isAdmin) {
    if (!token) return json({ error: 'Unauthorized' }, 401);
    const authClient = createClient(supabaseUrl, anonKey);
    const { data: claims } = await authClient.auth.getClaims(token);
    const uid = claims?.claims?.sub as string | undefined;
    if (!uid) return json({ error: 'Unauthorized' }, 401);
    const { data: adminFlag } = await supabase.rpc('has_role', { _user_id: uid, _role: 'admin' });
    if (!adminFlag) return json({ error: 'Forbidden: admin only' }, 403);
    isAdmin = true;
  }

  // ---- Load order + product mapping ----
  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .select('id, status, order_type, game_id, server_id, product_id, price, auto_topup_eligible, provider_order_id, fulfillment_provider, provider_status')
    .eq('id', orderId)
    .maybeSingle();

  if (orderErr) {
    console.error('order read failed', orderErr);
    return json({ error: 'Failed to read order' }, 500);
  }
  if (!order) return json({ error: 'Order not found' }, 404);

  // ---- Duplicate protection: never create a second provider order ----
  if (order.provider_order_id) {
    return json({ ok: true, skipped: true, reason: 'already_sent', provider_order_id: order.provider_order_id });
  }

  // ---- Eligibility (any failure => silently keep the existing manual workflow) ----
  if (!getApiKey()) return json({ ok: true, skipped: true, reason: 'provider_not_configured' });

  const { data: setting } = await supabase
    .from('ad_settings').select('setting_value').eq('setting_key', 'kgameshop_auto_topup_enabled').maybeSingle();
  const globalOn = setting?.setting_value === 'true';
  if (!globalOn) return json({ ok: true, skipped: true, reason: 'auto_topup_off' });

  // Old orders placed while the toggle was OFF stay manual forever (unless an admin retries explicitly).
  if (!order.auto_topup_eligible && !force) {
    return json({ ok: true, skipped: true, reason: 'order_not_eligible' });
  }

  const allowedStatuses = force ? ['approved', 'failed', 'processing'] : ['approved'];
  if (!allowedStatuses.includes(order.status)) {
    return json({ ok: true, skipped: true, reason: `status_${order.status}` });
  }

  const { data: product } = await supabase
    .from('products')
    .select('name, category, kgameshop_enabled, kgameshop_game, kgameshop_product_id, kgameshop_region')
    .eq('id', order.product_id)
    .maybeSingle();

  if (!product?.kgameshop_enabled || !product.kgameshop_game || !product.kgameshop_product_id) {
    return json({ ok: true, skipped: true, reason: 'product_not_mapped' });
  }
  if (!order.game_id) return json({ ok: true, skipped: true, reason: 'missing_player_id' });

  const label = `#${shortId(order.id)}`;
  const productName = product.name ?? '-';

  const markManualReview = async (message: string, alert: string) => {
    await supabase.from('orders').update({
      fulfillment_provider: 'kgameshop',
      provider_status: 'manual_review',
      provider_message: message.slice(0, 1000),
    }).eq('id', order.id);
    await notifyAdminTelegram(alert);
  };

  // ---- Optional balance guard ----
  const balanceRes = await kgFetch<any>('/balance');
  if (balanceRes.ok) {
    const raw = balanceRes.data?.balance ?? balanceRes.data?.data?.balance;
    const balance = Number(raw);
    if (Number.isFinite(balance) && balance <= 0) {
      await markManualReview(
        `Insufficient provider balance ($${balance})`,
        `⚠️ KGameShop Balance Low\n\nAuto Top-Up order could not be processed.\n\nOrder: ${label}\nProduct: ${productName}\nCurrent balance: $${balance}\n\nPlease add balance or disable Auto Top-Up.`,
      );
      return json({ ok: false, reason: 'insufficient_balance' });
    }
  }

  // ---- Player validation (Mobile Legends style games) ----
  if (order.server_id && /mlbb|mobile-?legends/i.test(String(product.kgameshop_game))) {
    const check = await kgFetch<any>('/check-player', {
      method: 'POST',
      body: {
        game: 'mobile-legends',
        player_id: String(order.game_id),
        server_id: String(order.server_id),
        ...(product.kgameshop_region ? { region: product.kgameshop_region } : {}),
      },
    });
    const canPay = check.data?.can_pay ?? check.data?.data?.can_pay;
    if (!check.ok || canPay === false) {
      const reason = check.error || check.data?.message || 'Player validation failed';
      await markManualReview(
        `Player check failed: ${reason}`,
        `❌ Auto Top-Up Failed\nOrder ${label}\n${productName}\nStatus: Manual review\nReason: ${reason}`,
      );
      return json({ ok: false, reason: 'player_check_failed', details: reason });
    }
  }

  // ---- Atomic claim so double-clicks / retries cannot create two provider orders ----
  const { data: claimed, error: claimErr } = await supabase
    .from('orders')
    .update({
      status: 'processing',
      fulfillment_provider: 'kgameshop',
      provider_status: 'creating',
      provider_sent_at: new Date().toISOString(),
    })
    .eq('id', order.id)
    .is('provider_order_id', null)
    .in('status', allowedStatuses)
    .select('id')
    .maybeSingle();

  if (claimErr) {
    console.error('claim failed', claimErr);
    return json({ error: 'Failed to claim order' }, 500);
  }
  if (!claimed) return json({ ok: true, skipped: true, reason: 'already_claimed' });

  // ---- Create the provider order ----
  const created = await kgFetch<any>('/orders', {
    method: 'POST',
    body: {
      game: product.kgameshop_game,
      product_id: String(product.kgameshop_product_id),
      player_id: String(order.game_id),
      ...(order.server_id ? { server_id: String(order.server_id) } : {}),
    },
  });

  const payload = created.data?.order ?? created.data?.data ?? created.data;
  const providerOrderId = payload?.order_id ?? payload?.id ?? null;

  if (!created.ok || !providerOrderId) {
    const reason = created.error || 'Provider did not return an order id';
    await supabase.from('orders').update({
      status: 'failed',
      provider_status: 'failed',
      provider_message: String(reason).slice(0, 1000),
    }).eq('id', order.id);
    await notifyAdminTelegram(
      `❌ Auto Top-Up Failed\nOrder ${label}\n${productName}\nStatus: Failed (manual review)\nReason: ${String(reason).slice(0, 300)}`,
    );
    return json({ ok: false, reason: 'provider_error', details: reason });
  }

  const providerStatus = String(payload?.status ?? 'processing');
  const localStatus = mapProviderStatus(providerStatus);

  await supabase.from('orders').update({
    provider_order_id: String(providerOrderId),
    provider_status: providerStatus,
    provider_cost: Number.isFinite(Number(payload?.price)) ? Number(payload?.price) : null,
    provider_currency: payload?.currency ?? null,
    provider_message: payload?.message ?? null,
    status: localStatus,
  }).eq('id', order.id);

  await notifyAdminTelegram(
    `🛒 Auto Top-Up Sent\nOrder ${label}\n${productName}\nPlayer ID: ${order.game_id}` +
    (order.server_id ? `\nServer ID: ${order.server_id}` : '') +
    `\nProvider Order: ${providerOrderId}\nStatus: ${localStatus === 'completed' ? 'Completed' : 'Processing'}`,
  );

  return json({ ok: true, provider_order_id: String(providerOrderId), status: localStatus });
});
