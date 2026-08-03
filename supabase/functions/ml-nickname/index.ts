const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Supported games and whether a zone/server id is required
const GAMES: Record<string, { path: string; zone: boolean }> = {
  ml: { path: "ml", zone: true },
  mcgg: { path: "mcgg", zone: true },
  pubgm: { path: "pubgm", zone: false },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const id = (url.searchParams.get("id") || "").trim();
    const zone = (url.searchParams.get("zone") || "").trim();
    const gameKey = (url.searchParams.get("game") || "ml").trim().toLowerCase();
    const game = GAMES[gameKey];

    if (!game) {
      return new Response(
        JSON.stringify({ success: false, message: "Unsupported game" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!/^\d{3,15}$/.test(id) || (game.zone && !/^\d{1,5}$/.test(zone))) {
      return new Response(
        JSON.stringify({ success: false, message: "Invalid ID or Zone" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const upstream = game.zone
      ? `https://api.isan.eu.org/nickname/${game.path}?id=${encodeURIComponent(id)}&zone=${encodeURIComponent(zone)}`
      : `https://api.isan.eu.org/nickname/${game.path}?id=${encodeURIComponent(id)}`;

    const r = await fetch(upstream, { headers: { Accept: "application/json" } });
    const text = await r.text();
    let json: any = {};
    try { json = JSON.parse(text); } catch { json = { raw: text }; }

    const name =
      json?.name ||
      json?.nickname ||
      json?.username ||
      json?.data?.name ||
      json?.data?.nickname ||
      json?.data?.username;

    if (r.ok && name) {
      return new Response(
        JSON.stringify({ success: true, name: String(name) }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ success: false, message: json?.message || "Player not found" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (_e) {
    return new Response(
      JSON.stringify({ success: false, message: "Cannot retrieve game name" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
