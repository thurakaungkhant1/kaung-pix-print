import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Crown, Calendar, Coins, History, ShoppingBag } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import MobileLayout from "@/components/MobileLayout";

interface PremiumTransaction {
  id: string;
  amount: number;
  transaction_type: string;
  description: string | null;
  created_at: string;
}

interface PremiumMembership {
  id: string;
  is_active: boolean;
  started_at: string;
  expires_at: string;
  total_chat_points_earned: number;
}

interface PurchaseRecord {
  id: string;
  transaction_type: string;
  description: string | null;
  created_at: string;
  amount: number;
}

const PremiumHistory = () => {
  const [membership, setMembership] = useState<PremiumMembership | null>(null);
  const [transactions, setTransactions] = useState<PremiumTransaction[]>([]);
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    
    setLoading(false);
    
    // Load membership
    const { data: membershipData } = await supabase
      .from("premium_memberships")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    
    if (membershipData) {
      setMembership(membershipData);
    }
    
    // Load premium-related transactions (chat rewards)
    const { data: txData } = await supabase
      .from("point_transactions")
      .select("*")
      .eq("user_id", user.id)
      .eq("transaction_type", "chat_reward")
      .order("created_at", { ascending: false })
      .limit(50);
    
    if (txData) {
      setTransactions(txData);
    }

    // Load premium purchase history
    const { data: purchaseData } = await supabase
      .from("point_transactions")
      .select("*")
      .eq("user_id", user.id)
      .or("transaction_type.eq.premium_purchase,transaction_type.eq.premium_grant")
      .order("created_at", { ascending: false })
      .limit(50);
    
    if (purchaseData) {
      setPurchases(purchaseData);
    }
    
    setLoading(false);
  };

  const isActive = membership?.is_active && new Date(membership.expires_at) > new Date();
  const daysRemaining = membership 
    ? Math.max(0, Math.ceil((new Date(membership.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  return (
    <MobileLayout>
      <div className="min-h-screen bg-background pb-8">
        <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
          <div className="flex items-center gap-4 p-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-xl font-semibold">Premium History</h1>
              <p className="text-sm text-muted-foreground">
                View your subscription & earnings
              </p>
            </div>
          </div>
        </header>

        <div className="p-4 space-y-4">
          {/* Current Status Card */}
          <Card className={cn(
            "overflow-hidden border-0",
            isActive 
              ? "bg-gradient-to-br from-amber-500/10 via-yellow-500/5 to-transparent"
              : "bg-muted/50"
          )}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className={cn(
                  "p-2 rounded-xl",
                  isActive ? "bg-amber-500/20" : "bg-muted"
                )}>
                  <Crown className={cn("h-5 w-5", isActive ? "text-amber-500" : "text-muted-foreground")} />
                </div>
                Premium Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Status</span>
                <Badge variant={isActive ? "default" : "secondary"} className={cn(
                  isActive 
                    ? "bg-green-500/10 text-green-500 border-green-500/20"
                    : "bg-gray-500/10 text-gray-500"
                )}>
                  {isActive ? "Active" : membership ? "Expired" : "Not Subscribed"}
                </Badge>
              </div>
              
              {membership && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Started</span>
                    <span className="font-medium">
                      {format(new Date(membership.started_at), "MMM d, yyyy")}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Expires</span>
                    <span className={cn("font-medium", !isActive && "text-red-500")}>
                      {format(new Date(membership.expires_at), "MMM d, yyyy")}
                    </span>
                  </div>
                  
                  {isActive && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Days Remaining</span>
                      <span className="font-bold text-amber-500">{daysRemaining}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Total Chat Points Earned</span>
                    <span className="font-bold text-primary">
                      {Number(membership.total_chat_points_earned).toFixed(2)}
                    </span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Tabs for Earnings and Purchases */}
          <Tabs defaultValue="purchases" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="purchases" className="flex items-center gap-2">
                <ShoppingBag className="h-4 w-4" />
                Purchases
              </TabsTrigger>
              <TabsTrigger value="earnings" className="flex items-center gap-2">
                <Coins className="h-4 w-4" />
                Earnings
              </TabsTrigger>
            </TabsList>

            <TabsContent value="purchases" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <ShoppingBag className="h-5 w-5" />
                    Purchase History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="text-center py-8 text-muted-foreground">Loading...</div>
                  ) : purchases.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No premium purchases yet
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {purchases.map((purchase) => (
                        <div
                          key={purchase.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                        >
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "p-2 rounded-lg",
                              purchase.transaction_type === "premium_grant"
                                ? "bg-purple-500/10"
                                : "bg-amber-500/10"
                            )}>
                              <Crown className={cn(
                                "h-4 w-4",
                                purchase.transaction_type === "premium_grant"
                                  ? "text-purple-500"
                                  : "text-amber-500"
                              )} />
                            </div>
                            <div>
                              <p className="font-medium text-sm">
                                {purchase.transaction_type === "premium_grant" 
                                  ? "Admin Grant" 
                                  : "Premium Purchase"}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(purchase.created_at), "MMM d, yyyy 'at' h:mm a")}
                              </p>
                              {purchase.description && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {purchase.description}
                                </p>
                              )}
                            </div>
                          </div>
                          {purchase.amount !== 0 && (
                            <span className={cn(
                              "font-bold",
                              purchase.amount > 0 ? "text-green-500" : "text-red-500"
                            )}>
                              {purchase.amount > 0 ? "+" : ""}{purchase.amount} pts
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="earnings" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <History className="h-5 w-5" />
                    Earnings History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="text-center py-8 text-muted-foreground">Loading...</div>
                  ) : transactions.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No chat rewards earned yet
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {transactions.map((tx) => (
                        <div
                          key={tx.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-green-500/10">
                              <Coins className="h-4 w-4 text-green-500" />
                            </div>
                            <div>
                              <p className="font-medium text-sm">Chat Reward</p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(tx.created_at), "MMM d, h:mm a")}
                              </p>
                            </div>
                          </div>
                          <span className="font-bold text-green-500">
                            +{tx.amount.toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </MobileLayout>
  );
};

export default PremiumHistory;
