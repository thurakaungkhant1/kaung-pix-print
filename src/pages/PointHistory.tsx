import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, History, ShoppingBag, TrendingUp } from "lucide-react";
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

    if (data) {
      setTransactions(data);
    }
  };

  const loadWithdrawals = async () => {
    if (!user) return;

    const { data } = await supabase
      .from("point_withdrawals")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (data) {
      setWithdrawals(data);
    }
  };

  const loadOrders = async () => {
    if (!user) return;

    const { data } = await supabase
      .from("orders")
      .select(`
        *,
        products:product_id(name, image_url)
      `)
      .eq("user_id", user.id)
      .is("game_id", null)
      .order("created_at", { ascending: false });

    if (data) {
      setOrders(data as any);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="bg-gradient-primary text-primary-foreground p-4 sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)}>
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h1 className="text-xl font-bold">History</h1>
        </div>
      </header>

      <div className="max-w-screen-xl mx-auto p-4 space-y-4">
        {/* Point History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Point History
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {transactions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No transactions yet</p>
            ) : (
              transactions.map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{transaction.description || transaction.transaction_type}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(transaction.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <p className={`text-sm font-bold ${transaction.amount > 0 ? "text-green-600" : "text-red-600"}`}>
                    {transaction.amount > 0 ? "+" : ""}{transaction.amount}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Withdrawal Status */}
        {withdrawals.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Withdrawal Requests
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {withdrawals.map((withdrawal) => (
                <div key={withdrawal.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{withdrawal.points_withdrawn.toLocaleString()} points</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(withdrawal.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant={
                    withdrawal.status === "completed" ? "default" :
                    withdrawal.status === "rejected" ? "destructive" :
                    "secondary"
                  }>
                    {withdrawal.status}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Purchase History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5" />
              Purchase History
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {orders.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No orders yet</p>
            ) : (
              orders.map((order) => (
                <div key={order.id} className="flex gap-3 p-3 border rounded-lg">
                  <img
                    src={order.products.image_url}
                    alt={order.products.name}
                    className="w-16 h-16 object-cover rounded"
                  />
                  <div className="flex-1 space-y-1">
                    <h4 className="font-semibold text-sm">{order.products.name}</h4>
                    <p className="text-xs text-muted-foreground">Qty: {order.quantity}</p>
                    <p className="text-sm font-bold text-primary">${order.price.toFixed(2)}</p>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">
                        {new Date(order.created_at).toLocaleDateString()}
                      </p>
                      <Badge variant={
                        order.status === "finished" ? "default" :
                        order.status === "approved" ? "secondary" :
                        order.status === "cancelled" ? "destructive" :
                        "outline"
                      }>
                        {order.status}
                      </Badge>
                    </div>
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
