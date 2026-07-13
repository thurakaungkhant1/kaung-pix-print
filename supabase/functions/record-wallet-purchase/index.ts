// Server-side recorder for wallet purchase transactions.
// Client-side inserts on public.wallet_transactions are blocked; this function
// verifies the order belongs to the caller and inserts an audited row using
// the service role.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (o: unknown, status = 200) =>
  new Response(JSON.stringify(o), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

  const supaUser = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: userData, error: userErr } = await supaUser.auth.getUser();
  if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);
  const user = userData.user;

  let body: { order_id?: string; description?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid body" }, 400);
  }
  const orderId = (body.order_id || "").trim();
  if (!orderId) return json({ error: "Missing order_id" }, 400);

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  // Verify the order exists, belongs to caller, and has not already been logged
  const { data: order, error: orderErr } = await admin
    .from("orders")
    .select("id, user_id, price, product_id, products:product_id(name)")
    .eq("id", orderId)
    .maybeSingle();
  if (orderErr || !order) return json({ error: "Order not found" }, 404);
  if (order.user_id !== user.id) return json({ error: "Forbidden" }, 403);

  const { data: existing } = await admin
    .from("wallet_transactions")
    .select("id")
    .eq("reference_id", orderId)
    .eq("transaction_type", "purchase")
    .maybeSingle();
  if (existing?.id) return json({ ok: true, duplicate: true });

  const { data: prof } = await admin
    .from("profiles")
    .select("wallet_balance")
    .eq("id", user.id)
    .maybeSingle();
  const balanceAfter = Number(prof?.wallet_balance || 0);
  const amount = -Math.abs(Number(order.price || 0));

  const productName = (order as any).products?.name || "order";
  const { error: insErr } = await admin.from("wallet_transactions").insert({
    user_id: user.id,
    amount,
    transaction_type: "purchase",
    reference_id: orderId,
    description: body.description || `Purchase: ${productName}`,
    balance_after: balanceAfter,
  });
  if (insErr) return json({ error: insErr.message }, 500);
  return json({ ok: true });
});
