import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import MobileLayout from "@/components/MobileLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Loader2,
  Package,
  Clock,
  CheckCircle2,
  XCircle,
  MessageCircle,
  Receipt,
  CreditCard,
  Hash,
  Phone,
  MapPin,
  Circle,
} from "lucide-react";
import { format } from "date-fns";

interface OrderRow {
  id: string;
  user_id: string;
  quantity: number;
  price: number;
  status: string;
  created_at: string;
  payment_method: string;
  transaction_id: string | null;
  phone_number: string | null;
  delivery_address: string | null;
  game_id: string | null;
  server_id: string | null;
  products: { name: string; image_url: string | null; category: string; price: number; description: string | null } | null;
}

const statusMeta = (status: string) => {
  switch (status) {
    case "approved":
    case "finished":
    case "completed":
      return { label: "Completed", cls: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30", Icon: CheckCircle2 };
    case "rejected":
    case "cancelled":
      return { label: "Cancelled", cls: "bg-rose-500/15 text-rose-600 border-rose-500/30", Icon: XCircle };
    case "awaiting_info":
      return { label: "Pending Admin Info", cls: "bg-amber-500/15 text-amber-600 border-amber-500/30", Icon: MessageCircle };
    default:
      return { label: "Pending", cls: "bg-blue-500/15 text-blue-600 border-blue-500/30", Icon: Clock };
  }
};

const TIMELINE_STEPS = [
  { key: "placed", label: "Order Placed" },
  { key: "review", label: "Admin Reviewing" },
  { key: "completed", label: "Completed / Delivered" },
];

const OrderDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [order, setOrder] = useState<OrderRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<{ id: string; body: string; sender_role: string; created_at: string }[]>([]);

  const load = async () => {
    if (!id || !user) return;
    setLoading(true);
    const { data } = await supabase
      .from("orders")
      .select(
        "id, user_id, quantity, price, status, created_at, payment_method, transaction_id, phone_number, delivery_address, game_id, server_id, products(name, image_url, category, price, description)"
      )
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();
    setOrder((data as any) || null);
    const { data: msgs } = await (supabase as any)
      .from("support_messages")
      .select("id, body, sender_role, created_at")
      .eq("user_id", user.id)
      .eq("order_id", id)
      .order("created_at", { ascending: true });
    setMessages(msgs || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    if (!id || !user) return;
    const channel = supabase
      .channel(`order-detail-${id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${id}` },
        () => load()
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "support_messages", filter: `user_id=eq.${user.id}` },
        (p: any) => {
          if (p.new.order_id === id) setMessages((prev) => [...prev, p.new]);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user]);

  if (loading) {
    return (
      <MobileLayout>
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </MobileLayout>
    );
  }
  if (!order) {
    return (
      <MobileLayout>
        <div className="max-w-2xl mx-auto p-6 text-center">
          <Package className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
          <p className="text-muted-foreground">Order not found.</p>
          <Button className="mt-4" variant="outline" onClick={() => navigate("/orders")}>
            Back to orders
          </Button>
        </div>
      </MobileLayout>
    );
  }

  const s = statusMeta(order.status);
  const SIcon = s.Icon;
  const completed = ["approved", "finished", "completed"].includes(order.status);
  const cancelled = ["rejected", "cancelled"].includes(order.status);
  const subtotal = Number(order.products?.price || order.price) * order.quantity;
  const total = Number(order.price);

  // Timeline state per step
  const stepState = (key: string): "done" | "active" | "pending" | "cancelled" => {
    if (cancelled && key !== "placed") return "cancelled";
    if (key === "placed") return "done";
    if (key === "review") return completed ? "done" : "active";
    if (key === "completed") return completed ? "done" : "pending";
    return "pending";
  };

  return (
    <MobileLayout>
      <div className="max-w-2xl mx-auto p-4 space-y-4 pb-24">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-xl">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-bold">Order Details</h1>
          </div>
        </div>

        {/* Status banner */}
        <Card className={`rounded-2xl border ${s.cls}`}>
          <CardContent className="p-4 flex items-center gap-3">
            <SIcon className="h-6 w-6" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold">{s.label}</p>
              <p className="text-[11px] opacity-80 font-mono">#{order.id.slice(0, 8).toUpperCase()}</p>
            </div>
            <Badge variant="outline" className="bg-background/50">
              {format(new Date(order.created_at), "MMM d, HH:mm")}
            </Badge>
          </CardContent>
        </Card>

        {/* Items */}
        <Card className="rounded-2xl">
          <CardContent className="p-4 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Items</p>
            <div className="flex items-start gap-3">
              {order.products?.image_url ? (
                <img src={order.products.image_url} alt="" className="w-16 h-16 rounded-xl object-cover" />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center">
                  <Package className="h-7 w-7 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{order.products?.name || "Product"}</p>
                <p className="text-xs text-muted-foreground">{order.products?.category}</p>
                <p className="text-xs text-muted-foreground mt-1">Qty: {order.quantity}</p>
              </div>
              <p className="font-bold text-sm whitespace-nowrap">
                {Number(order.products?.price || order.price).toLocaleString()} MMK
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Timeline */}
        <Card className="rounded-2xl">
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Status Timeline</p>
            <div className="space-y-3">
              {TIMELINE_STEPS.map((step, idx) => {
                const st = stepState(step.key);
                const dotCls =
                  st === "done"
                    ? "bg-emerald-500 border-emerald-500"
                    : st === "active"
                    ? "bg-amber-400 border-amber-400 animate-pulse"
                    : st === "cancelled"
                    ? "bg-rose-500 border-rose-500"
                    : "bg-muted border-muted-foreground/30";
                return (
                  <div key={step.key} className="flex items-start gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`w-3.5 h-3.5 rounded-full border-2 ${dotCls}`} />
                      {idx < TIMELINE_STEPS.length - 1 && <div className="w-px h-6 bg-border mt-1" />}
                    </div>
                    <div className="flex-1 pb-2">
                      <p className={`text-sm font-medium ${st === "pending" ? "text-muted-foreground" : ""}`}>
                        {step.label}
                      </p>
                      {st === "done" && idx === 0 && (
                        <p className="text-[11px] text-muted-foreground">{format(new Date(order.created_at), "MMM d, HH:mm")}</p>
                      )}
                      {st === "active" && (
                        <p className="text-[11px] text-amber-600">In progress…</p>
                      )}
                      {st === "cancelled" && idx > 0 && (
                        <p className="text-[11px] text-rose-600">Order cancelled</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Totals */}
        <Card className="rounded-2xl">
          <CardContent className="p-4 space-y-2 text-sm">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Payment Summary</p>
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal ({order.quantity} × items)</span>
              <span>{subtotal.toLocaleString()} MMK</span>
            </div>
            <div className="flex justify-between font-bold text-base border-t pt-2">
              <span>Total Paid</span>
              <span className="text-primary">{total.toLocaleString()} MMK</span>
            </div>
            <div className="pt-2 space-y-1 text-xs">
              <div className="flex items-center gap-2 text-muted-foreground">
                <CreditCard className="h-3.5 w-3.5" />
                <span className="capitalize">{order.payment_method?.replace(/_/g, " ") || "—"}</span>
              </div>
              {order.transaction_id && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Hash className="h-3.5 w-3.5" />
                  <span>TXN: {order.transaction_id}</span>
                </div>
              )}
              {order.phone_number && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-3.5 w-3.5" />
                  <span>{order.phone_number}</span>
                </div>
              )}
              {order.delivery_address && (
                <div className="flex items-start gap-2 text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5 mt-0.5" />
                  <span>{order.delivery_address}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Admin messages preview */}
        {messages.length > 0 && (
          <Card className="rounded-2xl">
            <CardContent className="p-4 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                Conversation
              </p>
              {messages.slice(-3).map((m) => (
                <div
                  key={m.id}
                  className={`rounded-xl p-2.5 text-xs ${
                    m.sender_role === "admin"
                      ? "bg-primary/10 border border-primary/20"
                      : "bg-muted"
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <Circle className={`h-2 w-2 fill-current ${m.sender_role === "admin" ? "text-primary" : "text-muted-foreground"}`} />
                    <span className="font-semibold text-[10px] uppercase">
                      {m.sender_role === "admin" ? "Admin" : "You"}
                    </span>
                    <span className="text-[10px] text-muted-foreground ml-auto">
                      {format(new Date(m.created_at), "MMM d, HH:mm")}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap line-clamp-3">{m.body}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* CTA */}
        <Button
          className="w-full h-12 rounded-xl gap-2"
          onClick={() => navigate("/support", { state: { prefill: `Order #${order.id.slice(0, 8).toUpperCase()} — ` } })}
        >
          <MessageCircle className="h-4 w-4" /> Chat with Admin
        </Button>
      </div>
    </MobileLayout>
  );
};

export default OrderDetail;
