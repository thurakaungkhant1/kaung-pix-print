import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { kgFetch, getApiKey } from '../_shared/kgameshop.ts';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

/** Admin-only provider status. The API key itself is never returned. */
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

  if (!getApiKey()) {
    return json({ configured: false, connection: 'error', message: 'KGAMESHOP_API_KEY is not configured' });
  }

  const res = await kgFetch<any>('/balance');
  if (!res.ok) {
    return json({ configured: true, connection: 'error', message: res.error, status: res.status });
  }

  const d = res.data?.data ?? res.data ?? {};
  return json({
    configured: true,
    connection: 'connected',
    balance: d.balance ?? null,
    currency: d.currency ?? 'USD',
    subscription: d.subscription ?? d.plan ?? null,
    subscription_expiry: d.subscription_expiry ?? d.expires_at ?? null,
    raw: d,
  });
});
