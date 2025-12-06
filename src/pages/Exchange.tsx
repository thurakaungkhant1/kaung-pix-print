import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Lock, Coins, CheckCircle, Gift, Sparkles, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import BottomNav from "@/components/BottomNav";
import PointsDisplay from "@/components/PointsDisplay";

interface WithdrawalItem {
  id: number;
  name: string;
  description: string | null;
  points_required: number;
  value_amount: number;
  image_url: string | null;
}

interface WithdrawalSettings {
  enabled: boolean;
  minimum_points: number;
  exchange_rate: number;
  terms_conditions: string | null;
}

const Exchange = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [points, setPoints] = useState<number>(0);
  const [withdrawalItems, setWithdrawalItems] = useState<WithdrawalItem[]>([]);
  const [withdrawalSettings, setWithdrawalSettings] = useState<WithdrawalSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    await Promise.all([
      loadPoints(),
      loadWithdrawalItems(),
      loadWithdrawalSettings()
    ]);
    setLoading(false);
  };

  const loadPoints = async () => {
    if (!user) return;

    const { data } = await supabase
      .from("profiles")
      .select("points")
      .eq("id", user.id)
      .single();

    if (data) {
      setPoints(data.points);
    }
  };

  const loadWithdrawalItems = async () => {
    const { data, error } = await supabase
      .from("withdrawal_items")
      .select("*")
      .eq("is_active", true)
      .order("points_required", { ascending: true });

    if (error) {
      console.error("Error loading withdrawal items:", error);
      toast({
        title: "Error",
        description: "Failed to load exchange items",
        variant: "destructive",
      });
      return;
    }

    setWithdrawalItems(data || []);
  };

  const loadWithdrawalSettings = async () => {
    const { data } = await supabase
      .from("withdrawal_settings")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (data) {
      setWithdrawalSettings(data);
    }
  };

  const handleExchange = async (item: WithdrawalItem) => {
    if (!user || !withdrawalSettings) return;

    if (!withdrawalSettings.enabled) {
      toast({
        title: "Withdrawals Disabled",
        description: "Point withdrawals are currently disabled by the administrator.",
        variant: "destructive",
      });
      return;
    }

    if (points < withdrawalSettings.minimum_points) {
      toast({
        title: "Insufficient Points",
        description: `You need at least ${withdrawalSettings.minimum_points} points to make an exchange.`,
        variant: "destructive",
      });
      return;
    }

    if (points < item.points_required) {
      toast({
        title: "Insufficient Points",
        description: `You need ${item.points_required} points for this exchange.`,
        variant: "destructive",
      });
      return;
    }

    setProcessingId(item.id);

    try {
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ points: points - item.points_required })
        .eq("id", user.id);

      if (updateError) throw updateError;

      const { error: withdrawalError } = await supabase
        .from("point_withdrawals")
        .insert({
          user_id: user.id,
          points_withdrawn: item.points_required,
          withdrawal_item_id: item.id,
          status: "pending",
        });

      if (withdrawalError) throw withdrawalError;

      await supabase.from("point_transactions").insert({
        user_id: user.id,
        amount: -item.points_required,
        transaction_type: "withdrawal",
        description: `Exchange for ${item.name}`,
      });

      toast({
        title: "Exchange Successful! 🎉",
        description: `Your exchange request for ${item.name} has been submitted and is pending approval.`,
      });

      await loadData();
    } catch (error) {
      console.error("Exchange error:", error);
      toast({
        title: "Error",
        description: "Failed to process exchange request",
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const canExchange = (item: WithdrawalItem): boolean => {
    if (!withdrawalSettings) return false;
    return (
      withdrawalSettings.enabled &&
      points >= withdrawalSettings.minimum_points &&
      points >= item.points_required
    );
  };

  const getItemStatus = (item: WithdrawalItem): { text: string; icon: JSX.Element } => {
    if (!withdrawalSettings) {
      return { text: "Loading...", icon: <Lock className="h-4 w-4" /> };
    }

    if (!withdrawalSettings.enabled) {
      return { text: "Currently Unavailable", icon: <Lock className="h-4 w-4" /> };
    }

    if (points < withdrawalSettings.minimum_points) {
      return { 
        text: `Need ${withdrawalSettings.minimum_points - points} more points to unlock exchanges`, 
        icon: <Lock className="h-4 w-4" /> 
      };
    }

    if (points < item.points_required) {
      return { 
        text: `Need ${item.points_required - points} more points`, 
        icon: <Lock className="h-4 w-4" /> 
      };
    }

    return { text: "Available", icon: <CheckCircle className="h-4 w-4 text-primary" /> };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground font-medium animate-pulse">Loading exchange options...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30 pb-20">
      {/* Hero Header */}
      <div className="bg-gradient-primary text-primary-foreground p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2240%22%20height%3D%2240%22%20viewBox%3D%220%200%2040%2040%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.05%22%3E%3Ccircle%20cx%3D%2220%22%20cy%3D%2220%22%20r%3D%222%22%2F%3E%3C%2Fg%3E%3C%2Fsvg%3E')] opacity-50" />
        <div className="container max-w-6xl mx-auto relative">
          <div className="flex items-center gap-4 mb-6">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/account")}
              className="text-primary-foreground hover:bg-primary-foreground/10 rounded-full"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-display font-bold">Exchange Points</h1>
          </div>
          
          <Card className="bg-primary-foreground/10 border-primary-foreground/20 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-primary-foreground/80">Your Balance</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Coins className="h-8 w-8" />
                    <span className="text-4xl font-display font-bold">{points.toLocaleString()}</span>
                    <span className="text-sm text-primary-foreground/80">points</span>
                  </div>
                </div>
                <div className="text-right">
                  <PointsDisplay />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="container max-w-6xl mx-auto p-6 space-y-6">
        {/* Progress Alert */}
        {withdrawalSettings && points < withdrawalSettings.minimum_points && (
          <Alert className="border-primary/20 bg-primary/5 animate-fade-in">
            <TrendingUp className="h-5 w-5 text-primary" />
            <AlertDescription>
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <p className="font-semibold mb-1">Keep going! You're making progress</p>
                  <p className="text-sm text-muted-foreground">
                    You need <strong>{withdrawalSettings.minimum_points - points} more points</strong> to unlock exchanges.
                  </p>
                  <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-primary transition-all duration-500"
                      style={{ width: `${Math.min((points / withdrawalSettings.minimum_points) * 100, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {Math.round((points / withdrawalSettings.minimum_points) * 100)}% complete
                  </p>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {!withdrawalSettings?.enabled && (
          <Alert variant="destructive" className="animate-fade-in">
            <Lock className="h-5 w-5" />
            <AlertDescription>
              Point exchanges are currently disabled. Please check back later!
            </AlertDescription>
          </Alert>
        )}

        {/* Terms */}
        {withdrawalSettings?.terms_conditions && (
          <Card className="border-dashed animate-fade-in">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Gift className="h-5 w-5 text-primary" />
                Terms & Conditions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {withdrawalSettings.terms_conditions}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Exchange Items Grid */}
        <div>
          <h2 className="text-xl font-display font-semibold mb-4 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Available Exchanges
          </h2>
          {withdrawalItems.length === 0 ? (
            <Card className="animate-fade-in">
              <CardContent className="p-12 text-center">
                <Gift className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-display font-semibold mb-2">No exchange options yet</h3>
                <p className="text-muted-foreground">
                  Check back soon for exciting rewards!
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {withdrawalItems.map((item, index) => {
                const isAvailable = canExchange(item);
                const status = getItemStatus(item);

                return (
                  <Card 
                    key={item.id} 
                    className={`overflow-hidden transition-all duration-300 animate-fade-in hover:shadow-lg ${
                      !isAvailable ? "opacity-75" : ""
                    }`}
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    {item.image_url && (
                      <div className="aspect-video w-full overflow-hidden bg-muted relative group">
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-foreground/30 to-transparent" />
                      </div>
                    )}
                    <CardHeader>
                      <CardTitle className="flex items-start justify-between gap-2">
                        <span className="font-display">{item.name}</span>
                        <div className="flex items-center gap-1 text-primary font-bold text-lg whitespace-nowrap bg-primary/10 px-2 py-1 rounded-full">
                          <Coins className="h-4 w-4" />
                          {item.points_required.toLocaleString()}
                        </div>
                      </CardTitle>
                      {item.description && (
                        <CardDescription>{item.description}</CardDescription>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Value:</span>
                        <span className="font-semibold text-lg">${item.value_amount}</span>
                      </div>
                      
                      <div className={`flex items-center gap-2 text-sm p-2 rounded-lg ${
                        isAvailable ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                      }`}>
                        {status.icon}
                        <span>{status.text}</span>
                      </div>

                      <Button
                        onClick={() => handleExchange(item)}
                        disabled={!isAvailable || processingId === item.id}
                        className="w-full transition-all duration-300"
                        size="lg"
                      >
                        {processingId === item.id ? (
                          <span className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            Processing...
                          </span>
                        ) : isAvailable ? (
                          <>
                            <Gift className="h-4 w-4 mr-2" />
                            Exchange Now
                          </>
                        ) : (
                          <>
                            <Lock className="h-4 w-4 mr-2" />
                            Locked
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Exchange;