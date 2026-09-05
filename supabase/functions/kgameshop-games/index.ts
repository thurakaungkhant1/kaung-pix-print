import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const BASE_URL = Deno.env.get('KGAMESHOP_GAMES_URL') ?? 'https://admin.kokhantgaming.com/api/v1/games';
const API_KEY = Deno.env.get('KGAMESHOP_API_KEY') ?? '';

type AnyRec = Record<string, unknown>;

/** Pull an array of games out of whatever envelope the API returns. */
function extractList(payload: unknown): AnyRec[] {
  if (Array.isArray(payload)) return payload as AnyRec[];
  if (payload && typeof payload === 'object') {
    const obj = payload as AnyRec;
    for (const key of ['data', 'games', 'items', 'results', 'list']) {
      const v = obj[key];
      if (Array.isArray(v)) return v as AnyRec[];
      if (v && typeof v === 'object') {
        const inner = (v as AnyRec).data;
        if (Array.isArray(inner)) return inner as AnyRec[];
      }
    }
  }
  return [];
}

function pick(rec: AnyRec, keys: string[]): string | null {
  for (const k of keys) {
    const v = rec[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
    if (typeof v === 'number') return String(v);
  }
  return null;
}

/** Map a KGameShop game record onto the shape the existing Game Card uses. */
function normalize(rec: AnyRec, index: number) {
  const id = pick(rec, ['code', 'slug', 'game_code', 'gameCode', 'key', 'id', 'game_id']) ?? `kg-${index}`;
  const name = pick(rec, ['name', 'title', 'game_name', 'gameName', 'label']) ?? id;
  const image = pick(rec, ['image', 'image_url', 'imageUrl', 'icon', 'icon_url', 'logo', 'thumbnail', 'cover', 'banner']);
  const statusRaw = rec['status'] ?? rec['is_active'] ?? rec['active'] ?? rec['enabled'];
  const active =
    statusRaw === undefined || statusRaw === null
      ? true
      : typeof statusRaw === 'string'
        ? ['active', 'available', 'on', '1', 'true', 'enabled'].includes(statusRaw.toLowerCase())
        : Boolean(statusRaw);

  return {
    id: String(id),
    category_key: String(id),
    name,
    short_name: pick(rec, ['short_name', 'shortName', 'abbr']) ?? name,
    image_url: image,
    requires_server_id: Boolean(rec['requires_server_id'] ?? rec['need_server'] ?? rec['server_required'] ?? false),
    nickname_key: null,
    display_order: index,
    is_active: active,
    card_style: 'default',
    card_accent: null,
    show_discount_badge: false,
    price_suffix: null,
    source: 'kgameshop',
  };
}

async function fetchPage(page: number) {
  const url = new URL(BASE_URL);
  if (page > 1) url.searchParams.set('page', String(page));
  const res = await fetch(url.toString(), {
    headers: { 'X-API-KEY': API_KEY, Accept: 'application/json' },
  });
  const text = await res.text();
  let json: unknown = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }
  return { ok: res.ok, status: res.status, json, text };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    if (!API_KEY) {
      return new Response(JSON.stringify({ ok: false, error: 'missing_api_key', games: [] }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const debug = new URL(req.url).searchParams.get('debug') === '1';

    const all: AnyRec[] = [];
    let page = 1;
    let firstRaw: unknown = null;

    while (page <= 20) {
      const { ok, status, json, text } = await fetchPage(page);
      if (page === 1) firstRaw = json ?? text.slice(0, 500);
      if (!ok) {
        if (page === 1) {
          console.error('KGameShop request failed', status, text.slice(0, 300));
          return new Response(JSON.stringify({ ok: false, error: `upstream_${status}`, games: [] }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        break;
      }
      const list = extractList(json);
      if (!list.length) break;
      all.push(...list);

      // Stop when the API is not paginated or the last page has been read.
      const meta = (json as AnyRec)?.['meta'] as AnyRec | undefined;
      const lastPage = Number(meta?.['last_page'] ?? (json as AnyRec)?.['last_page'] ?? 0);
      const perPage = Number(meta?.['per_page'] ?? (json as AnyRec)?.['per_page'] ?? 0);
      if (lastPage) {
        if (page >= lastPage) break;
      } else if (!perPage || list.length < perPage) {
        break;
      }
      page += 1;
    }

    // De-duplicate by identifier.
    const seen = new Set<string>();
    const games = all
      .map((rec, i) => normalize(rec, i))
      .filter((g) => {
        if (seen.has(g.id)) return false;
        seen.add(g.id);
        return true;
      });

    return new Response(JSON.stringify({ ok: true, count: games.length, games, ...(debug ? { raw: firstRaw } : {}) }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('kgameshop-games error', e);
    return new Response(JSON.stringify({ ok: false, error: String(e), games: [] }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
