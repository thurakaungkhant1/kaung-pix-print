import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, History, ShoppingBag, Wallet, Sparkles, Package } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import BottomNav from "@/components/BottomNav";

interface Transaction {
  id: string;
  amount: number;
  transaction_type: string;
  description: string | null;
  created_at: string;
}

interface Withdrawal {
  id: string;
  points_withdrawn: number;
  status: string;
  created_at: string;
  withdrawal_items: { name: string; value_amount: number } | null;
}

interface Order {
  id: string;
  quantity: number;
  price: number;
  status: string;
  created_at: string;
  products: { name: string; image_url: string };
}

const PointHistory = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      loadTransactions();
      loadWithdrawals();
      loadOrders();
    }
  }, [user]);

  const loadTransactions = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("point_transactions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (data) setTransactions(data);
  };

  const loadWithdrawals = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("point_withdrawals")
      .select(`*, withdrawal_items:withdrawal_item_id(name, value_amount)`)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (data) setWithdrawals(data as any);
  };

  const loadOrders = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("orders")
      .select(`*, products:product_id(name, image_url)`)
      .eq("user_id", user.id)
      .is("game_id", null)
      .order("created_at", { ascending: false });
    if (data) setOrders(data as any);
  };

  const getStatusVariant = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      finished: "default",
      approved: "secondary",
      cancelled: "destructive",
      rejected: "destructive",
      pending: "outline",
    };
    return variants[status] || "outline";
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30 pb-20">
      <header className="bg-gradient-primary text-primary-foreground p-4 sticky top-0 z-40 shadow-lg">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-primary-foreground/10 transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-display font-bold">History</h1>
        </div>
      </header>

      <div className="max-w-screen-xl mx-auto p-4 space-y-4">
        {/* Point History */}
        <Card className="animate-fade-in shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display">
              <Sparkles className="h-5 w-5 text-primary" />
              Point History
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {transactions.length === 0 ? (
              <div className="text-center py-8">
                <History className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No transactions yet</p>
              </div>
            ) : (
              transactions.map((t, i) => (
                <div key={t.id} className="flex items-center justify-between py-3 border-b last:border-0 animate-fade-in" style={{ animationDelay: `${i * 30}ms` }}>
                  <div>
                    <p className="font-medium">{t.description || t.transaction_type}</p>
                    <p className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleDateString()}</p>
                  </div>
                  <p className={`font-bold ${t.amount > 0 ? "text-primary" : "text-destructive"}`}>
                    {t.amount > 0 ? "+" : ""}{t.amount}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Withdrawal History */}
        <Card className="animate-fade-in shadow-lg" style={{ animationDelay: '100ms' }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display">
              <Wallet className="h-5 w-5 text-primary" />
              Withdrawal History
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {withdrawals.length === 0 ? (
              <div className="text-center py-8">
                <Wallet className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No withdrawals yet</p>
              </div>
            ) : (
              withdrawals.map((w) => (
                <div key={w.id} className="p-3 border rounded-xl hover:bg-muted/50 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-display font-semibold">{w.withdrawal_items?.name || "Point Withdrawal"}</h4>
                    <Badge variant={getStatusVariant(w.status)}>{w.status}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {w.points_withdrawn.toLocaleString()} points
                    {w.withdrawal_items && ` → $${w.withdrawal_items.value_amount}`}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{new Date(w.created_at).toLocaleDateString()}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Purchase History */}
        <Card className="animate-fade-in shadow-lg" style={{ animationDelay: '200ms' }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display">
              <ShoppingBag className="h-5 w-5 text-primary" />
              Purchase History
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {orders.length === 0 ? (
              <div className="text-center py-8">
                <Package className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No orders yet</p>
              </div>
            ) : (
              orders.map((o) => (
                <div key={o.id} className="flex gap-3 p-3 border rounded-xl hover:bg-muted/50 transition-colors">
                  <img src={o.products.image_url} alt={o.products.name} className="w-16 h-16 object-cover rounded-lg" />
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="font-display font-semibold">{o.products.name}</h4>
                      <Badge variant={getStatusVariant(o.status)}>{o.status}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">Qty: {o.quantity}</p>
                    <p className="font-bold text-primary">{o.price.toLocaleString()} MMK</p>
                    <p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <BottomNav />
    </div>
  );
};

export default PointHistory;