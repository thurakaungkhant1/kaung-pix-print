import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const secret = Deno.env.get('SMILE_ONE_CALLBACK_SECRET');
  if (!secret) {
    console.error('SMILE_ONE_CALLBACK_SECRET is not configured');
    return json({ error: 'Callback secret not configured' }, 500);
  }

  const provided =
    req.headers.get('X-Callback-Secret') ??
    (req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') ?? null);
  if (!safeEqual(provided, secret)) return json({ error: 'Unauthorized' }, 401);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const orderId = typeof body.order_id === 'string' ? body.order_id.trim() : '';
  const status = typeof body.auto_fill_status === 'string' ? body.auto_fill_status.trim().toLowerCase() : '';
  const messageRaw = typeof body.message === 'string' ? body.message.trim() : '';
  const message = messageRaw.slice(0, 1000) || null;

  const errors: string[] = [];
  if (!UUID_RE.test(orderId)) errors.push('order_id must be a valid UUID');
  if (!['completed', 'failed'].includes(status)) errors.push('auto_fill_status must be "completed" or "failed"');
  if (errors.length) return json({ error: errors }, 400);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: order, error: readErr } = await supabase
    .from('orders')
    .select('id, status, auto_fill_status')
    .eq('id', orderId)
    .maybeSingle();

  if (readErr) {
    console.error('order read failed', readErr);
    return json({ error: 'Failed to read order' }, 500);
  }
  if (!order) return json({ error: 'Order not found' }, 404);

  // Idempotency: ignore repeat callbacks for an already-finalised auto fill.
  if (order.auto_fill_status === 'completed' || order.auto_fill_status === 'failed') {
    return json({ ok: true, skipped: true, auto_fill_status: order.auto_fill_status });
  }

  const { error: upErr } = await supabase
    .from('orders')
    .update({
      status: status === 'completed' ? 'completed' : 'failed',
      auto_fill_status: status,
      auto_fill_completed_at: new Date().toISOString(),
      auto_fill_message: message,
    })
    .eq('id', orderId);

  if (upErr) {
    console.error('order update failed', upErr);
    return json({ error: 'Failed to update order' }, 500);
  }

  return json({ ok: true, order_id: orderId, status: status === 'completed' ? 'completed' : 'failed' });
});
