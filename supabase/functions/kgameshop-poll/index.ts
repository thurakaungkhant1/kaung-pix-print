// Scheduled: re-check Processing KGameShop orders via the VPS status endpoint
// and send one Telegram notice per status change (incl. admin-panel changes).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { checkProviderStatus, notifyKgOrder } from "../_shared/kgameshop.ts";

Deno.serve(async () => {
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const since = new Date(Date.now() - 7 * 864e5).toISOString();

  const { data: processing } = await admin.from("orders").select("id")
    .eq("fulfillment_provider", "kgameshop").eq("status", "approved")
    .not("provider_order_id", "is", null).gte("created_at", since).limit(50);
  let checked = 0;
  for (const o of processing ?? []) {
    try { await checkProviderStatus(admin, o.id); checked++; } catch (e) { console.error("check", o.id, e); }
  }

  const { data: recent } = await admin.from("orders").select("id,status,telegram_notified_status")
    .eq("fulfillment_provider", "kgameshop").gte("created_at", since).limit(200);
  let notified = 0;
  for (const o of recent ?? []) {
    if (o.status !== o.telegram_notified_status && (await notifyKgOrder(admin, o.id))) notified++;
  }
  return new Response(JSON.stringify({ ok: true, checked, notified }), { headers: { "Content-Type": "application/json" } });
});
