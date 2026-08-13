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
      .select('id, quantity, price, phone_number, payment_method, created_at, user_id, product_id, status, telegram_message_id, game_id, server_id, game_name')
      .eq('id', order_id)
      .maybeSingle();

    if (error || !order) {
      console.error('Order fetch failed:', error);
      return new Response(JSON.stringify({ error: 'order not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const [{ data: profile }, { data: product }] = await Promise.all([
      supabase.from('profiles').select('name, wallet_balance').eq('id', order.user_id).maybeSingle(),
      supabase.from('products').select('name, category').eq('id', order.product_id).maybeSingle(),
    ]);

    const balanceStr = `${new Intl.NumberFormat('en-US').format(Number(profile?.wallet_balance) || 0)} MMK`;

    const shortId = String(order.id).slice(0, 8).toUpperCase();
    const customerName = profile?.name ?? 'Unknown';
    const category = product?.category ?? '';
    const isMLBB = category === 'MLBB Diamonds';
    const isPUBG = category === 'PUBG UC';
    const isCOC = category === 'Clash of Clans';
    const playerName = (() => {
      const m = String(order.game_name ?? '').match(/\(([^)]+)\)/);
      return m ? m[1] : null;
    })();
    const gameLabel = String(order.game_name ?? '').replace(/\s*\([^)]*\)\s*$/, '') || category;
    const playerLine = playerName ? `🧑‍💻 Game Name: ${playerName}\n` : '';
    const timeStr = new Date(order.created_at).toLocaleString('en-GB', { timeZone: 'Asia/Yangon' });

    let text: string;
    if (isCOC) {
      const idLabel = order.server_id === 'supercell' ? 'Supercell ID' : 'Player Tag';
      text =
        `⚔️ New Clash of Clans Order\n\n` +
        `🆔 Order ID: #${shortId}\n` +
        `📦 Product: ${product?.name ?? '-'}\n` +
        `🏷️ ${idLabel}: ${order.game_id ?? '-'}\n` +
        playerLine +
        `🔢 Quantity: ${order.quantity}\n` +
        `💰 Price: ${order.price} MMK\n` +
        `👤 Customer: ${customerName}\n` +
        `📞 Phone: ${order.phone_number || '-'}\n` +
        `💳 Payment: ${order.payment_method ?? '-'}\n` +
        `👛 Wallet Balance: ${balanceStr}\n` +
        `📅 Time: ${timeStr}`;
    } else if (isMLBB) {

      text =
        `🎮 New Mobile Legends Order\n\n` +
        `🆔 Order ID: #${shortId}\n` +
        `📦 Product: ${product?.name ?? '-'}\n` +
        `🎯 Game ID: ${order.game_id ?? '-'}\n` +
        `🌐 Server ID: ${order.server_id ?? '-'}\n` +
        playerLine +
        `🔢 Quantity: ${order.quantity}\n` +
        `💰 Price: ${order.price} MMK\n` +
        `👤 Customer: ${customerName}\n` +
        `💳 Payment: ${order.payment_method ?? '-'}\n` +
        `👛 Wallet Balance: ${balanceStr}\n` +
        `📅 Time: ${timeStr}`;
    } else if (isPUBG) {
      text =
        `🎮 New PUBG Mobile Order\n\n` +
        `🆔 Order ID: #${shortId}\n` +
        `📦 Product: ${product?.name ?? '-'}\n` +
        `🎯 Player UID: ${order.game_id ?? '-'}\n` +
        playerLine +
        `🔢 Quantity: ${order.quantity}\n` +
        `💰 Price: ${order.price} MMK\n` +
        `👤 Customer: ${customerName}\n` +
        `💳 Payment: ${order.payment_method ?? '-'}\n` +
        `👛 Wallet Balance: ${balanceStr}\n` +
        `📅 Time: ${timeStr}`;
    } else {
      const gameLine = order.game_id
        ? `🎯 Game ID: ${order.game_id}${order.server_id ? ` • Server: ${order.server_id}` : ''}\n`
        : '';
      text =
        `🛒 NEW ORDER\n\n` +
        `🆔 Order ID: #${shortId}\n` +
        `👤 Customer: ${customerName}\n` +
        `📞 Phone: ${order.phone_number ?? '-'}\n` +
        `📦 Product: ${product?.name ?? '-'}\n` +
        gameLine +
        (gameLabel ? `🎮 Game: ${gameLabel}\n` : '') +
        playerLine +
        `🔢 Quantity: ${order.quantity}\n` +
        `💰 Total: ${order.price} MMK\n` +
        `💳 Payment: ${order.payment_method ?? '-'}\n` +
        `👛 Wallet Balance: ${balanceStr}\n` +
        `📅 Time: ${timeStr}`;
    }

    const token = Deno.env.get('TELEGRAM_BOT_TOKEN');
    if (!token) {
      console.error('TELEGRAM_BOT_TOKEN not configured');
      return new Response(JSON.stringify({ ok: false, error: 'no token' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const reply_markup = {
      inline_keyboard: [[
        { text: '✅ Confirm Order', callback_data: `confirm:${order.id}` },
        { text: '❌ Cancel Order', callback_data: `cancel:${order.id}` },
      ]],
    };

    const tgRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: CHAT_ID, text, reply_markup }),
    });
    const tgBody = await tgRes.json().catch(() => null);
    if (!tgRes.ok) console.error('Telegram send failed:', tgRes.status, tgBody);

    const msgId = tgBody?.result?.message_id;
    if (msgId) {
      await supabase.from('orders').update({ telegram_message_id: msgId }).eq('id', order.id);
    }

    return new Response(JSON.stringify({ ok: tgRes.ok, message_id: msgId }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('notify-order-telegram error:', e);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
