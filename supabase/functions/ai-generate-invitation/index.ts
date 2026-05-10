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
    if (!authHeader) return new Response(JSON.stringify({ error: "Missing auth" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "", { global: { headers: { Authorization: authHeader } } });
    const admin = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json();
    const text: string = (body?.invitation_text ?? "").toString().trim();
    const theme: string = (body?.theme ?? "classic").toString();
    if (text.length < 10 || text.length > 2000) {
      return new Response(JSON.stringify({ error: "Invitation text must be 10–2000 chars" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const sysPrompt = `You design wedding invitations. Given an invitation text and theme, return 3 distinct invitation style variants. Each variant must include: a short name (e.g. "Royal Gold"), a 2-sentence description, a CSS gradient background expression (e.g. "linear-gradient(135deg, #f6d365, #fda085)"), a primary text color hex, and an accent text color hex. Return ONLY via the tool call.`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: sysPrompt },
          { role: "user", content: `Theme: ${theme}\nInvitation text:\n${text}` },
        ],
        tools: [{
          type: "function",
          function: {
            name: "build_invitation_styles",
            description: "Return 3 wedding invitation style variants",
            parameters: {
              type: "object",
              properties: {
                styles: {
                  type: "array",
                  minItems: 3,
                  maxItems: 3,
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      description: { type: "string" },
                      background: { type: "string" },
                      text_color: { type: "string" },
                      accent_color: { type: "string" },
                    },
                    required: ["name", "description", "background", "text_color", "accent_color"],
                  },
                },
              },
              required: ["styles"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "build_invitation_styles" } },
      }),
    });

    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("AI error", aiResp.status, t);
      if (aiResp.status === 429) return new Response(JSON.stringify({ error: "Rate limit, try later" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (aiResp.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted. Contact admin." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ error: "AI failed" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await aiResp.json();
    const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];
    let styles: any[] = [];
    try {
      const args = JSON.parse(toolCall?.function?.arguments ?? "{}");
      styles = args.styles ?? [];
    } catch { styles = []; }
    if (!styles.length) {
      return new Response(JSON.stringify({ error: "No styles generated" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: settings } = await admin.from("ai_usage_settings").select("invitation_price_mmk").limit(1).maybeSingle();
    const price = Number(settings?.invitation_price_mmk ?? 1000);

    const { data: inv, error: insErr } = await admin.from("ai_invitations").insert({
      user_id: user.id,
      invitation_text: text,
      theme,
      styles,
      price_mmk: price,
      status: "pending",
      paid: false,
    }).select().single();
    if (insErr) throw insErr;

    return new Response(JSON.stringify({ success: true, invitation: inv }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
