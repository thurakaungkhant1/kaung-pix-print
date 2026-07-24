// Award positive point/coin credits from the browser through a service_role
// pipeline. This is the ONLY server-verified path that can write positive rows
// into public.point_transactions or increase profiles.points / game_points.
//
// Every credit also writes a matching row into public.point_credit_audit
// capturing source, reason, actor, request metadata and related entity ids
// so the user can see who / what / why in their point history.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Source = "chat" | "arcade" | "game" | "spin";
interface Body {
  source: Source;
  // chat
  message?: string;
  // arcade
  slug?: string;
  // game
  game_name?: string;
  score?: number;
  is_win?: boolean;
  // spin
  spin_amount?: number;
}

const json = (o: unknown, status = 200) =>
  new Response(JSON.stringify(o), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

const startOfDay = () => {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return json({ error: "Unauthorized" }, 401);
  }

  const supaUser = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const token = authHeader.replace("Bearer ", "");
  const { data: claims, error: userErr } = await supaUser.auth.getClaims(token);
  if (userErr || !claims?.claims?.sub) return json({ error: "Unauthorized" }, 401);
  const user = { id: claims.claims.sub as string };

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid body" }, 400);
  }
  if (!body?.source) return json({ error: "Missing source" }, 400);

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("cf-connecting-ip") ||
    null;
  const userAgent = req.headers.get("user-agent") || null;

  // Helper: perform the credit + write audit atomically-ish
  async function credit(opts: {
    amount: number;
    field: "points" | "game_points";
    transaction_type: string;
    description: string;
    source: string;
    reason: string;
    related_entity?: string | null;
    related_entity_id?: string | null;
    country?: string | null;
    metadata?: Record<string, unknown>;
  }) {
    if (opts.amount <= 0) {
      // Log the denial for auditability
      await admin.from("point_credit_audit").insert({
        user_id: user.id,
        amount: 0,
        source: opts.source,
        reason: opts.reason,
        actor: "service_role",
        related_entity: opts.related_entity ?? null,
        related_entity_id: opts.related_entity_id ?? null,
        ip,
        user_agent: userAgent,
        country: opts.country ?? null,
        metadata: opts.metadata ?? {},
      });
      return { amount: 0, reason: opts.reason };
    }

    // Read current value using service role
    const { data: prof, error: profErr } = await admin
      .from("profiles")
      .select(opts.field)
      .eq("id", user.id)
      .maybeSingle();
    if (profErr || !prof) {
      return { amount: 0, reason: "error", error: profErr?.message };
    }
    const current = (prof as Record<string, number>)[opts.field] ?? 0;

    const { error: upErr } = await admin
      .from("profiles")
      .update({ [opts.field]: current + opts.amount })
      .eq("id", user.id);
    if (upErr) return { amount: 0, reason: "error", error: upErr.message };

    const { data: tx, error: txErr } = await admin
      .from("point_transactions")
      .insert({
        user_id: user.id,
        amount: opts.amount,
        transaction_type: opts.transaction_type,
        description: opts.description,
      })
      .select("id")
      .maybeSingle();
    if (txErr) return { amount: 0, reason: "error", error: txErr.message };

    await admin.from("point_credit_audit").insert({
      transaction_id: tx?.id ?? null,
      user_id: user.id,
      amount: opts.amount,
      source: opts.source,
      reason: opts.reason,
      actor: "service_role",
      related_entity: opts.related_entity ?? null,
      related_entity_id: opts.related_entity_id ?? null,
      ip,
      user_agent: userAgent,
      country: opts.country ?? null,
      metadata: opts.metadata ?? {},
    });

    return { amount: opts.amount, reason: opts.reason, transaction_id: tx?.id };
  }

  // Sum today's credited amounts for a specific transaction_type
  async function todayCredited(txType: string) {
    const { data } = await admin
      .from("point_transactions")
      .select("amount")
      .eq("user_id", user.id)
      .eq("transaction_type", txType)
      .gte("created_at", startOfDay());
    return (data || []).reduce((s, t: { amount: number }) => s + (t.amount || 0), 0);
  }

  try {
    switch (body.source) {
      // ==================== CHAT ====================
      case "chat": {
        const message = (body.message || "").trim();

        const { data: settings } = await admin
          .from("chat_earning_settings")
          .select("*")
          .maybeSingle();
        const s = {
          enabled: settings?.enabled ?? true,
          require_vpn: settings?.require_vpn ?? true,
          home_country: (settings?.home_country ?? "MM").toUpperCase(),
          reward_per_message: settings?.reward_per_message ?? 1,
          daily_cap: settings?.daily_cap ?? 20,
          min_message_length: settings?.min_message_length ?? 2,
          cooldown_seconds: settings?.cooldown_seconds ?? 10,
        };
        if (!s.enabled)
          return json(await credit({ amount: 0, field: "points", transaction_type: "chat", description: "chat reward disabled", source: "chat", reason: "disabled" }));
        if (message.length < s.min_message_length)
          return json(await credit({ amount: 0, field: "points", transaction_type: "chat", description: "message too short", source: "chat", reason: "too_short" }));

        // Cooldown & duplicate — check last chat reward row
        const { data: lastRow } = await admin
          .from("point_transactions")
          .select("created_at, description")
          .eq("user_id", user.id)
          .eq("transaction_type", "chat")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (lastRow) {
          const elapsed = (Date.now() - new Date(lastRow.created_at).getTime()) / 1000;
          if (elapsed < s.cooldown_seconds) {
            return json(await credit({ amount: 0, field: "points", transaction_type: "chat", description: "cooldown", source: "chat", reason: "cooldown", metadata: { cooldownRemaining: Math.ceil(s.cooldown_seconds - elapsed) } }));
          }
        }

        // VPN
        let country: string | null = null;
        if (s.require_vpn) {
          try {
            const r = await fetch("https://ipapi.co/json/", { cache: "no-store" });
            const d = await r.json();
            country = ((d?.country || d?.country_code || "") as string).toUpperCase() || null;
          } catch {}
          if (!country || country === s.home_country) {
            return json(await credit({ amount: 0, field: "points", transaction_type: "chat", description: "vpn required", source: "chat", reason: "vpn_required", country }));
          }
        }

        const used = await todayCredited("chat");
        if (used >= s.daily_cap)
          return json(await credit({ amount: 0, field: "points", transaction_type: "chat", description: "daily cap reached", source: "chat", reason: "daily_cap", country }));

        const amount = Math.min(s.reward_per_message, s.daily_cap - used);
        const result = await credit({
          amount,
          field: "points",
          transaction_type: "chat",
          description: `Earned ${amount} coin from chat message`,
          source: "chat",
          reason: "ok",
          related_entity: "chat_message",
          country,
          metadata: { preview: message.slice(0, 120) },
        });
        // Mirror log to chat_reward_logs for the admin dashboard
        await admin.from("chat_reward_logs").insert({
          user_id: user.id,
          amount: result.amount,
          reason: result.reason,
          message_preview: message.slice(0, 120),
          country,
        });
        return json(result);
      }

      // ==================== ARCADE ====================
      case "arcade": {
        const slug = (body.slug || "").trim();
        if (!slug) return json({ error: "Missing slug" }, 400);

        // Once per day per slug
        const { data: existing } = await admin
          .from("point_transactions")
          .select("id")
          .eq("user_id", user.id)
          .eq("transaction_type", "web_arcade_play")
          .eq("description", `Played ${slug} on Web Arcade`)
          .gte("created_at", startOfDay())
          .limit(1);
        if (existing && existing.length) {
          return json(await credit({ amount: 0, field: "points", transaction_type: "web_arcade_play", description: `already claimed for ${slug}`, source: "arcade", reason: "already_claimed", related_entity: "arcade_session", related_entity_id: slug }));
        }

        return json(await credit({
          amount: 5,
          field: "points",
          transaction_type: "web_arcade_play",
          description: `Played ${slug} on Web Arcade`,
          source: "arcade",
          reason: "ok",
          related_entity: "arcade_session",
          related_entity_id: slug,
        }));
      }

      // ==================== MINI-GAME ====================
      case "game": {
        const gameName = (body.game_name || "").trim();
        const score = Number(body.score ?? 0);
        const isWin = !!body.is_win;
        if (!gameName) return json({ error: "Missing game_name" }, 400);

        const { data: settingsRow } = await admin
          .from("game_settings")
          .select("*")
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        const g = {
          base: 5,
          win: settingsRow?.win_bonus_points ?? 20,
          high: settingsRow?.high_score_bonus_points ?? 10,
          threshold: settingsRow?.high_score_threshold ?? 100,
          dailyLimit: settingsRow?.daily_limit ?? 500,
          cooldown: settingsRow?.cooldown_seconds ?? 30,
        };

        // Cooldown by game_name
        const { data: lastPlay } = await admin
          .from("game_scores")
          .select("created_at")
          .eq("user_id", user.id)
          .eq("game_name", gameName)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (lastPlay) {
          const elapsed = (Date.now() - new Date(lastPlay.created_at).getTime()) / 1000;
          if (elapsed < g.cooldown) {
            return json(await credit({ amount: 0, field: "game_points", transaction_type: "game_play", description: "cooldown", source: "game", reason: "cooldown", related_entity: "game_score", related_entity_id: gameName, metadata: { cooldownRemaining: Math.ceil(g.cooldown - elapsed) } }));
          }
        }

        // Rules: Win => 8 points, Loss => 1 point. Hard daily cap of 1000 game points.
        const DAILY_CAP = 1000;
        let earn = isWin ? 8 : 1;

        const usedGame = await todayCredited("game_play");
        if (usedGame >= DAILY_CAP) {
          return json(await credit({ amount: 0, field: "game_points", transaction_type: "game_play", description: "daily 1000 point limit reached", source: "game", reason: "daily_cap", related_entity: "game_score", related_entity_id: gameName }));
        }
        earn = Math.max(0, Math.min(earn, DAILY_CAP - usedGame));

        const { data: gsIns } = await admin
          .from("game_scores")
          .insert({
            user_id: user.id,
            game_name: gameName,
            score,
            points_earned: earn,
            is_win: isWin,
          })
          .select("id")
          .maybeSingle();

        return json(await credit({
          amount: earn,
          field: "game_points",
          transaction_type: "game_play",
          description: `Earned ${earn} game points playing ${gameName}`,
          source: "game",
          reason: "ok",
          related_entity: "game_score",
          related_entity_id: gsIns?.id ?? gameName,
          metadata: { score, is_win: isWin },
        }));
      }

      // ==================== SPIN ====================
      case "spin": {
        const amount = Math.max(0, Math.min(100, Math.floor(Number(body.spin_amount ?? 5))));
        // Once per day
        const { data: existing } = await admin
          .from("point_transactions")
          .select("id")
          .eq("user_id", user.id)
          .eq("transaction_type", "spin")
          .gte("created_at", startOfDay())
          .limit(1);
        if (existing && existing.length) {
          return json(await credit({ amount: 0, field: "points", transaction_type: "spin", description: "already spun today", source: "spin", reason: "already_claimed" }));
        }
        return json(await credit({
          amount,
          field: "points",
          transaction_type: "spin",
          description: `Daily spin: earned ${amount} coins`,
          source: "spin",
          reason: "ok",
          related_entity: "spin",
        }));
      }
    }

    return json({ error: "Unknown source" }, 400);
  } catch (err) {
    console.error("award-points error", err);
    return json({ error: err instanceof Error ? err.message : "Internal error" }, 500);
  }
});
