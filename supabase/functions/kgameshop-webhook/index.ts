import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { notifyAdminTelegram, mapProviderStatus, providerOutcome, shortId } from '../_shared/kgameshop.ts';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

function safeEqual(a: string | null, b: string): boolean {
  if (!a || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const secret = Deno.env.get('KGAMESHOP_WEBHOOK_SECRET');
  if (secret) {
    const provided =
      req.headers.get('X-Webhook-Secret') ??
      req.headers.get('X-API-Key') ??
      (req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') ?? null);
    if (!safeEqual(provided, secret)) return json({ error: 'Unauthorized' }, 401);
  }

  let body: any;
  try { body = await req.json(); } catch { return json({ error: 'Invalid JSON body' }, 400); }

  const providerOrder = body?.order ?? body;
  const providerOrderId = typeof providerOrder?.order_id === 'string' ? providerOrder.order_id.trim() : '';
  const providerStatus = typeof providerOrder?.status === 'string' ? providerOrder.status.trim() : '';
  if (!providerOrderId || !providerStatus) {
    return json({ error: 'order.order_id and order.status are required' }, 400);
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: order, error: readErr } = await supabase
    .from('orders')
    .select('id, status, provider_status, product_id, game_id')
    .eq('provider_order_id', providerOrderId)
    .maybeSingle();

  if (readErr) {
    console.error('order read failed', readErr);
    return json({ error: 'Failed to read order' }, 500);
  }
  // Unknown provider order: acknowledge, never create anything locally.
  if (!order) return json({ ok: true, skipped: true, reason: 'unknown_provider_order' });

  const local = mapProviderStatus(providerStatus);
  const outcome = providerOutcome(providerStatus);
  const currentOutcome = providerOutcome(String(order.provider_status || ''));

  // Idempotency: once a provider order is finalised (completed/failed), later
  // deliveries of the same or an earlier state change nothing.
  if (currentOutcome !== 'processing') {
    return json({ ok: true, skipped: true, reason: 'already_final' });
  }

  // Only move a local order that is still under provider control.
  let updateQuery = supabase
    .from('orders')
    .update({
      provider_status: providerStatus,
      provider_message: providerOrder?.message ?? null,
      provider_cost: Number.isFinite(Number(providerOrder?.price)) ? Number(providerOrder?.price) : null,
      provider_currency: providerOrder?.currency ?? null,
      status: local,
    })
    .eq('id', order.id);
  updateQuery = order.provider_status
    ? updateQuery.eq('provider_status', order.provider_status)
    : updateQuery.is('provider_status', null);
  const { data: updated, error: upErr } = await updateQuery.select('id').maybeSingle();

  if (upErr) {
    console.error('order update failed', upErr);
    return json({ error: 'Failed to update order' }, 500);
  }
  // Another concurrent delivery already applied a change: do not notify twice.
  if (!updated) return json({ ok: true, skipped: true, reason: 'concurrent_update' });

  const { data: product } = await supabase
    .from('products').select('name').eq('id', order.product_id).maybeSingle();
  const label = `#${shortId(order.id)}`;
  const pkg = providerOrder?.package ?? product?.name ?? '-';

  if (outcome === 'completed') {
    await notifyAdminTelegram(`✅ Auto Top-Up Successful\nOrder ${label}\n${pkg}\nPlayer: ${order.game_id ?? '-'}\nStatus: Completed`);
  } else if (outcome === 'failed') {
    await notifyAdminTelegram(`❌ Auto Top-Up Failed\nOrder ${label}\n${pkg}\nStatus: Back to manual (Approved)\nReason: ${providerOrder?.message ?? 'Provider reported failure'}`);
  }

  return json({ ok: true, order_id: order.id, status: local });

});
