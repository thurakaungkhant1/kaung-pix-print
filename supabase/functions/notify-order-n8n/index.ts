import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

// Production n8n webhook. Override via N8N_ORDER_WEBHOOK_URL secret if it ever changes.
// Test endpoints (/webhook-test/...) must never be used here.
const N8N_WEBHOOK_URL =
  Deno.env.get('N8N_ORDER_WEBHOOK_URL') ??
  'https://n8n.kaungcomputer.com/webhook/kaung-digital-order';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { order_id } = await req.json();
    if (!order_id) {
      return new Response(JSON.stringify({ error: 'order_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: order, error } = await supabase
      .from('orders')
      .select('id, product_id, quantity, price, phone_number, payment_method, game_id, server_id, game_name, created_at')
      .eq('id', order_id)
      .maybeSingle();

    if (error || !order) {
      console.error('n8n notify: order fetch failed:', error);
      return new Response(JSON.stringify({ error: 'order not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: product } = await supabase
      .from('products')
      .select('name, category')
      .eq('id', order.product_id)
      .maybeSingle();

    const payload = {
      order_id: String(order.id).slice(0, 8).toUpperCase(),
      category: product?.category ?? '',
      product_id: String(order.product_id),
      product_name: product?.name ?? '',
      quantity: order.quantity,
      price: order.price,
      phone_number: order.phone_number ?? null,
      payment_method: order.payment_method ?? null,
      game_id: order.game_id ?? null,
      server_id: order.server_id ?? null,
      game_name: order.game_name ?? null,
      created_at: order.created_at,
    };

    console.log('Sending order to n8n production webhook', JSON.stringify({
      url: N8N_WEBHOOK_URL,
      method: 'POST',
      contentType: 'application/json',
      payload: { ...payload, phone_number: payload.phone_number ? '***' : null },
    }));

    const res = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const responseText = await res.text().catch(() => '');
    console.log('n8n webhook response', res.status, responseText.slice(0, 500));

    if (!res.ok) {
      console.error('n8n webhook failed:', res.status, responseText);
      return new Response(JSON.stringify({ ok: false, status: res.status, body: responseText.slice(0, 500) }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ ok: true, status: res.status, body: responseText.slice(0, 500) }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (e) {
    // Never let n8n failures affect the order — just log.
    console.error('notify-order-n8n error:', e);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
