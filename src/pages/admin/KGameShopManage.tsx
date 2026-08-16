import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import AdminBottomNav from "@/components/AdminBottomNav";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  Loader2,
  RefreshCw,
  Wallet,
  Zap,
  CheckCircle2,
  XCircle,
  Hourglass,
  Hand,
} from "lucide-react";

interface MappedProduct {
  id: number;
  name: string | null;
  kgameshop_game: string | null;
  kgameshop_product_id: string | null;
  kgameshop_region: string | null;
}

interface ProviderStatus {
  configured: boolean;
  api_key_configured?: boolean;
  webhook_secret_configured?: boolean;
  webhook_protected?: boolean;
  webhook_url?: string;
  auto_topup_enabled?: boolean;
  mapped_products_count?: number;
  mapped_products?: MappedProduct[];
  connection?: string;
  balance?: number | string | null;
  currency?: string;
  subscription?: string | null;
  subscription_expiry?: string | null;
  message?: string;
}

interface AutoOrder {
  id: string;
  created_at: string;
  status: string;
  game_id: string | null;
  server_id: string | null;
  price: number;
  provider_order_id: string | null;
  provider_status: string | null;
  provider_message: string | null;
  products: { name: string | null } | null;
}

const SETTING_KEY = "kgameshop_auto_topup_enabled";
const CONFIRM_KEY = "kgameshop_confirm_before_send";


const KGameShopManage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [enabled, setEnabled] = useState(false);
  const [pendingToggle, setPendingToggle] = useState<boolean | null>(null);
  const [status, setStatus] = useState<ProviderStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [orders, setOrders] = useState<AutoOrder[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadSetting = async () => {
    const { data } = await supabase
      .from("ad_settings")
      .select("setting_value")
      .eq("setting_key", SETTING_KEY)
      .maybeSingle();
    setEnabled(data?.setting_value === "true");
  };

  const loadStatus = async () => {
    setLoadingStatus(true);
    try {
      const { data, error } = await supabase.functions.invoke("kgameshop-status");
      if (error) throw error;
      setStatus(data as ProviderStatus);
    } catch (e) {
      setStatus({ configured: false, connection: "error", message: "Provider status ကို ဖတ်၍မရပါ" });
    } finally {
      setLoadingStatus(false);
    }
  };

  const loadOrders = async () => {
    const { data } = await supabase
      .from("orders")
      .select("id, created_at, status, game_id, server_id, price, provider_order_id, provider_status, provider_message, products:product_id(name)")
      .eq("fulfillment_provider", "kgameshop")
      .order("created_at", { ascending: false })
      .limit(50);
    setOrders((data as any) || []);
  };

  useEffect(() => {
    loadSetting();
    loadStatus();
    loadOrders();
  }, []);

  const applyToggle = async (next: boolean) => {
    const { error } = await supabase
      .from("ad_settings")
      .upsert({ setting_key: SETTING_KEY, setting_value: next ? "true" : "false" }, { onConflict: "setting_key" });
    if (error) {
      toast({ title: "Error", description: "Setting သိမ်း၍မရပါ", variant: "destructive" });
      return;
    }
    setEnabled(next);
    toast({
      title: next ? "Auto Top-Up ON" : "Auto Top-Up OFF",
      description: next
        ? "အသစ်တင်သော game order များကို KGameShop သို့ အလိုအလျောက် ပို့ပါမည်။"
        : "Order အားလုံးကို manual စနစ်ဖြင့်သာ ဆက်လက်ဆောင်ရွက်ပါမည်။",
    });
  };

  const runAction = async (order: AutoOrder, action: "retry" | "complete" | "manual" | "cancel") => {
    setBusyId(order.id);
    try {
      if (action === "retry") {
        const { data, error } = await supabase.functions.invoke("kgameshop-fulfill", {
          body: { order_id: order.id, force: true },
        });
        if (error) throw error;
        const res = data as any;
        toast({
          title: res?.ok ? "Auto top-up sent" : "Auto top-up skipped",
          description: res?.reason || res?.details || res?.provider_order_id || "",
          variant: res?.ok ? "default" : "destructive",
        });
      } else {
        const patch: Record<string, unknown> =
          action === "complete"
            ? { status: "finished", provider_status: "completed_manual" }
            : action === "manual"
            ? { status: "approved", provider_status: "manual_fulfilment" }
            : { status: "cancelled", provider_status: "cancelled" };
        const { error } = await supabase.from("orders").update(patch).eq("id", order.id);
        if (error) throw error;
        toast({ title: "Order updated" });
      }
      await loadOrders();
    } catch (e: any) {
      toast({ title: "Error", description: e?.message || "Action failed", variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  const counts = {
    processing: orders.filter((o) => o.status === "processing").length,
    failed: orders.filter((o) => o.status === "failed").length,
    done: orders.filter((o) => ["completed", "finished"].includes(o.status)).length,
  };

  const connectionBadge = () => {
    if (loadingStatus) return <Badge variant="secondary">Checking…</Badge>;
    if (status?.connection === "connected")
      return <Badge className="bg-green-500/15 text-green-600 border-green-500/30">Connected</Badge>;
    return <Badge variant="destructive">Not connected</Badge>;
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-40 bg-gradient-primary text-primary-foreground p-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/admin")} aria-label="Back">
            <ArrowLeft className="h-6 w-6" />
          </button>
          <div>
            <h1 className="text-xl font-bold">KGameShop Auto Top-Up</h1>
            <p className="text-xs opacity-80">Optional automation • Manual system unchanged</p>
          </div>
        </div>
      </header>

      <main className="max-w-screen-lg mx-auto p-4 space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" /> Auto Top-Up
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">{enabled ? "ON — automatic" : "OFF — manual only"}</p>
                <p className="text-xs text-muted-foreground">
                  Toggle ပိတ်ထားချိန်မှာ ရှိပြီးသား manual workflow အတိုင်းသာ အလုပ်လုပ်ပါမည်။
                </p>
              </div>
              <Switch checked={enabled} onCheckedChange={(v) => setPendingToggle(v)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base flex items-center gap-2">
              <Wallet className="h-4 w-4 text-primary" /> Provider status
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={loadStatus} disabled={loadingStatus}>
              {loadingStatus ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            </Button>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Connection</span>
              {connectionBadge()}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Balance</span>
              <span className="font-semibold">
                {status?.balance != null ? `${status.balance} ${status.currency ?? ""}` : "—"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Subscription</span>
              <span>{status?.subscription ?? "—"}</span>
            </div>
            {status?.message && (
              <p className="text-xs text-destructive break-words">{status.message}</p>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Processing", value: counts.processing, icon: Hourglass, color: "text-yellow-500" },
            { label: "Completed", value: counts.done, icon: CheckCircle2, color: "text-green-500" },
            { label: "Failed", value: counts.failed, icon: XCircle, color: "text-destructive" },
          ].map((c) => (
            <Card key={c.label}>
              <CardContent className="p-3 flex flex-col items-center gap-1">
                <c.icon className={`h-5 w-5 ${c.color}`} />
                <span className="text-lg font-bold">{c.value}</span>
                <span className="text-[11px] text-muted-foreground">{c.label}</span>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Auto orders (latest 50)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {orders.length === 0 && (
              <p className="text-sm text-muted-foreground">Auto top-up order မရှိသေးပါ။</p>
            )}
            {orders.map((o) => (
              <div key={o.id} className="rounded-lg border border-border p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{o.products?.name || "Package"}</p>
                    <p className="text-xs text-muted-foreground">
                      #{o.id.slice(0, 8).toUpperCase()} • {new Date(o.created_at).toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Player: {o.game_id || "-"}{o.server_id ? ` (${o.server_id})` : ""}
                    </p>
                    {o.provider_order_id && (
                      <p className="text-xs text-muted-foreground">Provider: {o.provider_order_id}</p>
                    )}
                    {o.provider_message && (
                      <p className="text-xs text-destructive break-words">{o.provider_message}</p>
                    )}
                  </div>
                  <Badge variant="secondary" className="shrink-0">{o.provider_status || o.status}</Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" disabled={busyId === o.id} onClick={() => runAction(o, "retry")}>
                    {busyId === o.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                    <span className="ml-1">Retry auto</span>
                  </Button>
                  <Button size="sm" variant="outline" disabled={busyId === o.id} onClick={() => runAction(o, "manual")}>
                    <Hand className="h-3.5 w-3.5 mr-1" /> Manual
                  </Button>
                  <Button size="sm" variant="outline" disabled={busyId === o.id} onClick={() => runAction(o, "complete")}>
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Complete
                  </Button>
                  <Button size="sm" variant="destructive" disabled={busyId === o.id} onClick={() => runAction(o, "cancel")}>
                    <XCircle className="h-3.5 w-3.5 mr-1" /> Cancel
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </main>

      <AlertDialog open={pendingToggle !== null} onOpenChange={(open) => !open && setPendingToggle(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingToggle ? "Auto Top-Up ဖွင့်မလား?" : "Auto Top-Up ပိတ်မလား?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingToggle
                ? "ဖွင့်ပြီးနောက် တင်သော game order များထဲက mapping ရှိသည့် package များကိုသာ KGameShop သို့ ပို့ပါမည်။ ရှိပြီးသား order များ မပြောင်းလဲပါ။"
                : "ပိတ်လိုက်ပါက order အားလုံးကို manual စနစ်ဖြင့်သာ ဆက်လုပ်ပါမည်။ လက်ရှိ processing order များ မပျက်ပါ။"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingToggle !== null) applyToggle(pendingToggle);
                setPendingToggle(null);
              }}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AdminBottomNav activeTab="kgameshop" onTabChange={() => {}} />
    </div>
  );
};

export default KGameShopManage;
