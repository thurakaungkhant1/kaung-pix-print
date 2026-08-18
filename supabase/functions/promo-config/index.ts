import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const [placementsRes, settingsRes] = await Promise.all([
      supabase
        .from("ad_placements")
        .select("id, name, placement_type, zone_id, script_code, page_location, position, display_order")
        .eq("is_active", true)
        .order("display_order", { ascending: true }),
      supabase.from("ad_settings").select("setting_key, setting_value"),
    ]);

    const settings: Record<string, string> = {};
    for (const row of settingsRes.data ?? []) {
      // Only expose non-sensitive display settings to the client.
      if (/^interstitial_|^banner_|^rewarded_/.test(row.setting_key)) {
        settings[row.setting_key] = row.setting_value;
      }
    }

    return new Response(
      JSON.stringify({ placements: placementsRes.data ?? [], settings }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ placements: [], settings: {}, error: String(e) }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
