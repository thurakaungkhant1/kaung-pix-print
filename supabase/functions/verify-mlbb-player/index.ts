import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.84.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const userLimit = rateLimitStore.get(userId);
  if (!userLimit || now > userLimit.resetTime) {
    rateLimitStore.set(userId, { count: 1, resetTime: now + 60000 });
    return true;
  }
  if (userLimit.count >= 20) return false;
  userLimit.count++;
  return true;
}

async function callCheckRegion(playerId: string, serverId: string): Promise<any> {
  const url = "https://sacoliofficial.com/api/api/games/check_region";
  // Try common payload shapes
  const payloads = [
    { id: playerId, server: serverId },
    { user_id: playerId, zone_id: serverId },
    { userid: playerId, zoneid: serverId },
    { game: "mobilelegends", id: playerId, server: serverId },
  ];

  for (const body of payloads) {
    try {
      const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify(body),
      });
      const text = await r.text();
      let json: any;
      try { json = JSON.parse(text); } catch { json = { raw: text }; }
      if (r.ok) {
        const name =
          json?.username ||
          json?.user_name ||
          json?.nickname ||
          json?.name ||
          json?.data?.username ||
          json?.data?.name ||
          json?.data?.nickname;
        if (name) return { found: true, player_name: name, raw: json };
      }
    } catch (e) {
      console.error("check_region attempt failed", e);
    }
  }

  // Fallback GET
  try {
    const r = await fetch(`${url}?id=${encodeURIComponent(playerId)}&server=${encodeURIComponent(serverId)}`);
    const text = await r.text();
    let json: any;
    try { json = JSON.parse(text); } catch { json = { raw: text }; }
    const name =
      json?.username || json?.user_name || json?.nickname || json?.name ||
      json?.data?.username || json?.data?.name || json?.data?.nickname;
    if (name) return { found: true, player_name: name, raw: json };
  } catch {}

  return { found: false };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing authorization header');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error('Unauthorized');

    if (!checkRateLimit(user.id)) {
      return new Response(JSON.stringify({ error: 'Too many requests. Please wait a minute.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { player_id, server_id } = await req.json();
    if (!player_id || !server_id) {
      return new Response(JSON.stringify({ error: 'Player ID and Server ID are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const pid = String(player_id).trim();
    const sid = String(server_id).trim();

    if (!/^[0-9]{3,15}$/.test(pid) || !/^[0-9]{1,5}$/.test(sid)) {
      return new Response(JSON.stringify({ error: 'Invalid ID or Server format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const result = await callCheckRegion(pid, sid);
    return new Response(JSON.stringify({ ...result, player_id: pid, server_id: sid }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('verify-mlbb-player error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
