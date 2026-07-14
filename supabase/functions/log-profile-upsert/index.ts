// Server-side logger for profile upsert results after OAuth sign-in.
// Verifies the caller's JWT, then writes a structured log line + persists a row
// to auth_error_logs (when the upsert failed) so admins can diagnose quickly.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(url, anon, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const user = userData.user;

    const body = await req.json().catch(() => ({}));
    const {
      success,
      provider = "google",
      error_code = null,
      error_message = null,
      error_details = null,
      stage = "profiles_upsert",
    } = body ?? {};

    const line = {
      ts: new Date().toISOString(),
      user_id: user.id,
      email: user.email,
      provider,
      stage,
      success: !!success,
      error_code,
      error_message,
    };
    // Structured console log — visible in edge function logs.
    console.log("[profiles-upsert]", JSON.stringify(line));

    if (!success) {
      const admin = createClient(url, service);
      // Best-effort persist. Table may or may not exist; ignore failures.
      const { error: logErr } = await admin.from("auth_error_logs").insert({
        provider,
        error_code: error_code ? String(error_code) : stage,
        error_message: error_message
          ? `[${stage}] user=${user.email ?? user.id} :: ${String(error_message).slice(0, 1800)}`
          : `[${stage}] user=${user.email ?? user.id}`,
        user_agent: req.headers.get("user-agent"),
        url: req.headers.get("referer"),
      });
      if (logErr) console.warn("[profiles-upsert] persist failed:", logErr.message);
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[profiles-upsert] handler crashed:", e);
    return new Response(JSON.stringify({ error: "internal" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
