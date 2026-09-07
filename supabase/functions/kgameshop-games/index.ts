import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

const BASE_URL = Deno.env.get('KGAMESHOP_BASE_URL') ?? 'https://admin.kokhantgaming.com/api/v1'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  try {
    const apiKey = Deno.env.get('KGAMESHOP_API_KEY')
    if (!apiKey) {
      console.error('KGAMESHOP_API_KEY is not configured')
      return json({ ok: false, error: 'KGameShop API key is not configured' }, 500)
    }

    const url = `${BASE_URL}/games`
    console.log('Fetching KGameShop game list', url)

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    })

    const text = await res.text()
    if (!res.ok) {
      console.error('KGameShop responded with', res.status, text.slice(0, 500))
      return json({ ok: false, error: `KGameShop API error (${res.status})` }, 502)
    }

    let payload: any
    try {
      payload = JSON.parse(text)
    } catch {
      console.error('KGameShop returned non-JSON body', text.slice(0, 300))
      return json({ ok: false, error: 'Invalid response from KGameShop' }, 502)
    }

    const list: any[] = Array.isArray(payload?.games)
      ? payload.games
      : Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload)
          ? payload
          : []

    const games = list
      .filter((g) => g && (g.game || g.slug || g.id))
      .map((g, i) => ({
        id: String(g.game ?? g.slug ?? g.id),
        category_key: String(g.game ?? g.slug ?? g.id),
        name: String(g.name ?? g.title ?? g.game ?? 'Game'),
        short_name: String(g.short_name ?? g.name ?? g.game ?? 'Game'),
        image_url: g.icon ?? g.image ?? g.logo ?? null,
        category: g.category ?? null,
        display_order: i,
      }))

    return json({ ok: true, games })
  } catch (e) {
    console.error('kgameshop-games failed', e)
    return json({ ok: false, error: 'Failed to reach KGameShop' }, 502)
  }
})
