import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowUpCircle, ArrowDownCircle, Wallet, Filter } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface Transaction {
  id: string;
  type: "deposit" | "purchase";
  amount: number;
  status: string;
  description: string;
  created_at: string;
  reference_id?: string | null;
}

const TransactionHistory = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "deposit" | "purchase">("all");

  useEffect(() => {
    if (user) {
      loadTransactions();
    }
  }, [user]);

  const loadTransactions = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Load deposits
      const { data: deposits } = await supabase
        .from("wallet_deposits")
        .select("id, amount, status, created_at, transaction_id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      // Load wallet transactions (purchases)
      const { data: walletTransactions } = await supabase
        .from("wallet_transactions")
        .select("id, amount, transaction_type, description, created_at, reference_id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      const allTransactions: Transaction[] = [];

      // Map deposits
      if (deposits) {
        deposits.forEach((d) => {
          allTransactions.push({
            id: d.id,
            type: "deposit",
            amount: d.amount,
            status: d.status,
            description: `Deposit (TxID: ${d.transaction_id || "N/A"})`,
            created_at: d.created_at!,
            reference_id: d.transaction_id,
          });
        });
      }

      // Map wallet transactions
      if (walletTransactions) {
        walletTransactions.forEach((wt) => {
          if (wt.transaction_type === "purchase" || wt.amount < 0) {
            allTransactions.push({
              id: wt.id,
              type: "purchase",
              amount: Math.abs(wt.amount),
              status: "completed",
              description: wt.description || "Purchase",
              created_at: wt.created_at!,
              reference_id: wt.reference_id,
            });
          } else if (wt.transaction_type === "deposit") {
            // Skip, already covered by wallet_deposits
          }
        });
      }

      // Sort by date
      allTransactions.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setTransactions(allTransactions);
    } catch (error) {
      console.error("Error loading transactions:", error);
    }

    setLoading(false);
  };

  const filteredTransactions = transactions.filter((t) => {
    if (filter === "all") return true;
    return t.type === filter;
  });

  const getStatusBadge = (status: string, type: string) => {
    if (type === "purchase") {
      return <Badge className="bg-primary/20 text-primary">Completed</Badge>;
    }
    switch (status) {
      case "approved":
        return <Badge className="bg-green-500/20 text-green-600">{t("approved")}</Badge>;
      case "pending":
        return <Badge className="bg-amber-500/20 text-amber-600">{t("pending")}</Badge>;
      case "rejected":
        return <Badge className="bg-red-500/20 text-red-600">{t("rejected")}</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="bg-gradient-primary text-primary-foreground p-4 sticky top-0 z-40 shadow-lg">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-full hover:bg-primary-foreground/10 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-display font-bold">Transaction History</h1>
        </div>
      </header>

      <div className="p-4 space-y-4">
        {/* Filter Tabs */}
        <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
          <TabsList className="grid w-full grid-cols-3 bg-muted/50">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="deposit">{t("deposit")}</TabsTrigger>
            <TabsTrigger value="purchase">Purchases</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Transaction List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredTransactions.length === 0 ? (
          <Card className="p-8 text-center">
            <Wallet className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">No transactions found</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredTransactions.map((transaction) => (
              <Card key={transaction.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div
                        className={`p-2 rounded-full ${
                          transaction.type === "deposit"
                            ? "bg-green-500/10"
                            : "bg-red-500/10"
                        }`}
                      >
                        {transaction.type === "deposit" ? (
                          <ArrowDownCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <ArrowUpCircle className="h-5 w-5 text-red-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {transaction.type === "deposit" ? t("deposit") : "Purchase"}
                        </p>
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {transaction.description}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(transaction.created_at), "MMM dd, yyyy • HH:mm")}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p
                        className={`font-bold ${
                          transaction.type === "deposit"
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {transaction.type === "deposit" ? "+" : "-"}
                        {transaction.amount.toLocaleString()} Ks
                      </p>
                      <div className="mt-1">{getStatusBadge(transaction.status, transaction.type)}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TransactionHistory;