import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const CHAT_ID = '7642545999';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { deposit_id } = await req.json();
    if (!deposit_id) {
      return new Response(JSON.stringify({ error: 'deposit_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: d, error } = await supabase
      .from('wallet_deposits')
      .select('id, user_id, amount, transaction_id, status, created_at, telegram_message_id')
      .eq('id', deposit_id)
      .maybeSingle();

    if (error || !d) {
      console.error('deposit fetch failed', error);
      return new Response(JSON.stringify({ error: 'deposit not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: profile } = await supabase
      .from('profiles').select('name').eq('id', d.user_id).maybeSingle();

    const shortId = String(d.id).slice(0, 8).toUpperCase();
    const userName = profile?.name ?? 'Unknown';
    const amountStr = new Intl.NumberFormat('en-US').format(Number(d.amount) || 0);
    const timeStr = new Date(d.created_at).toLocaleString('en-GB', { timeZone: 'Asia/Yangon' });

    const text =
      `💰 New Deposit Request\n\n` +
      `🆔 Deposit ID: #${shortId}\n` +
      `👤 User: ${userName}\n` +
      `🔗 User ID: ${d.user_id}\n` +
      `💵 Amount: ${amountStr} MMK\n` +
      `💳 Payment Method: Manual (KPay/WavePay)\n` +
      `🧾 Transaction ID: ${d.transaction_id ?? '-'}\n` +
      `📌 Status: Pending\n` +
      `📅 Submitted: ${timeStr}`;

    const token = Deno.env.get('TELEGRAM_BOT_TOKEN');
    if (!token) {
      console.error('TELEGRAM_BOT_TOKEN missing');
      return new Response(JSON.stringify({ ok: false, error: 'no token' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const reply_markup = {
      inline_keyboard: [[
        { text: '✅ Approve', callback_data: `deposit_approve:${d.id}` },
        { text: '❌ Reject', callback_data: `deposit_reject:${d.id}` },
      ]],
    };

    const tgRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: CHAT_ID, text, reply_markup }),
    });
    const tgBody = await tgRes.json().catch(() => null);
    if (!tgRes.ok) console.error('telegram send failed', tgRes.status, tgBody);

    const msgId = tgBody?.result?.message_id;
    if (msgId) {
      await supabase.from('wallet_deposits')
        .update({ telegram_message_id: msgId }).eq('id', d.id);
    }

    return new Response(JSON.stringify({ ok: tgRes.ok, message_id: msgId }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('notify-deposit-telegram error', e);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
