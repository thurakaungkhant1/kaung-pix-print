import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import MobileLayout from "@/components/MobileLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  Search,
  Loader2,
  Package,
  Clock,
  CheckCircle2,
  XCircle,
  MessageCircle,
  Check,
  X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const DIGITAL_CATS = [
  "Digital Products",
  "Software & License Keys",
  "Streaming Accounts",
  "Gift Cards & Vouchers",
  "E-books & Courses",
];

interface OrderRow {
  id: string;
  user_id: string;
  quantity: number;
  price: number;
  status: string;
  created_at: string;
  payment_method: string;
  transaction_id: string | null;
  products: { name: string; image_url: string | null; category: string } | null;
  profiles: { name: string | null; phone_number: string | null; email: string | null } | null;
}

const statusStyle = (status: string) => {
  switch (status) {
    case "approved":
    case "finished":
    case "completed":
      return { cls: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30", Icon: CheckCircle2, label: "Completed" };
    case "rejected":
    case "cancelled":
      return { cls: "bg-rose-500/15 text-rose-600 border-rose-500/30", Icon: XCircle, label: "Cancelled" };
    case "awaiting_info":
      return { cls: "bg-amber-500/15 text-amber-600 border-amber-500/30", Icon: MessageCircle, label: "Pending Info" };
    default:
      return { cls: "bg-blue-500/15 text-blue-600 border-blue-500/30", Icon: Clock, label: "Pending" };
  }
};

const DigitalOrdersManage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "awaiting_info" | "approved" | "rejected">("all");
  const [updating, setUpdating] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("orders")
      .select(
        "id, user_id, quantity, price, status, created_at, payment_method, transaction_id, products!inner(name, image_url, category), profiles(name, phone_number, email)"
      )
      .in("products.category", DIGITAL_CATS)
      .order("created_at", { ascending: false });
    setOrders((data as any) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const channel = supabase
      .channel("admin-digital-orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      if (statusFilter !== "all") {
        if (statusFilter === "approved" && !["approved", "finished", "completed"].includes(o.status)) return false;
        if (statusFilter === "rejected" && !["rejected", "cancelled"].includes(o.status)) return false;
        if (statusFilter === "pending" && o.status !== "pending") return false;
        if (statusFilter === "awaiting_info" && o.status !== "awaiting_info") return false;
      }
      if (search) {
        const q = search.toLowerCase();
        if (
          !o.id.toLowerCase().includes(q) &&
          !(o.products?.name || "").toLowerCase().includes(q) &&
          !(o.profiles?.name || "").toLowerCase().includes(q) &&
          !(o.profiles?.phone_number || "").toLowerCase().includes(q) &&
          !(o.transaction_id || "").toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [orders, statusFilter, search]);

  const updateStatus = async (id: string, status: string) => {
    setUpdating(id);
    const { error } = await supabase.from("orders").update({ status }).eq("id", id);
    setUpdating(null);
    if (error) {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Updated", description: `Order marked as ${status}` });
    load();
  };

  return (
    <MobileLayout>
      <div className="max-w-4xl mx-auto p-4 space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin")} className="rounded-xl">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-emerald-500" />
            <h1 className="text-lg font-bold">Digital Product Orders</h1>
            <Badge variant="outline" className="ml-1">{orders.length}</Badge>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search order id, product, user, phone, transaction..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 rounded-xl"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto -mx-1 px-1">
          {[
            { k: "all", label: "All" },
            { k: "pending", label: "Pending" },
            { k: "awaiting_info", label: "Awaiting Info" },
            { k: "approved", label: "Completed" },
            { k: "rejected", label: "Cancelled" },
          ].map((t) => (
            <Button
              key={t.k}
              variant={statusFilter === (t.k as any) ? "default" : "outline"}
              size="sm"
              className="rounded-full whitespace-nowrap"
              onClick={() => setStatusFilter(t.k as any)}
            >
              {t.label}
            </Button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <Card className="rounded-2xl">
            <CardContent className="p-10 text-center text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p>No digital orders.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((o) => {
              const s = statusStyle(o.status);
              const SIcon = s.Icon;
              return (
                <Card key={o.id} className="rounded-2xl border-border/40">
                  <CardContent className="p-3 space-y-3">
                    <div className="flex items-start gap-3">
                      {o.products?.image_url ? (
                        <img src={o.products.image_url} alt="" className="w-14 h-14 rounded-xl object-cover" />
                      ) : (
                        <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center">
                          <Package className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{o.products?.name || "Product"}</p>
                        <p className="text-xs text-muted-foreground truncate">{o.products?.category}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <Badge variant="outline" className={`${s.cls} gap-1 text-[10px]`}>
                            <SIcon className="h-3 w-3" /> {s.label}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">
                            {format(new Date(o.created_at), "MMM d, HH:mm")}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-sm">{Number(o.price).toLocaleString()} MMK</p>
                        <p className="text-[10px] text-muted-foreground">Qty {o.quantity}</p>
                      </div>
                    </div>

                    <div className="rounded-xl bg-muted/40 p-2 text-xs space-y-0.5">
                      <p><span className="text-muted-foreground">User:</span> {o.profiles?.name || "—"}</p>
                      <p><span className="text-muted-foreground">Phone:</span> {o.profiles?.phone_number || "—"}</p>
                      {o.profiles?.email && (
                        <p className="truncate"><span className="text-muted-foreground">Email:</span> {o.profiles.email}</p>
                      )}
                      <p className="font-mono text-[10px] text-muted-foreground">#{o.id.slice(0, 8).toUpperCase()}</p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-lg h-8 text-xs gap-1"
                        onClick={() => navigate("/admin/support")}
                      >
                        <MessageCircle className="h-3 w-3" /> Open Chat
                      </Button>
                      {o.status !== "approved" && o.status !== "finished" && (
                        <Button
                          size="sm"
                          className="rounded-lg h-8 text-xs gap-1 bg-emerald-500 hover:bg-emerald-600 text-white"
                          disabled={updating === o.id}
                          onClick={() => updateStatus(o.id, "approved")}
                        >
                          {updating === o.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Check className="h-3 w-3" />
                          )}{" "}
                          Complete
                        </Button>
                      )}
                      {o.status !== "rejected" && o.status !== "cancelled" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-lg h-8 text-xs gap-1 text-rose-600 border-rose-500/30"
                          disabled={updating === o.id}
                          onClick={() => updateStatus(o.id, "rejected")}
                        >
                          <X className="h-3 w-3" /> Cancel
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </MobileLayout>
  );
};

export default DigitalOrdersManage;
