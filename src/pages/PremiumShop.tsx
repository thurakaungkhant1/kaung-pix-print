import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArrowLeft, Crown, Zap, Coins, BadgeCheck, Edit3, Sparkles, Check, Phone, Loader2, Copy, QrCode, Wallet } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import MobileLayout from "@/components/MobileLayout";
import AdBanner from "@/components/AdBanner";

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

// Payment account info
const PAYMENT_ACCOUNTS = {
  kpay: { name: "KPay", number: "09123456789", qrImage: null },
  wavepay: { name: "WavePay", number: "09987654321", qrImage: null },
};

// Subscription tier benefits
const SUBSCRIPTION_TIERS = [
  { months: 1, price: 5000, pointsPerMin: 5, label: "1 Month" },
  { months: 3, price: 15000, pointsPerMin: 15, label: "3 Months" },
  { months: 6, price: 26500, pointsPerMin: 25, label: "6 Months" },
  { months: 12, price: 40000, pointsPerMin: 40, label: "1 Year" },
];

const PremiumShop = () => {
  const [plans, setPlans] = useState<PremiumPlan[]>([]);
  const [userPoints, setUserPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<PremiumPlan | null>(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [purchaseDialogOpen, setPurchaseDialogOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"kpay" | "wavepay">("kpay");
  const [step, setStep] = useState<"method" | "instructions" | "confirm">("method");
  const [pendingRequest, setPendingRequest] = useState<any>(null);
  const [copiedNumber, setCopiedNumber] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    
    const { data: plansData } = await supabase
      .from("premium_plans")
      .select("*")
      .eq("is_active", true)
      .order("duration_months", { ascending: true });

    if (plansData) {
      setPlans(plansData);
    }

    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("points, phone_number")
        .eq("id", user.id)
        .single();

      if (profile) {
        setUserPoints(profile.points);
        setPhoneNumber(profile.phone_number || "");
      }

      const { data: pendingReq } = await supabase
        .from("premium_purchase_requests")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "pending")
        .maybeSingle();

      if (pendingReq) {
        setPendingRequest(pendingReq);
      }
    }

    setLoading(false);
  };

  const getPointsPerMinute = (plan: PremiumPlan): number => {
    if (plan.plan_type === "microtransaction") return 0.01;
    const tier = SUBSCRIPTION_TIERS.find(t => t.months === plan.duration_months);
    return tier?.pointsPerMin || 5;
  };

  const handlePlanSelect = (plan: PremiumPlan) => {
    if (!user) {
      toast({ title: t("loginRequired") || "Login Required", description: "Please login to purchase", variant: "destructive" });
      navigate("/auth/login");
      return;
    }
    setSelectedPlan(plan);
    setStep("method");
    setPurchaseDialogOpen(true);
  };

  const copyPaymentNumber = async () => {
    const number = PAYMENT_ACCOUNTS[paymentMethod].number;
    await navigator.clipboard.writeText(number);
    setCopiedNumber(true);
    toast({ title: "Copied!", description: "Payment number copied to clipboard" });
    setTimeout(() => setCopiedNumber(false), 2000);
  };

  const handleSubmitPurchaseRequest = async () => {
    if (!user || !selectedPlan || !phoneNumber.trim()) {
      toast({ title: "Missing Information", description: "Please enter your phone number", variant: "destructive" });
      return;
    }

    setSubmitting(true);

    try {
      const pointsPerMin = getPointsPerMinute(selectedPlan);

      const { error } = await supabase
        .from("premium_purchase_requests")
        .insert({
          user_id: user.id,
          plan_id: selectedPlan.id,
          phone_number: phoneNumber.trim(),
          status: "pending",
          points_per_minute: pointsPerMin,
        });

      if (error) throw error;

      toast({
        title: "Request Submitted!",
        description: "Your purchase request is pending admin approval. You'll receive the blue mark once approved.",
      });

      setPurchaseDialogOpen(false);
      setSelectedPlan(null);
      setStep("method");
      loadData();
    } catch (error: any) {
      console.error("Purchase request error:", error);
      toast({ title: "Error", description: error.message || "Failed to submit request", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const PREMIUM_BENEFITS = [
    { icon: BadgeCheck, text: t("blueVerifiedMark") || "Blue Verified Mark" },
    { icon: Edit3, text: t("customNameChange") || "Custom Name Change" },
    { icon: Coins, text: t("earnPointsWhileChatting") || "Earn points while chatting" },
  ];

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
                {t("premiumShop") || "Premium Shop"}
              </h1>
              <p className="text-sm text-muted-foreground">Unlock exclusive features</p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-full">
              <Coins className="h-4 w-4 text-primary" />
              <span className="font-bold">{userPoints.toLocaleString()}</span>
            </div>
          </div>
        </header>

        {/* Top Ad Banner */}
        <AdBanner pageLocation="shop" position="top" className="px-4" />

        <div className="p-4 space-y-6">
          {/* Pending Request Notice */}
          {pendingRequest && (
            <Card className="border-amber-500/30 bg-amber-500/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-amber-500/20">
                    <Loader2 className="h-5 w-5 text-amber-500 animate-spin" />
                  </div>
                  <div>
                    <p className="font-semibold text-amber-600">{t("requestPending") || "Request Pending"}</p>
                    <p className="text-sm text-muted-foreground">
                      Your premium purchase is awaiting admin approval
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Benefits Banner */}
          <Card className="border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-yellow-500/5">
            <CardContent className="p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-500" />
                {t("premiumBenefits") || "Premium Benefits"}
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
                {t("subscriptions") || "Subscriptions"}
              </TabsTrigger>
              <TabsTrigger value="micro" className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                {t("quickBuy") || "Quick Buy"}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="subscription" className="mt-4 space-y-3">
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">{t("loading") || "Loading..."}</div>
              ) : subscriptionPlans.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No subscription plans available yet</p>
                  <p className="text-sm mt-2">Admin can add plans from the dashboard</p>
                </div>
              ) : (
                subscriptionPlans.map((plan) => {
                  const tier = SUBSCRIPTION_TIERS.find(t => t.months === plan.duration_months);
                  return (
                    <Card
                      key={plan.id}
                      className={cn(
                        "relative overflow-hidden transition-all hover:shadow-lg cursor-pointer",
                        plan.badge_text === "Popular" && "border-primary shadow-md",
                        plan.badge_text === "Best Value" && "border-green-500 shadow-md"
                      )}
                      onClick={() => handlePlanSelect(plan)}
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
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <h3 className="font-bold text-lg">{plan.name}</h3>
                            <p className="text-sm text-muted-foreground">{plan.description}</p>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-primary">
                              {(plan.price_mmk || 0).toLocaleString()}
                            </div>
                            <div className="text-xs text-muted-foreground">Ks</div>
                          </div>
                        </div>
                        
                        {tier && (
                          <div className="flex items-center gap-2 mt-3 p-2 rounded-lg bg-green-500/10">
                            <Coins className="h-4 w-4 text-green-600" />
                            <span className="text-sm font-medium text-green-700">
                              {t("earnPoints") || "Earn"} {tier.pointsPerMin} {t("points") || "points"} {t("perMinute") || "per minute"}
                            </span>
                          </div>
                        )}
                        
                        <Button className="w-full mt-3" disabled={!!pendingRequest}>
                          {pendingRequest ? (t("requestPending") || "Request Pending") : (
                            <>
                              <Check className="h-4 w-4 mr-2" />
                              {t("selectPlan") || "Select Plan"}
                            </>
                          )}
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </TabsContent>

            <TabsContent value="micro" className="mt-4 space-y-3">
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">{t("loading") || "Loading..."}</div>
              ) : microPlans.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No quick buy items available yet</p>
                  <p className="text-sm mt-2">Admin can add items from the dashboard</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {microPlans.map((plan) => (
                    <Card 
                      key={plan.id} 
                      className="overflow-hidden hover:shadow-lg transition-all cursor-pointer"
                      onClick={() => handlePlanSelect(plan)}
                    >
                      <CardContent className="p-4 text-center">
                        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-blue-500/10 flex items-center justify-center">
                          <Zap className="h-6 w-6 text-blue-500" />
                        </div>
                        <h3 className="font-semibold text-sm mb-1">{plan.name}</h3>
                        <p className="text-xs text-muted-foreground mb-2">{plan.description}</p>
                        <div className="text-lg font-bold text-primary mb-1">
                          {(plan.price_mmk || plan.price_points).toLocaleString()} Ks
                        </div>
                        <p className="text-xs text-green-600 mb-3">
                          +0.01 pts/min while chatting
                        </p>
                        <Button size="sm" className="w-full" disabled={!!pendingRequest}>
                          {pendingRequest ? "Pending" : t("buyNow") || "Buy"}
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

      {/* Purchase Dialog with Payment Flow */}
      <Dialog open={purchaseDialogOpen} onOpenChange={setPurchaseDialogOpen}>
        <DialogContent className="rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {step === "method" && <Wallet className="h-5 w-5 text-primary" />}
              {step === "instructions" && <QrCode className="h-5 w-5 text-primary" />}
              {step === "confirm" && <Crown className="h-5 w-5 text-amber-500" />}
              {step === "method" && "Select Payment Method"}
              {step === "instructions" && (t("paymentInstructions") || "Payment Instructions")}
              {step === "confirm" && (t("confirmPurchase") || "Confirm Purchase")}
            </DialogTitle>
          </DialogHeader>

          {/* Step 1: Select Payment Method */}
          {step === "method" && selectedPlan && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="font-semibold">{selectedPlan.name}</p>
                <p className="text-sm text-primary font-bold">{(selectedPlan.price_mmk || 0).toLocaleString()} Ks</p>
              </div>

              <div className="space-y-3">
                <Label>Choose payment method:</Label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setPaymentMethod("kpay")}
                    className={cn(
                      "p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2",
                      paymentMethod === "kpay" 
                        ? "border-primary bg-primary/5" 
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
                      <span className="text-lg font-bold text-red-500">K</span>
                    </div>
                    <span className="font-medium">KPay</span>
                  </button>
                  <button
                    onClick={() => setPaymentMethod("wavepay")}
                    className={cn(
                      "p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2",
                      paymentMethod === "wavepay" 
                        ? "border-primary bg-primary/5" 
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                      <span className="text-lg font-bold text-blue-500">W</span>
                    </div>
                    <span className="font-medium">WavePay</span>
                  </button>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setPurchaseDialogOpen(false)}>
                  {t("cancel") || "Cancel"}
                </Button>
                <Button onClick={() => setStep("instructions")}>
                  Continue
                </Button>
              </DialogFooter>
            </div>
          )}

          {/* Step 2: Payment Instructions */}
          {step === "instructions" && selectedPlan && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20">
                <p className="text-sm text-muted-foreground mb-2">
                  {paymentMethod === "kpay" 
                    ? (t("kpayInstructions") || "Send payment to the following KPay number")
                    : (t("wavepayInstructions") || "Send payment to the following WavePay number")}
                </p>
                
                <div className="flex items-center justify-between p-3 bg-background rounded-lg mb-3">
                  <div>
                    <p className="text-xs text-muted-foreground">{t("paymentNumber") || "Payment Number"}</p>
                    <p className="text-xl font-bold font-mono">{PAYMENT_ACCOUNTS[paymentMethod].number}</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={copyPaymentNumber}>
                    {copiedNumber ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>

                <div className="p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
                  <p className="text-sm font-medium text-amber-700">
                    Amount: {(selectedPlan.price_mmk || 0).toLocaleString()} Ks
                  </p>
                </div>
              </div>

              <p className="text-sm text-muted-foreground text-center">
                {t("afterPayment") || "After sending payment, enter your phone number below"}
              </p>

              <DialogFooter>
                <Button variant="outline" onClick={() => setStep("method")}>
                  {t("back") || "Back"}
                </Button>
                <Button onClick={() => setStep("confirm")}>
                  I've Sent Payment
                </Button>
              </DialogFooter>
            </div>
          )}

          {/* Step 3: Confirm with Phone Number */}
          {step === "confirm" && selectedPlan && (
            <div className="space-y-4">
              <DialogDescription>
                <div className="p-3 rounded-lg bg-muted/50 mt-2">
                  <p className="font-semibold">{selectedPlan.name}</p>
                  <p className="text-sm">{(selectedPlan.price_mmk || 0).toLocaleString()} Ks</p>
                  <p className="text-xs text-green-600 mt-1">
                    {t("earnPoints") || "Earn"} {getPointsPerMinute(selectedPlan)} {t("points") || "points"} {t("perMinute") || "per minute"}
                  </p>
                </div>
              </DialogDescription>
              
              <div className="space-y-2">
                <Label htmlFor="phone">{t("phoneForPayment") || "Phone Number for Payment"}</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="Enter your phone number"
                    className="pl-10"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  We'll contact you on this number for verification
                </p>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setStep("instructions")}>
                  {t("back") || "Back"}
                </Button>
                <Button onClick={handleSubmitPurchaseRequest} disabled={submitting}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  {t("submitRequest") || "Submit Request"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </MobileLayout>
  );
};

export default PremiumShop;
