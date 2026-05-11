import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );
    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const prompt: string = (body?.prompt ?? "").toString().trim();
    const sourceImageUrl: string | undefined = body?.source_image_url;
    if (!prompt || prompt.length < 3 || prompt.length > 1000) {
      return new Response(JSON.stringify({ error: "Prompt must be 3-1000 characters" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load settings
    const { data: settings } = await admin
      .from("ai_usage_settings")
      .select("photo_cost_coins, daily_photo_limit")
      .limit(1)
      .maybeSingle();
    const photoCost = settings?.photo_cost_coins ?? 50;
    const dailyLimit = settings?.daily_photo_limit ?? 5;

    // Daily limit check
    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);
    const { count: usedToday } = await admin
      .from("ai_photo_generations")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", startOfDay.toISOString());

    if ((usedToday ?? 0) >= dailyLimit) {
      return new Response(
        JSON.stringify({ error: `Daily limit reached (${dailyLimit}/day). Try again tomorrow.`, code: "DAILY_LIMIT" }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Wallet balance check
    const { data: profile } = await admin
      .from("profiles")
      .select("wallet_balance")
      .eq("id", user.id)
      .maybeSingle();
    const balance = Number(profile?.wallet_balance ?? 0);
    if (balance < photoCost) {
      return new Response(
        JSON.stringify({ error: `Insufficient coins. Need ${photoCost}, have ${balance}.`, code: "INSUFFICIENT_FUNDS" }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Call Lovable AI
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const messageContent: any = sourceImageUrl
      ? [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url: sourceImageUrl } },
        ]
      : prompt;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3.1-flash-image-preview",
        messages: [{ role: "user", content: messageContent }],
        modalities: ["image", "text"],
      }),
    });

    if (!aiResp.ok) {
      const txt = await aiResp.text();
      console.error("AI gateway error", aiResp.status, txt);
      if (aiResp.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, try later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResp.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Contact admin." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "Image generation failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResp.json();
    const dataUrl: string | undefined = aiData?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!dataUrl) {
      return new Response(JSON.stringify({ error: "No image returned" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Decode and upload to ai-photos bucket
    const base64 = dataUrl.split(",")[1] ?? "";
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const filePath = `${user.id}/${Date.now()}.png`;
    const { error: uploadError } = await admin.storage
      .from("ai-photos")
      .upload(filePath, bytes, { contentType: "image/png", upsert: false });
    if (uploadError) throw uploadError;

    const { data: publicUrlData } = admin.storage.from("ai-photos").getPublicUrl(filePath);
    const resultUrl = publicUrlData.publicUrl;

    // Deduct coins
    await admin
      .from("profiles")
      .update({ wallet_balance: balance - photoCost })
      .eq("id", user.id);

    // Save generation
    const { data: gen, error: insertErr } = await admin
      .from("ai_photo_generations")
      .insert({
        user_id: user.id,
        prompt,
        source_image_url: sourceImageUrl ?? null,
        result_image_url: resultUrl,
        cost_coins: photoCost,
        status: "completed",
      })
      .select()
      .single();
    if (insertErr) throw insertErr;

    return new Response(
      JSON.stringify({
        success: true,
        result_image_url: resultUrl,
        cost_coins: photoCost,
        new_balance: balance - photoCost,
        used_today: (usedToday ?? 0) + 1,
        daily_limit: dailyLimit,
        generation: gen,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("ai-generate-photo error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
