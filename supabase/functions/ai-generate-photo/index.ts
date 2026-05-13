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
    const promptInput: string = (body?.prompt ?? "").toString().trim();
    const sourceImageUrl: string | undefined = body?.source_image_url;
    const styleKey: string | undefined = body?.style_key;
    if (!promptInput || promptInput.length < 3 || promptInput.length > 1000) {
      return new Response(JSON.stringify({ error: "Prompt must be 3-1000 characters" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load AI settings
    const { data: settings } = await admin
      .from("ai_usage_settings")
      .select("photo_cost_coins, free_daily_limit, premium_daily_limit, ai_paused")
      .limit(1)
      .maybeSingle();
    const photoCost = settings?.photo_cost_coins ?? 0;
    const freeLimit = settings?.free_daily_limit ?? 5;
    const premiumLimit = settings?.premium_daily_limit ?? 100;
    const aiPaused = settings?.ai_paused ?? false;

    if (aiPaused) {
      return new Response(
        JSON.stringify({ error: "AI generation is temporarily paused by admin. Please try later." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Premium check
    const { data: premiumActive } = await admin.rpc("is_premium_active", { _user_id: user.id });
    const isPremium = !!premiumActive;

    // Validate style and gate premium styles
    let promptSuffix = "";
    if (styleKey) {
      const { data: style } = await admin
        .from("ai_styles")
        .select("tier, prompt_suffix, is_active")
        .eq("key", styleKey)
        .maybeSingle();
      if (!style || !style.is_active) {
        return new Response(JSON.stringify({ error: "Invalid style" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (style.tier === "premium" && !isPremium) {
        return new Response(
          JSON.stringify({ error: "This style requires Premium. Upgrade to unlock.", code: "PREMIUM_REQUIRED" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      promptSuffix = style.prompt_suffix ?? "";
    }
    const finalPrompt = promptSuffix ? `${promptInput}${promptSuffix}` : promptInput;

    // Load profile for credit tracking
    const { data: profile } = await admin
      .from("profiles")
      .select("wallet_balance, daily_ai_credits, premium_ai_credits, daily_credits_reset_date, total_ai_generations")
      .eq("id", user.id)
      .maybeSingle();

    const today = new Date().toISOString().slice(0, 10);
    let dailyCredits = profile?.daily_ai_credits ?? freeLimit;
    let premiumCredits = profile?.premium_ai_credits ?? 0;
    const resetDate = profile?.daily_credits_reset_date as string | null | undefined;

    // Daily reset
    if (resetDate !== today) {
      dailyCredits = isPremium ? premiumLimit : freeLimit;
      await admin
        .from("profiles")
        .update({ daily_ai_credits: dailyCredits, daily_credits_reset_date: today })
        .eq("id", user.id);
    }

    // Decide which credit pool to consume
    let consumePool: "premium_pack" | "daily" = "daily";
    if (isPremium && premiumCredits > 0) consumePool = "premium_pack";

    if (consumePool === "daily" && dailyCredits <= 0) {
      const errMsg = isPremium
        ? "Daily premium limit reached. Try again tomorrow."
        : "Daily limit reached. Upgrade to Premium to continue generating.";
      return new Response(
        JSON.stringify({ error: errMsg, code: isPremium ? "DAILY_LIMIT" : "FREE_LIMIT_REACHED" }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Optional wallet cost (kept for compatibility — defaults 0)
    const balance = Number(profile?.wallet_balance ?? 0);
    if (photoCost > 0 && balance < photoCost) {
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
          { type: "text", text: finalPrompt },
          { type: "image_url", image_url: { url: sourceImageUrl } },
        ]
      : finalPrompt;

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

    // Deduct credits and (optional) coins
    const updates: Record<string, any> = {
      total_ai_generations: (profile?.total_ai_generations ?? 0) + 1,
    };
    if (consumePool === "premium_pack") {
      updates.premium_ai_credits = Math.max(0, premiumCredits - 1);
    } else {
      updates.daily_ai_credits = Math.max(0, dailyCredits - 1);
    }
    if (photoCost > 0) updates.wallet_balance = balance - photoCost;
    await admin.from("profiles").update(updates).eq("id", user.id);

    // Save generation
    const { data: gen, error: insertErr } = await admin
      .from("ai_photo_generations")
      .insert({
        user_id: user.id,
        prompt: finalPrompt,
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
        new_balance: photoCost > 0 ? balance - photoCost : balance,
        is_premium: isPremium,
        skip_watermark: isPremium,
        credits: {
          daily: updates.daily_ai_credits ?? dailyCredits,
          premium_pack: updates.premium_ai_credits ?? premiumCredits,
        },
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
