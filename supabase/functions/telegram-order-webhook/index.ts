import { createClient } from 'npm:@supabase/supabase-js@2';

const CHAT_ID = '7642545999';
const REJECT_PROMPT_PREFIX = 'Reject deposit ';

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const token = Deno.env.get('TELEGRAM_BOT_TOKEN');

  // Self-registration
  if (req.method === 'GET' && url.searchParams.get('register') === '1') {
    if (!token) return new Response('no token', { status: 500 });
    const webhookUrl = `https://${Deno.env.get('SUPABASE_URL')!.replace(/^https?:\/\//,'')}/functions/v1/telegram-order-webhook`;
    const secret = Deno.env.get('TELEGRAM_WEBHOOK_SECRET') || '';
    const body: Record<string, unknown> = { url: webhookUrl, allowed_updates: ['callback_query', 'message'] };
    if (secret) body.secret_token = secret;
    const r = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const j = await r.text();
    return new Response(j, { status: r.status, headers: { 'Content-Type': 'application/json' } });
  }

  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  if (!token) return new Response('no token', { status: 200 });

  const expectedSecret = Deno.env.get('TELEGRAM_WEBHOOK_SECRET');
  if (expectedSecret) {
    const got = req.headers.get('X-Telegram-Bot-Api-Secret-Token');
    if (got !== expectedSecret) return new Response('unauthorized', { status: 401 });
  }

  let update: any;
  try { update = await req.json(); } catch { return new Response('bad json', { status: 200 }); }

  const tg = async (method: string, body: unknown) =>
    fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // ============ 1) Text reply for deposit rejection reason ============
  const msg = update.message;
  if (msg?.reply_to_message?.text?.startsWith(REJECT_PROMPT_PREFIX)) {
    const chatId = msg.chat?.id;
    if (String(chatId) !== CHAT_ID) return new Response(JSON.stringify({ ok: true }));

    // Prompt text format: "Reject deposit <uuid>\nPlease reply with the reason:"
    const line = msg.reply_to_message.text.split('\n')[0];
    const depositId = line.slice(REJECT_PROMPT_PREFIX.length).trim();
    const reason = (msg.text || '').trim();
    if (!depositId || !reason) return new Response(JSON.stringify({ ok: true }));

    const { data: res, error } = await supabase.rpc('telegram_process_deposit', {
      p_deposit_id: depositId, p_action: 'reject', p_notes: reason,
    });
    if (error) {
      console.error('deposit reject rpc', error);
      await tg('sendMessage', { chat_id: chatId, text: `❌ Reject failed: ${error.message}` });
      return new Response(JSON.stringify({ ok: true }));
    }

    // Fetch deposit for message id + user name
    const { data: d } = await supabase.from('wallet_deposits')
      .select('id, user_id, telegram_message_id').eq('id', depositId).maybeSingle();
    const { data: profile } = d ? await supabase.from('profiles').select('name').eq('id', d.user_id).maybeSingle() : { data: null };
    const shortId = String(depositId).slice(0, 8).toUpperCase();
    const nowStr = new Date().toLocaleString('en-GB', { timeZone: 'Asia/Yangon' });
    const newText =
      `❌ REJECTED\n` +
      `🆔 Deposit: #${shortId}\n` +
      `👤 User: ${profile?.name ?? 'Unknown'}\n` +
      `Reason: ${reason}\n` +
      `Rejected By: Admin\n` +
      `Rejected Time: ${nowStr}`;

    if (d?.telegram_message_id) {
      await tg('editMessageText', {
        chat_id: chatId, message_id: d.telegram_message_id,
        text: newText, reply_markup: { inline_keyboard: [] },
      });
    } else {
      await tg('sendMessage', { chat_id: chatId, text: newText });
    }
    return new Response(JSON.stringify({ ok: true }));
  }

  // ============ 2) Callback queries ============
  const cb = update.callback_query;
  if (!cb) return new Response(JSON.stringify({ ok: true, ignored: true }));

  const chatId = cb.message?.chat?.id;
  const messageId = cb.message?.message_id;
  const data: string = cb.data || '';
  const [action, entityId] = data.split(':');

  if (String(chatId) !== CHAT_ID) {
    await tg('answerCallbackQuery', { callback_query_id: cb.id, text: 'Unauthorized', show_alert: true });
    return new Response(JSON.stringify({ ok: true }));
  }

  // -------- Deposit actions --------
  if (action === 'deposit_approve' || action === 'deposit_reject') {
    if (!entityId) {
      await tg('answerCallbackQuery', { callback_query_id: cb.id, text: 'Invalid action' });
      return new Response(JSON.stringify({ ok: true }));
    }

    if (action === 'deposit_reject') {
      // Prompt admin for reason with force_reply
      await tg('sendMessage', {
        chat_id: chatId,
        text: `${REJECT_PROMPT_PREFIX}${entityId}\nPlease reply with the reason:`,
        reply_markup: { force_reply: true, selective: false },
      });
      await tg('answerCallbackQuery', { callback_query_id: cb.id, text: 'Reply with reason' });
      return new Response(JSON.stringify({ ok: true }));
    }

    // Approve
    const { data: res, error } = await supabase.rpc('telegram_process_deposit', {
      p_deposit_id: entityId, p_action: 'approve', p_notes: null,
    });
    if (error) {
      console.error('deposit approve rpc', error);
      await tg('answerCallbackQuery', { callback_query_id: cb.id, text: `Failed: ${error.message}`, show_alert: true });
      return new Response(JSON.stringify({ ok: true }));
    }
    if ((res as any)?.skipped) {
      await tg('answerCallbackQuery', {
        callback_query_id: cb.id,
        text: `Already ${(res as any).status}. No changes made.`, show_alert: true,
      });
      return new Response(JSON.stringify({ ok: true }));
    }

    const { data: d } = await supabase.from('wallet_deposits')
      .select('user_id, amount').eq('id', entityId).maybeSingle();
    const { data: profile } = d ? await supabase.from('profiles').select('name').eq('id', d.user_id).maybeSingle() : { data: null };
    const shortId = String(entityId).slice(0, 8).toUpperCase();
    const nowStr = new Date().toLocaleString('en-GB', { timeZone: 'Asia/Yangon' });
    const amountStr = new Intl.NumberFormat('en-US').format(Number(d?.amount) || 0);
    const newText =
      `✅ APPROVED\n` +
      `🆔 Deposit: #${shortId}\n` +
      `👤 User: ${profile?.name ?? 'Unknown'}\n` +
      `💵 Amount: ${amountStr} MMK\n` +
      `Approved By: Admin\n` +
      `Approved Time: ${nowStr}`;

    await tg('editMessageText', {
      chat_id: chatId, message_id: messageId,
      text: newText, reply_markup: { inline_keyboard: [] },
    });
    await tg('answerCallbackQuery', { callback_query_id: cb.id, text: 'Deposit approved ✅' });
    return new Response(JSON.stringify({ ok: true }));
  }

  // -------- Order actions (existing) --------
  if (!['confirm', 'cancel'].includes(action) || !entityId) {
    await tg('answerCallbackQuery', { callback_query_id: cb.id, text: 'Invalid action' });
    return new Response(JSON.stringify({ ok: true }));
  }

  const { data: order } = await supabase
    .from('orders').select('id, user_id, status').eq('id', entityId).maybeSingle();

  if (!order) {
    await tg('answerCallbackQuery', { callback_query_id: cb.id, text: 'Order not found', show_alert: true });
    return new Response(JSON.stringify({ ok: true }));
  }

  const finalStatuses = ['approved', 'finished', 'completed', 'rejected', 'cancelled'];
  if (finalStatuses.includes(order.status)) {
    await tg('answerCallbackQuery', {
      callback_query_id: cb.id, text: `Already ${order.status}. No changes made.`, show_alert: true,
    });
    return new Response(JSON.stringify({ ok: true }));
  }

  const newStatus = action === 'confirm' ? 'approved' : 'cancelled';
  const { error: upErr } = await supabase
    .from('orders').update({ status: newStatus }).eq('id', entityId).eq('status', 'pending');

  if (upErr) {
    console.error('order update failed', upErr);
    await tg('answerCallbackQuery', { callback_query_id: cb.id, text: 'Update failed', show_alert: true });
    return new Response(JSON.stringify({ ok: true }));
  }

  const { data: profile } = await supabase
    .from('profiles').select('name').eq('id', order.user_id).maybeSingle();

  const shortId = String(order.id).slice(0, 8).toUpperCase();
  const customerName = profile?.name ?? 'Unknown';
  const newText = action === 'confirm'
    ? `✅ Order Confirmed\n👤 ${customerName}\n🆔 ${shortId}`
    : `❌ Order Cancelled\n👤 ${customerName}\n🆔 ${shortId}`;

  await tg('editMessageText', {
    chat_id: chatId, message_id: messageId, text: newText, reply_markup: { inline_keyboard: [] },
  });
  await tg('answerCallbackQuery', {
    callback_query_id: cb.id,
    text: action === 'confirm' ? 'Order confirmed ✅' : 'Order cancelled ❌',
  });

  return new Response(JSON.stringify({ ok: true }));
});
