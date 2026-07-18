import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const CHAT_ID = '7642545999';

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
      .select('id, quantity, price, phone_number, payment_method, created_at, user_id, product_id')
      .eq('id', order_id)
      .maybeSingle();

    if (error || !order) {
      console.error('Order fetch failed:', error);
      return new Response(JSON.stringify({ error: 'order not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const [{ data: profile }, { data: product }] = await Promise.all([
      supabase.from('profiles').select('name').eq('id', order.user_id).maybeSingle(),
      supabase.from('products').select('name').eq('id', order.product_id).maybeSingle(),
    ]);

    const shortId = String(order.id).slice(0, 8).toUpperCase();
    const text =
      `🛒 NEW ORDER\n\n` +
      `🆔 Order ID: ${shortId}\n` +
      `👤 Customer: ${profile?.name ?? 'Unknown'}\n` +
      `📞 Phone: ${order.phone_number ?? '-'}\n` +
      `📦 Product: ${product?.name ?? '-'}\n` +
      `🔢 Quantity: ${order.quantity}\n` +
      `💰 Total: ${order.price} MMK\n` +
      `💳 Payment: ${order.payment_method ?? '-'}\n` +
      `📅 Time: ${new Date(order.created_at).toLocaleString('en-GB', { timeZone: 'Asia/Yangon' })}`;

    const token = Deno.env.get('TELEGRAM_BOT_TOKEN');
    if (!token) {
      console.error('TELEGRAM_BOT_TOKEN not configured');
      return new Response(JSON.stringify({ ok: false, error: 'no token' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const tgRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: CHAT_ID, text }),
    });
    const tgBody = await tgRes.text();
    if (!tgRes.ok) console.error('Telegram send failed:', tgRes.status, tgBody);

    return new Response(JSON.stringify({ ok: tgRes.ok }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('notify-order-telegram error:', e);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
