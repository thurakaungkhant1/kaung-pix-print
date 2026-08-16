import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { kgFetch, getApiKey } from '../_shared/kgameshop.ts';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

/** Admin-only provider status + readiness. Secret VALUES are never returned. */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

  const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  if (!token) return json({ error: 'Unauthorized' }, 401);

  const authClient = createClient(supabaseUrl, anonKey);
  const { data: claims } = await authClient.auth.getClaims(token);
  const uid = claims?.claims?.sub as string | undefined;
  if (!uid) return json({ error: 'Unauthorized' }, 401);

  const supabase = createClient(supabaseUrl, serviceKey);
  const { data: adminFlag } = await supabase.rpc('has_role', { _user_id: uid, _role: 'admin' });
  if (!adminFlag) return json({ error: 'Forbidden: admin only' }, 403);

  // --- readiness (never exposes secret values) ---
  const apiKeyConfigured = !!getApiKey();
  const webhookSecretConfigured = !!Deno.env.get('KGAMESHOP_WEBHOOK_SECRET');
  const webhookUrl = `${supabaseUrl}/functions/v1/kgameshop-webhook`;

  const { data: settingRow } = await supabase
    .from('ad_settings')
    .select('setting_value')
    .eq('setting_key', 'kgameshop_auto_topup_enabled')
    .maybeSingle();
  const autoTopupEnabled = settingRow?.setting_value === 'true';

  const { data: mapped } = await supabase
    .from('products')
    .select('id, name, kgameshop_game, kgameshop_product_id, kgameshop_region')
    .eq('kgameshop_enabled', true)
    .order('name');

  const base = {
    configured: apiKeyConfigured,
    api_key_configured: apiKeyConfigured,
    webhook_secret_configured: webhookSecretConfigured,
    webhook_url: webhookUrl,
    webhook_protected: webhookSecretConfigured,
    auto_topup_enabled: autoTopupEnabled,
    mapped_products_count: mapped?.length ?? 0,
    mapped_products: mapped ?? [],
  };

  if (!apiKeyConfigured) {
    return json({ ...base, connection: 'error', message: 'KGAMESHOP_API_KEY is not configured' });
  }

  const res = await kgFetch<any>('/balance');
  if (!res.ok) {
    // Safe error only — credentials are never echoed back.
    const safe = res.status === 401 || res.status === 403
      ? 'Provider rejected the credentials (401/403). Please re-check the API key.'
      : res.status === 0
        ? 'Provider request failed or timed out.'
        : `Provider returned HTTP ${res.status}.`;
    return json({ ...base, connection: 'error', message: safe, status: res.status });
  }

  const d = res.data?.data ?? res.data ?? {};
  return json({
    ...base,
    connection: 'connected',
    balance: d.balance ?? null,
    currency: d.currency ?? 'USD',
    subscription: d.subscription ?? d.plan ?? null,
    subscription_expiry: d.subscription_expiry ?? d.expires_at ?? null,
  });
});
