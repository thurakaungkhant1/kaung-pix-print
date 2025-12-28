import { useState, useEffect } from "react";
import { ArrowLeft, Search, Wallet, TrendingUp, TrendingDown, Users, DollarSign, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import MobileLayout from "@/components/MobileLayout";
import { toast } from "sonner";
import { format } from "date-fns";

interface UserBalance {
  id: string;
  name: string;
  phone_number: string;
  wallet_balance: number;
  email: string | null;
}

interface WalletTransaction {
  id: string;
  user_id: string;
  amount: number;
  transaction_type: string;
  description: string | null;
  balance_after: number;
  created_at: string;
  profiles?: {
    name: string;
    phone_number: string;
  };
}

const WalletManage = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserBalance[]>([]);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserBalance | null>(null);
  const [userTransactions, setUserTransactions] = useState<WalletTransaction[]>([]);
  const [stats, setStats] = useState({
    totalBalance: 0,
    totalUsers: 0,
    totalDeposits: 0,
    totalSpent: 0,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load all users with balances
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select('id, name, phone_number, wallet_balance, email')
        .order('wallet_balance', { ascending: false });

      if (usersError) throw usersError;
      setUsers(usersData || []);

      // Calculate stats
      const totalBalance = (usersData || []).reduce((sum, u) => sum + (u.wallet_balance || 0), 0);
      const usersWithBalance = (usersData || []).filter(u => (u.wallet_balance || 0) > 0).length;

      // Load recent transactions
      const { data: txData, error: txError } = await supabase
        .from('wallet_transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (txError) throw txError;

      // Fetch profiles for transactions
      const txWithProfiles = await Promise.all(
        (txData || []).map(async (tx) => {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('name, phone_number')
            .eq('id', tx.user_id)
            .single();
          
          return {
            ...tx,
            profiles: profileData || { name: 'Unknown', phone_number: '' }
          };
        })
      );

      setTransactions(txWithProfiles);

      // Calculate deposit and spent totals
      const totalDeposits = txWithProfiles
        .filter(tx => tx.transaction_type === 'deposit')
        .reduce((sum, tx) => sum + tx.amount, 0);
      
      const totalSpent = txWithProfiles
        .filter(tx => tx.transaction_type === 'purchase')
        .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

      setStats({
        totalBalance,
        totalUsers: usersWithBalance,
        totalDeposits,
        totalSpent,
      });

    } catch (error) {
      console.error('Error loading data:', error);
      toast.error("Failed to load wallet data");
    } finally {
      setLoading(false);
    }
  };

  const loadUserTransactions = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUserTransactions(data || []);
    } catch (error) {
      console.error('Error loading user transactions:', error);
    }
  };

  const handleViewUser = (user: UserBalance) => {
    setSelectedUser(user);
    loadUserTransactions(user.id);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('my-MM').format(amount) + ' Ks';
  };

  const filteredUsers = users.filter(user => {
    const name = user.name?.toLowerCase() || '';
    const phone = user.phone_number?.toLowerCase() || '';
    const email = user.email?.toLowerCase() || '';
    return name.includes(searchTerm.toLowerCase()) || 
           phone.includes(searchTerm.toLowerCase()) ||
           email.includes(searchTerm.toLowerCase());
  });

  const getTransactionIcon = (type: string) => {
    return type === 'deposit' ? TrendingUp : TrendingDown;
  };

  const getTransactionColor = (type: string) => {
    return type === 'deposit' ? 'text-green-500' : 'text-red-500';
  };

  return (
    <MobileLayout hideNav>
      <div className="min-h-screen bg-background pb-20">
        {/* Header */}
        <div className="bg-gradient-to-br from-primary/20 via-background to-accent/10 py-6 px-4">
          <div className="flex items-center gap-3 mb-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/admin')}
              className="text-foreground"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">Wallet Management</h1>
              <p className="text-sm text-muted-foreground">View user balances & transactions</p>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 gap-3 mt-4">
            <Card className="bg-card/80 backdrop-blur">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <DollarSign className="h-4 w-4" />
                  <span className="text-xs">Total Balance</span>
                </div>
                <p className="text-lg font-bold text-primary">{formatCurrency(stats.totalBalance)}</p>
              </CardContent>
            </Card>
            <Card className="bg-card/80 backdrop-blur">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Users className="h-4 w-4" />
                  <span className="text-xs">Active Wallets</span>
                </div>
                <p className="text-lg font-bold">{stats.totalUsers}</p>
              </CardContent>
            </Card>
            <Card className="bg-card/80 backdrop-blur">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  <span className="text-xs">Total Deposits</span>
                </div>
                <p className="text-lg font-bold text-green-500">{formatCurrency(stats.totalDeposits)}</p>
              </CardContent>
            </Card>
            <Card className="bg-card/80 backdrop-blur">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <TrendingDown className="h-4 w-4 text-red-500" />
                  <span className="text-xs">Total Spent</span>
                </div>
                <p className="text-lg font-bold text-red-500">{formatCurrency(stats.totalSpent)}</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="users" className="p-4">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="users">User Balances</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, phone or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Users List */}
            <div className="space-y-3">
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No users found</div>
              ) : (
                filteredUsers.map((user) => (
                  <Card 
                    key={user.id} 
                    className="cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => handleViewUser(user)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <Wallet className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-semibold">{user.name}</p>
                            <p className="text-sm text-muted-foreground">{user.phone_number}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-primary">{formatCurrency(user.wallet_balance || 0)}</p>
                          <p className="text-xs text-muted-foreground">Balance</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="transactions" className="space-y-3">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No transactions yet</div>
            ) : (
              transactions.map((tx) => {
                const Icon = getTransactionIcon(tx.transaction_type);
                const color = getTransactionColor(tx.transaction_type);
                return (
                  <Card key={tx.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg bg-muted`}>
                            <Icon className={`h-4 w-4 ${color}`} />
                          </div>
                          <div>
                            <p className="font-medium">{tx.profiles?.name || 'Unknown'}</p>
                            <p className="text-sm text-muted-foreground">
                              {tx.description || tx.transaction_type}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {format(new Date(tx.created_at), 'MMM d, yyyy h:mm a')}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-bold ${color}`}>
                            {tx.amount > 0 ? '+' : ''}{formatCurrency(tx.amount)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Bal: {formatCurrency(tx.balance_after)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>
        </Tabs>

        {/* User Detail Dialog */}
        <Dialog open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
          <DialogContent className="sm:max-w-md bg-card border-border max-h-[80vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-primary" />
                {selectedUser?.name}
              </DialogTitle>
            </DialogHeader>

            {selectedUser && (
              <div className="space-y-4 overflow-y-auto flex-1">
                <Card className="bg-primary/10 border-primary/20">
                  <CardContent className="p-4 text-center">
                    <p className="text-sm text-muted-foreground mb-1">Current Balance</p>
                    <p className="text-3xl font-bold text-primary">
                      {formatCurrency(selectedUser.wallet_balance || 0)}
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">{selectedUser.phone_number}</p>
                  </CardContent>
                </Card>

                <div className="space-y-2">
                  <h3 className="font-semibold flex items-center gap-2">
                    <History className="h-4 w-4" />
                    Transaction History
                  </h3>
                  
                  {userTransactions.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No transactions yet</p>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {userTransactions.map((tx) => {
                        const Icon = getTransactionIcon(tx.transaction_type);
                        const color = getTransactionColor(tx.transaction_type);
                        return (
                          <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                            <div className="flex items-center gap-2">
                              <Icon className={`h-4 w-4 ${color}`} />
                              <div>
                                <p className="text-sm font-medium">{tx.description || tx.transaction_type}</p>
                                <p className="text-xs text-muted-foreground">
                                  {format(new Date(tx.created_at), 'MMM d, h:mm a')}
                                </p>
                              </div>
                            </div>
                            <p className={`font-semibold ${color}`}>
                              {tx.amount > 0 ? '+' : ''}{formatCurrency(tx.amount)}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </MobileLayout>
  );
};

export default WalletManage;
