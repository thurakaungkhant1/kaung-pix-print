import { createClient } from 'npm:@supabase/supabase-js@2';

const CHAT_ID = '7642545999';

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const token = Deno.env.get('TELEGRAM_BOT_TOKEN');
  if (!token) return new Response('no token', { status: 200 });

  // Verify webhook secret (Telegram sends it in header when set via setWebhook)
  const expectedSecret = Deno.env.get('TELEGRAM_WEBHOOK_SECRET');
  if (expectedSecret) {
    const got = req.headers.get('X-Telegram-Bot-Api-Secret-Token');
    if (got !== expectedSecret) return new Response('unauthorized', { status: 401 });
  }

  let update: any;
  try { update = await req.json(); } catch { return new Response('bad json', { status: 200 }); }

  const cb = update.callback_query;
  if (!cb) return new Response(JSON.stringify({ ok: true, ignored: true }));

  const chatId = cb.message?.chat?.id;
  const messageId = cb.message?.message_id;
  const data: string = cb.data || '';
  const [action, orderId] = data.split(':');

  const tg = async (method: string, body: unknown) =>
    fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

  // Only accept from the trusted admin chat
  if (String(chatId) !== CHAT_ID) {
    await tg('answerCallbackQuery', { callback_query_id: cb.id, text: 'Unauthorized', show_alert: true });
    return new Response(JSON.stringify({ ok: true }));
  }

  if (!['confirm', 'cancel'].includes(action) || !orderId) {
    await tg('answerCallbackQuery', { callback_query_id: cb.id, text: 'Invalid action' });
    return new Response(JSON.stringify({ ok: true }));
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: order } = await supabase
    .from('orders')
    .select('id, user_id, status')
    .eq('id', orderId)
    .maybeSingle();

  if (!order) {
    await tg('answerCallbackQuery', { callback_query_id: cb.id, text: 'Order not found', show_alert: true });
    return new Response(JSON.stringify({ ok: true }));
  }

  const finalStatuses = ['approved', 'finished', 'completed', 'rejected', 'cancelled'];
  if (finalStatuses.includes(order.status)) {
    await tg('answerCallbackQuery', {
      callback_query_id: cb.id,
      text: `Already ${order.status}. No changes made.`,
      show_alert: true,
    });
    return new Response(JSON.stringify({ ok: true }));
  }

  const newStatus = action === 'confirm' ? 'approved' : 'cancelled';
  const { error: upErr } = await supabase
    .from('orders')
    .update({ status: newStatus })
    .eq('id', orderId)
    .eq('status', 'pending'); // guard against race

  if (upErr) {
    console.error('order update failed', upErr);
    await tg('answerCallbackQuery', { callback_query_id: cb.id, text: 'Update failed', show_alert: true });
    return new Response(JSON.stringify({ ok: true }));
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('name')
    .eq('id', order.user_id)
    .maybeSingle();

  const shortId = String(order.id).slice(0, 8).toUpperCase();
  const customerName = profile?.name ?? 'Unknown';
  const newText = action === 'confirm'
    ? `✅ Order Confirmed\n👤 ${customerName}\n🆔 ${shortId}`
    : `❌ Order Cancelled\n👤 ${customerName}\n🆔 ${shortId}`;

  await tg('editMessageText', {
    chat_id: chatId,
    message_id: messageId,
    text: newText,
    reply_markup: { inline_keyboard: [] }, // remove buttons so it can't be tapped again
  });

  await tg('answerCallbackQuery', {
    callback_query_id: cb.id,
    text: action === 'confirm' ? 'Order confirmed ✅' : 'Order cancelled ❌',
  });

  return new Response(JSON.stringify({ ok: true }));
});
