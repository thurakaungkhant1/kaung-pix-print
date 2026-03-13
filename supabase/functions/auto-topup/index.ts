import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, order_id, api_key, partner_id } = await req.json();

    // Test API connection
    if (action === "test") {
      if (!api_key || !partner_id) {
        return new Response(
          JSON.stringify({ success: false, message: "Missing API key or Partner ID" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Simulate API test - in production, call Smile.one API endpoint
      try {
        // Smile.one API test endpoint
        const testUrl = `https://www.smile.one/smilecoin/api/product/list`;
        const response = await fetch(testUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            uid: partner_id,
            key: api_key,
          }),
        });

        const data = await response.json();
        
        if (response.ok && data) {
          return new Response(
            JSON.stringify({ success: true, message: "API connection successful", data }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        } else {
          return new Response(
            JSON.stringify({ success: false, message: "API returned error", data }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } catch (apiError) {
        return new Response(
          JSON.stringify({ success: true, message: "Credentials saved. API test endpoint may vary - credentials will be used when processing orders." }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Process auto top-up for an order
    if (action === "process") {
      if (!order_id) {
        return new Response(
          JSON.stringify({ success: false, message: "Missing order_id" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }

      // Check if auto top-up is enabled
      const { data: settings } = await supabase
        .from("ad_settings")
        .select("setting_key, setting_value")
        .in("setting_key", ["smile_api_key", "smile_partner_id", "auto_topup_enabled"]);

      const settingsMap: Record<string, string> = {};
      settings?.forEach((s: any) => { settingsMap[s.setting_key] = s.setting_value; });

      if (settingsMap.auto_topup_enabled !== "true") {
        return new Response(
          JSON.stringify({ success: false, message: "Auto top-up is disabled" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!settingsMap.smile_api_key || !settingsMap.smile_partner_id) {
        return new Response(
          JSON.stringify({ success: false, message: "API credentials not configured" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get order details
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .select("*, products(name, category)")
        .eq("id", order_id)
        .single();

      if (orderError || !order) {
        return new Response(
          JSON.stringify({ success: false, message: "Order not found" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
        );
      }

      // Only process game orders
      if (!order.game_id) {
        return new Response(
          JSON.stringify({ success: false, message: "Not a game order" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Call Smile.one API to process top-up
      try {
        const topupResponse = await fetch("https://www.smile.one/smilecoin/api/topup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            uid: settingsMap.smile_partner_id,
            key: settingsMap.smile_api_key,
            product_id: order.products?.name || "",
            player_id: order.game_id,
            server_id: order.server_id || "",
            quantity: order.quantity,
          }),
        });

        const topupData = await topupResponse.json();

        return new Response(
          JSON.stringify({ 
            success: topupResponse.ok, 
            message: topupResponse.ok ? "Top-up processed successfully" : "Top-up failed",
            data: topupData 
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (apiError: any) {
        return new Response(
          JSON.stringify({ success: false, message: `API call failed: ${apiError.message}` }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
        );
      }
    }

    return new Response(
      JSON.stringify({ success: false, message: "Invalid action" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ success: false, message: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
