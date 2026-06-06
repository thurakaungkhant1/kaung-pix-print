// Verifies a download PIN for a photo without exposing PIN values to clients.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify caller is authenticated
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userRes, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userRes?.user) {
      return new Response(
        JSON.stringify({ ok: false, error: "unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body = await req.json().catch(() => ({}));
    const photoId = Number(body?.photo_id);
    const pin = String(body?.pin ?? "").trim();

    if (!Number.isFinite(photoId) || photoId <= 0) {
      return new Response(JSON.stringify({ ok: false, error: "invalid_photo_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!/^\d{4,8}$/.test(pin)) {
      return new Response(JSON.stringify({ ok: false, error: "invalid_pin_format" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Service role: read pin securely
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { data: row, error } = await admin
      .from("photo_pins")
      .select("pin")
      .eq("photo_id", photoId)
      .maybeSingle();

    if (error) {
      return new Response(JSON.stringify({ ok: false, error: "lookup_failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!row) {
      // No pin set means no verification needed
      return new Response(JSON.stringify({ ok: true, required: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const match = String(row.pin) === pin;
    return new Response(JSON.stringify({ ok: match, required: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (_e) {
    return new Response(JSON.stringify({ ok: false, error: "internal_error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
