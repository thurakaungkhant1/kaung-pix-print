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

  // Messages sent with a photo (deposit screenshots) must be edited via caption.
  const editMessage = async (chat_id: unknown, message_id: unknown, text: string, keyboard?: unknown) => {
    if (!message_id) return;
    const payload = { chat_id, message_id, reply_markup: { inline_keyboard: keyboard ?? [] } };
    const r = await tg('editMessageCaption', { ...payload, caption: text });
    if (!r.ok) {
      const r2 = await tg('editMessageText', { ...payload, text });
      if (!r2.ok) console.error('edit failed', await r2.text());
    }
  };


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
      await editMessage(chatId, d.telegram_message_id, newText);
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

    await editMessage(chatId, messageId, newText);
    await tg('answerCallbackQuery', { callback_query_id: cb.id, text: 'Deposit approved ✅' });
    return new Response(JSON.stringify({ ok: true }));
  }

  // -------- Smile.One Auto Fill (admin-only, optional) --------
  if (action === 'autofill') {
    if (!entityId) {
      await tg('answerCallbackQuery', { callback_query_id: cb.id, text: 'Invalid action' });
      return new Response(JSON.stringify({ ok: true }));
    }

    await tg('answerCallbackQuery', { callback_query_id: cb.id, text: '⏳ Preparing Auto Fill...' });
    await tg('sendMessage', { chat_id: chatId, text: '⏳ Preparing Auto Fill...' });

    const { data: o } = await supabase
      .from('orders')
      .select('id, status, order_type, game_id, server_id, product_id, smile_package_id, plan_name')
      .eq('id', entityId).maybeSingle();

    if (!o) {
      await tg('sendMessage', { chat_id: chatId, text: '⚠️ Validation Failed\nOrder not found.' });
      return new Response(JSON.stringify({ ok: true }));
    }

    const { data: product } = await supabase
      .from('products').select('name, smile_package_id').eq('id', o.product_id).maybeSingle();

    const packageId = o.smile_package_id ?? product?.smile_package_id ?? null;
    const productName = product?.name ?? o.plan_name ?? '-';

    if (o.order_type !== 'game' || o.status !== 'approved') {
      await tg('sendMessage', {
        chat_id: chatId,
        text: '⚠️ Validation Failed\nAuto Fill is only available for approved game orders.',
      });
      return new Response(JSON.stringify({ ok: true }));
    }

    if (!packageId) {
      await tg('sendMessage', {
        chat_id: chatId,
        text: '⚠️ Validation Failed\nSmile.One Package ID is not configured for this product.',
      });
      return new Response(JSON.stringify({ ok: true }));
    }

    const missing: string[] = [];
    if (!o.game_id) missing.push('game_id');
    if (!o.server_id) missing.push('server_id');
    if (missing.length) {
      await tg('sendMessage', {
        chat_id: chatId,
        text: `⚠️ Validation Failed\nMissing field(s): ${missing.join(', ')}`,
      });
      return new Response(JSON.stringify({ ok: true }));
    }

    const payload = {
      order_id: String(o.id),
      game_id: String(o.game_id),
      server_id: String(o.server_id),
      smile_package_id: String(packageId),
    };

    // Atomically move approved -> processing so a second click can't re-send.
    const startedAt = new Date().toISOString();
    const { data: claimed, error: claimErr } = await supabase
      .from('orders')
      .update({ status: 'processing', auto_fill_started_at: startedAt, auto_fill_status: 'processing' })
      .eq('id', entityId)
      .eq('status', 'approved')
      .select('id')
      .maybeSingle();

    if (claimErr) {
      console.error('autofill claim failed', claimErr);
      await tg('sendMessage', { chat_id: chatId, text: `⚠️ Auto Fill failed to start: ${claimErr.message}` });
      return new Response(JSON.stringify({ ok: true }));
    }
    if (!claimed) {
      await tg('sendMessage', {
        chat_id: chatId,
        text: '⚠️ Validation Failed\nThis order is already being processed or is no longer approved.',
      });
      return new Response(JSON.stringify({ ok: true }));
    }

    const endpoint = Deno.env.get('SMILE_ONE_AUTOFILL_ENDPOINT');
    let autoFillStatus = 'ready';
    let resultLine = `🔗 Endpoint: (not configured) — payload prepared only`;

    if (endpoint) {
      try {
        const r = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const bodyText = await r.text();
        autoFillStatus = r.ok ? 'sent' : 'failed';
        resultLine = `🔗 Endpoint: ${endpoint}\n📡 Result: ${r.status} ${bodyText.slice(0, 300)}`;
      } catch (e) {
        autoFillStatus = 'failed';
        resultLine = `🔗 Endpoint: ${endpoint}\n📡 Result: request error — ${(e as Error).message}`;
      }
    }

    await supabase.from('orders').update({ auto_fill_status: autoFillStatus }).eq('id', entityId);
    console.log('Smile.One auto-fill', { endpoint, payload, autoFillStatus });

    await tg('sendMessage', {
      chat_id: chatId,
      text:
        `${autoFillStatus === 'failed' ? '❌ Auto Fill Failed' : '✅ Ready to Send'}\n\n` +
        `📦 Product: ${productName}\n` +
        `🎯 Game ID: ${payload.game_id}\n` +
        `🌐 Server ID: ${payload.server_id}\n` +
        `🧩 Package ID: ${payload.smile_package_id}\n` +
        `🆔 Order: ${payload.order_id}\n` +
        `📌 Status: processing\n` +
        `🕒 Started: ${new Date(startedAt).toLocaleString('en-GB', { timeZone: 'Asia/Yangon' })}\n\n` +
        `${resultLine}\n` +
        `<pre>${JSON.stringify(payload, null, 2)}</pre>`,
      parse_mode: 'HTML',
    });
    return new Response(JSON.stringify({ ok: true }));
  }

  // -------- Order actions --------
  if (!['confirm', 'cancel'].includes(action) || !entityId) {
    await tg('answerCallbackQuery', { callback_query_id: cb.id, text: 'Invalid action' });
    return new Response(JSON.stringify({ ok: true }));
  }

  const { data: order } = await supabase
    .from('orders')
    .select('id, user_id, status, quantity, price, phone_number, payment_method, transaction_id, created_at, product_id, plan_name, game_id, server_id, game_name, delivery_address, order_type, smile_package_id')

    .eq('id', entityId).maybeSingle();

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

  // Optional KGameShop auto top-up. Fire-and-forget: any failure leaves the
  // existing manual workflow completely untouched.
  if (action === 'confirm') {
    try {
      const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/kgameshop-fulfill`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${serviceKey}` },
        body: JSON.stringify({ order_id: entityId }),
      });
    } catch (e) {
      console.error('kgameshop-fulfill trigger failed', e);
    }
  }



  const [{ data: profile }, { data: product }] = await Promise.all([
    supabase.from('profiles').select('name, email, phone_number').eq('id', order.user_id).maybeSingle(),
    supabase.from('products').select('name, category').eq('id', order.product_id).maybeSingle(),
  ]);

  const shortId = String(order.id).slice(0, 8).toUpperCase();
  const customerName = profile?.name ?? 'Unknown';
  const nowStr = new Date().toLocaleString('en-GB', { timeZone: 'Asia/Yangon' });
  const orderedStr = new Date(order.created_at).toLocaleString('en-GB', { timeZone: 'Asia/Yangon' });
  const priceStr = new Intl.NumberFormat('en-US').format(Number(order.price) || 0);

  const line = (label: string, value: unknown) =>
    value === null || value === undefined || value === '' ? '' : `${label}: ${value}\n`;

  const newText = action === 'confirm'
    ? `✅ ORDER CONFIRMED\n\n` +
      `🆔 Order ID: #${shortId}\n` +
      `📦 Product: ${product?.name ?? '-'}\n` +
      line('🏷 Category', product?.category) +
      line('🎫 Plan', order.plan_name) +
      line('🎮 Game', order.game_name) +
      line('🎯 Game ID', order.game_id) +
      line('🌐 Server ID', order.server_id) +
      `🔢 Quantity: ${order.quantity}\n` +
      `💰 Total: ${priceStr} MMK\n` +
      `👤 Customer: ${customerName}\n` +
      line('📧 Email', profile?.email) +
      line('📞 Phone', order.phone_number ?? profile?.phone_number) +
      line('🏠 Delivery', order.delivery_address) +
      line('💳 Payment', order.payment_method) +
      line('🧾 Transaction ID', order.transaction_id) +
      `📅 Ordered: ${orderedStr}\n` +
      `✅ Confirmed: ${nowStr}\n` +
      `📌 Status: Approved`
    : `❌ ORDER CANCELLED\n\n` +
      `🆔 Order ID: #${shortId}\n` +
      `📦 Product: ${product?.name ?? '-'}\n` +
      `💰 Total: ${priceStr} MMK\n` +
      `👤 Customer: ${customerName}\n` +
      `📅 Ordered: ${orderedStr}\n` +
      `🚫 Cancelled: ${nowStr}`;

  const isGameOrder = order.order_type === 'game';
  const autoFillKeyboard =
    action === 'confirm' && newStatus === 'approved' && isGameOrder
      ? [[{ text: '🚀 Auto Fill Smile.One', callback_data: `autofill:${order.id}` }]]
      : undefined;

  await editMessage(chatId, messageId, newText, autoFillKeyboard);

  await tg('answerCallbackQuery', {
    callback_query_id: cb.id,
    text: action === 'confirm' ? 'Order confirmed ✅' : 'Order cancelled ❌',
  });

  return new Response(JSON.stringify({ ok: true }));
});
