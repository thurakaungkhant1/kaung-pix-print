import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import MobileLayout from "@/components/MobileLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  ShoppingBag,
  Search,
  Loader2,
  Package,
  Clock,
  CheckCircle2,
  XCircle,
  MessageCircle,
} from "lucide-react";
import { format } from "date-fns";

interface OrderRow {
  id: string;
  quantity: number;
  price: number;
  status: string;
  created_at: string;
  payment_method: string;
  transaction_id: string | null;
  products: {
    name: string;
    image_url: string | null;
    category: string;
    description: string | null;
  } | null;
}

const DIGITAL_CATS = [
  "Digital Products",
  "Software & License Keys",
  "Streaming Accounts",
  "Gift Cards & Vouchers",
  "E-books & Courses",
];

const statusStyle = (status: string) => {
  switch (status) {
    case "approved":
    case "finished":
    case "completed":
      return { cls: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30", icon: CheckCircle2, label: "Completed" };
    case "rejected":
    case "cancelled":
      return { cls: "bg-rose-500/15 text-rose-600 border-rose-500/30", icon: XCircle, label: "Cancelled" };
    case "awaiting_info":
      return { cls: "bg-amber-500/15 text-amber-600 border-amber-500/30", icon: MessageCircle, label: "Pending Admin Info" };
    default:
      return { cls: "bg-blue-500/15 text-blue-600 border-blue-500/30", icon: Clock, label: "Pending" };
  }
};

const OrderHistory = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"all" | "digital" | "game" | "mobile">("all");

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("orders")
        .select("id, quantity, price, status, created_at, payment_method, transaction_id, products(name, image_url, category, description)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setOrders((data as any) || []);
      setLoading(false);
    })();

    const channel = supabase
      .channel(`orders-user-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders", filter: `user_id=eq.${user.id}` },
        async () => {
          const { data } = await supabase
            .from("orders")
            .select("id, quantity, price, status, created_at, payment_method, transaction_id, products(name, image_url, category, description)")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false });
          setOrders((data as any) || []);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      // Hide rejected/cancelled orders from user's list
      if (o.status === "rejected" || o.status === "cancelled") return false;
      const cat = o.products?.category || "";
      if (tab === "digital" && !DIGITAL_CATS.includes(cat)) return false;
      if (tab === "game" && !["MLBB Diamonds", "PUBG UC", "Free Fire", "Genshin"].includes(cat)) return false;
      if (tab === "mobile" && !["Phone Top-up", "Data Plans"].includes(cat)) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !o.id.toLowerCase().includes(q) &&
          !(o.products?.name || "").toLowerCase().includes(q) &&
          !(o.transaction_id || "").toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [orders, tab, search]);

  return (
    <MobileLayout>
      <div className="max-w-3xl mx-auto p-4 space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-xl">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-bold">My Orders</h1>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by order, product, transaction id..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 rounded-xl"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto -mx-1 px-1">
          {[
            { k: "all", label: "All" },
            { k: "digital", label: "Digital" },
            { k: "game", label: "Game" },
            { k: "mobile", label: "Mobile" },
          ].map((t) => (
            <Button
              key={t.k}
              variant={tab === (t.k as any) ? "default" : "outline"}
              size="sm"
              className="rounded-full"
              onClick={() => setTab(t.k as any)}
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
              <p>No orders yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((o) => {
              const s = statusStyle(o.status);
              const SIcon = s.icon;
              const isDigital = DIGITAL_CATS.includes(o.products?.category || "");
              return (
                <Card key={o.id} className="rounded-2xl border-border/40">
                  <CardContent className="p-3 space-y-3">
                    <div className="flex items-start gap-3">
                      {o.products?.image_url ? (
                        <img
                          src={o.products.image_url}
                          alt={o.products?.name || ""}
                          className="w-14 h-14 rounded-xl object-cover"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center">
                          <Package className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{o.products?.name || "Product"}</p>
                        <p className="text-xs text-muted-foreground truncate">{o.products?.category}</p>
                        {o.products?.description && (
                          <p className="text-[11px] text-muted-foreground/90 line-clamp-2 mt-0.5 whitespace-pre-line">
                            {o.products.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
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
                    <div className="flex items-center justify-between pt-2 border-t border-border/40 gap-2">
                      <span className="text-[10px] text-muted-foreground font-mono">
                        #{o.id.slice(0, 8).toUpperCase()}
                      </span>
                      <div className="flex gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-lg h-7 text-xs"
                          onClick={() => navigate(`/orders/${o.id}`)}
                        >
                          View Details
                        </Button>
                        {isDigital && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-lg h-7 text-xs gap-1"
                            onClick={() => navigate("/support")}
                          >
                            <MessageCircle className="h-3 w-3" /> Chat Admin
                          </Button>
                        )}
                      </div>
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

export default OrderHistory;
