import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Crown, Zap, Coins, BadgeCheck, Edit3, Sparkles, Check } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import MobileLayout from "@/components/MobileLayout";

interface PremiumPlan {
  id: string;
  name: string;
  description: string | null;
  duration_months: number;
  price_points: number;
  price_mmk: number | null;
  plan_type: string;
  badge_text: string | null;
}

const PREMIUM_BENEFITS = [
  { icon: BadgeCheck, text: "Verified Blue Mark" },
  { icon: Edit3, text: "Custom Name Change" },
  { icon: Coins, text: "Earn 0.01 pts/min while chatting" },
];

const PremiumShop = () => {
  const [plans, setPlans] = useState<PremiumPlan[]>([]);
  const [userPoints, setUserPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    
    // Load plans
    const { data: plansData } = await supabase
      .from("premium_plans")
      .select("*")
      .eq("is_active", true)
      .order("duration_months", { ascending: true });

    if (plansData) {
      setPlans(plansData);
    }

    // Load user points
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("points")
        .eq("id", user.id)
        .single();

      if (profile) {
        setUserPoints(profile.points);
      }
    }

    setLoading(false);
  };

  const handlePurchase = async (plan: PremiumPlan) => {
    if (!user) {
      toast({ title: "Login Required", description: "Please login to purchase", variant: "destructive" });
      navigate("/auth/login");
      return;
    }

    if (userPoints < plan.price_points) {
      toast({ title: "Insufficient Points", description: `You need ${plan.price_points} points`, variant: "destructive" });
      return;
    }

    setPurchasing(plan.id);

    try {
      // Deduct points
      const { error: pointsError } = await supabase
        .from("profiles")
        .update({ points: userPoints - plan.price_points })
        .eq("id", user.id);

      if (pointsError) throw pointsError;

      // Log transaction
      await supabase.from("point_transactions").insert({
        user_id: user.id,
        amount: -plan.price_points,
        transaction_type: "premium_purchase",
        description: `Purchased ${plan.name}`,
      });

      if (plan.plan_type === "subscription") {
        // Create or extend premium membership
        const { data: existing } = await supabase
          .from("premium_memberships")
          .select("id, expires_at")
          .eq("user_id", user.id)
          .maybeSingle();

        const expiresAt = new Date();
        if (existing) {
          const currentExpiry = new Date(existing.expires_at);
          const baseDate = currentExpiry > new Date() ? currentExpiry : new Date();
          expiresAt.setTime(baseDate.getTime());
        }
        expiresAt.setMonth(expiresAt.getMonth() + plan.duration_months);

        if (existing) {
          await supabase
            .from("premium_memberships")
            .update({ expires_at: expiresAt.toISOString(), is_active: true })
            .eq("user_id", user.id);
        } else {
          await supabase
            .from("premium_memberships")
            .insert({
              user_id: user.id,
              is_active: true,
              started_at: new Date().toISOString(),
              expires_at: expiresAt.toISOString(),
            });
        }

        toast({
          title: "🎉 Welcome to Premium!",
          description: `You now have ${plan.duration_months} month(s) of premium access`,
        });
      } else {
        // Micro-transaction - award small points bonus
        await supabase.from("point_transactions").insert({
          user_id: user.id,
          amount: 0.01,
          transaction_type: "microtransaction_bonus",
          description: `Bonus from ${plan.name}`,
        });

        toast({
          title: "Purchase Complete!",
          description: `You earned 0.01 premium points from ${plan.name}`,
        });
      }

      loadData();
    } catch (error) {
      console.error("Purchase error:", error);
      toast({ title: "Error", description: "Purchase failed. Please try again.", variant: "destructive" });
    } finally {
      setPurchasing(null);
    }
  };

  const subscriptionPlans = plans.filter((p) => p.plan_type === "subscription");
  const microPlans = plans.filter((p) => p.plan_type === "microtransaction");

  return (
    <MobileLayout>
      <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30 pb-8">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-gradient-to-r from-amber-500/10 via-yellow-500/5 to-amber-500/10 backdrop-blur border-b border-amber-500/20">
          <div className="flex items-center gap-4 p-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-xl font-bold flex items-center gap-2">
                <Crown className="h-5 w-5 text-amber-500" />
                Premium Shop
              </h1>
              <p className="text-sm text-muted-foreground">Unlock exclusive features</p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-full">
              <Coins className="h-4 w-4 text-primary" />
              <span className="font-bold">{userPoints.toLocaleString()}</span>
            </div>
          </div>
        </header>

        <div className="p-4 space-y-6">
          {/* Benefits Banner */}
          <Card className="border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-yellow-500/5">
            <CardContent className="p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-500" />
                Premium Benefits
              </h3>
              <div className="space-y-2">
                {PREMIUM_BENEFITS.map((benefit, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <div className="p-1.5 rounded-full bg-amber-500/10">
                      <benefit.icon className="h-4 w-4 text-amber-500" />
                    </div>
                    <span className="text-sm">{benefit.text}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Plans Tabs */}
          <Tabs defaultValue="subscription" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="subscription" className="flex items-center gap-2">
                <Crown className="h-4 w-4" />
                Subscriptions
              </TabsTrigger>
              <TabsTrigger value="micro" className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Quick Buy
              </TabsTrigger>
            </TabsList>

            <TabsContent value="subscription" className="mt-4 space-y-3">
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : subscriptionPlans.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No plans available</div>
              ) : (
                subscriptionPlans.map((plan) => (
                  <Card
                    key={plan.id}
                    className={cn(
                      "relative overflow-hidden transition-all hover:shadow-lg",
                      plan.badge_text === "Popular" && "border-primary shadow-md",
                      plan.badge_text === "Best Value" && "border-green-500 shadow-md"
                    )}
                  >
                    {plan.badge_text && (
                      <div className={cn(
                        "absolute top-0 right-0 px-3 py-1 text-xs font-bold text-white rounded-bl-lg",
                        plan.badge_text === "Popular" && "bg-primary",
                        plan.badge_text === "Best Value" && "bg-green-500",
                        plan.badge_text === "Most Savings" && "bg-amber-500"
                      )}>
                        {plan.badge_text}
                      </div>
                    )}
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h3 className="font-bold text-lg">{plan.name}</h3>
                          <p className="text-sm text-muted-foreground">{plan.description}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-primary">
                            {plan.price_points.toLocaleString()}
                          </div>
                          <div className="text-xs text-muted-foreground">points</div>
                        </div>
                      </div>
                      {plan.price_mmk && (
                        <p className="text-sm text-muted-foreground mb-3">
                          or {plan.price_mmk.toLocaleString()} MMK
                        </p>
                      )}
                      <Button
                        className="w-full"
                        disabled={purchasing === plan.id || userPoints < plan.price_points}
                        onClick={() => handlePurchase(plan)}
                      >
                        {purchasing === plan.id ? (
                          "Processing..."
                        ) : userPoints < plan.price_points ? (
                          "Insufficient Points"
                        ) : (
                          <>
                            <Check className="h-4 w-4 mr-2" />
                            Buy Now
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="micro" className="mt-4 space-y-3">
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : microPlans.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No items available</div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {microPlans.map((plan) => (
                    <Card key={plan.id} className="overflow-hidden hover:shadow-lg transition-all">
                      <CardContent className="p-4 text-center">
                        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-blue-500/10 flex items-center justify-center">
                          <Zap className="h-6 w-6 text-blue-500" />
                        </div>
                        <h3 className="font-semibold text-sm mb-1">{plan.name}</h3>
                        <p className="text-xs text-muted-foreground mb-2">{plan.description}</p>
                        <div className="text-lg font-bold text-primary mb-3">
                          {plan.price_points} pts
                        </div>
                        <Button
                          size="sm"
                          className="w-full"
                          disabled={purchasing === plan.id || userPoints < plan.price_points}
                          onClick={() => handlePurchase(plan)}
                        >
                          {purchasing === plan.id ? "..." : "Buy"}
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </MobileLayout>
  );
};

export default PremiumShop;
