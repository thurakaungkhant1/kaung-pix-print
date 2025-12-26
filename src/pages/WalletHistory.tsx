import { useState, useEffect } from "react";
import { ArrowLeft, Wallet, TrendingUp, TrendingDown, Clock, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import MobileLayout from "@/components/MobileLayout";
import { format } from "date-fns";

interface WalletTransaction {
  id: string;
  amount: number;
  transaction_type: string;
  description: string | null;
  balance_after: number;
  created_at: string;
}

interface WalletDeposit {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  approved_at: string | null;
  rejected_at: string | null;
  admin_notes: string | null;
}

const WalletHistory = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [deposits, setDeposits] = useState<WalletDeposit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    try {
      const [txResult, depositResult] = await Promise.all([
        supabase
          .from('wallet_transactions')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('wallet_deposits')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
      ]);

      if (txResult.data) setTransactions(txResult.data);
      if (depositResult.data) setDeposits(depositResult.data);
    } catch (error) {
      console.error('Error loading wallet history:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('my-MM').format(amount) + ' Ks';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-500/20 text-yellow-400 border-yellow-500/50"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500/50"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-500/20 text-red-400 border-red-500/50"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTransactionIcon = (type: string, amount: number) => {
    if (amount > 0) {
      return <TrendingUp className="h-5 w-5 text-green-500" />;
    }
    return <TrendingDown className="h-5 w-5 text-red-500" />;
  };

  return (
    <MobileLayout hideNav>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="hero-gaming py-6 px-4">
          <div className="flex items-center gap-3 mb-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="text-foreground"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Wallet className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold">Wallet History</h1>
            </div>
          </div>
        </div>

        <div className="p-4 -mt-4">
          <Tabs defaultValue="deposits" className="w-full">
            <TabsList className="w-full grid grid-cols-2 bg-card/50 border border-border/50">
              <TabsTrigger 
                value="deposits"
                className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary"
              >
                Deposits
              </TabsTrigger>
              <TabsTrigger 
                value="transactions"
                className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary"
              >
                Transactions
              </TabsTrigger>
            </TabsList>

            <TabsContent value="deposits" className="mt-4 space-y-3">
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : deposits.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No deposit requests yet
                </div>
              ) : (
                deposits.map((deposit) => (
                  <div key={deposit.id} className="card-neon p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-lg">
                          +{formatCurrency(deposit.amount)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(deposit.created_at), 'MMM d, yyyy h:mm a')}
                        </p>
                        {deposit.admin_notes && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Note: {deposit.admin_notes}
                          </p>
                        )}
                      </div>
                      {getStatusBadge(deposit.status)}
                    </div>
                  </div>
                ))
              )}
            </TabsContent>

            <TabsContent value="transactions" className="mt-4 space-y-3">
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : transactions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No transactions yet
                </div>
              ) : (
                transactions.map((tx) => (
                  <div key={tx.id} className="card-neon p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-card/50">
                        {getTransactionIcon(tx.transaction_type, tx.amount)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium capitalize">
                              {tx.transaction_type}
                            </p>
                            {tx.description && (
                              <p className="text-sm text-muted-foreground">
                                {tx.description}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(tx.created_at), 'MMM d, yyyy h:mm a')}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className={`font-semibold ${tx.amount > 0 ? 'text-green-500' : 'text-red-500'}`}>
                              {tx.amount > 0 ? '+' : ''}{formatCurrency(tx.amount)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Balance: {formatCurrency(tx.balance_after)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </MobileLayout>
  );
};

export default WalletHistory;
