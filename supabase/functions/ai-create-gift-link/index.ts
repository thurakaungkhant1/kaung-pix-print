import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const slug = (n = 10) => {
  const chars = "abcdefghijkmnpqrstuvwxyz23456789";
  let s = "";
  for (let i = 0; i < n; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Missing auth" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "", { global: { headers: { Authorization: authHeader } } });
    const admin = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json();
    const message: string = (body?.message ?? "").toString().trim();
    const imageUrl: string | undefined = body?.image_url;
    const styleIndex: number = Number(body?.style_index ?? 0);
    if (!message && !imageUrl) {
      return new Response(JSON.stringify({ error: "Provide message or image" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (message.length > 1000) return new Response(JSON.stringify({ error: "Message too long" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (styleIndex < 0 || styleIndex > 9) return new Response(JSON.stringify({ error: "Invalid style index" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    let s = slug();
    for (let i = 0; i < 5; i++) {
      const { data: exists } = await admin.from("ai_gift_links").select("id").eq("slug", s).maybeSingle();
      if (!exists) break;
      s = slug();
    }

    const { data: row, error } = await admin.from("ai_gift_links").insert({
      user_id: user.id,
      slug: s,
      payload: { message, image_url: imageUrl ?? null, style_index: styleIndex },
      status: "approved",
      cost_coins: 0,
    }).select().single();
    if (error) throw error;

    return new Response(JSON.stringify({ success: true, link: row }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
