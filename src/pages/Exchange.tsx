import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Lock, Coins, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import BottomNav from "@/components/BottomNav";
import PointsDisplay from "@/components/PointsDisplay";

interface WithdrawalItem {
  id: string;
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
  const [processingId, setProcessingId] = useState<string | null>(null);

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

    // Check if withdrawals are enabled
    if (!withdrawalSettings.enabled) {
      toast({
        title: "Withdrawals Disabled",
        description: "Point withdrawals are currently disabled by the administrator.",
        variant: "destructive",
      });
      return;
    }

    // Check minimum points requirement
    if (points < withdrawalSettings.minimum_points) {
      toast({
        title: "Insufficient Points",
        description: `You need at least ${withdrawalSettings.minimum_points} points to make an exchange.`,
        variant: "destructive",
      });
      return;
    }

    // Check if user has enough points for this specific item
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
      // Deduct points
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ points: points - item.points_required })
        .eq("id", user.id);

      if (updateError) throw updateError;

      // Create withdrawal request
      const { error: withdrawalError } = await supabase
        .from("point_withdrawals")
        .insert({
          user_id: user.id,
          points_withdrawn: item.points_required,
          withdrawal_item_id: item.id,
          status: "pending",
        });

      if (withdrawalError) throw withdrawalError;

      // Create transaction record
      await supabase.from("point_transactions").insert({
        user_id: user.id,
        amount: -item.points_required,
        transaction_type: "withdrawal",
        description: `Exchange for ${item.name}`,
      });

      toast({
        title: "Exchange Successful",
        description: `Your exchange request for ${item.name} has been submitted and is pending approval.`,
      });

      // Reload data
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
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading exchange options...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-primary text-primary-foreground p-6">
        <div className="container max-w-6xl mx-auto">
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/account")}
              className="text-primary-foreground hover:bg-primary-foreground/10"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold">Exchange Points</h1>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-primary-foreground/80">Your Balance</p>
              <div className="flex items-center gap-2 mt-1">
                <Coins className="h-6 w-6" />
                <span className="text-3xl font-bold">{points.toLocaleString()}</span>
                <span className="text-sm text-primary-foreground/80">points</span>
              </div>
            </div>
            <PointsDisplay />
          </div>
        </div>
      </div>

      <div className="container max-w-6xl mx-auto p-6 space-y-6">
        {/* Information Alert */}
        {withdrawalSettings && points < withdrawalSettings.minimum_points && (
          <Alert>
            <AlertDescription>
              <div className="flex items-start gap-2">
                <Lock className="h-5 w-5 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold mb-1">Minimum Points Required</p>
                  <p className="text-sm">
                    You need at least <strong>{withdrawalSettings.minimum_points} points</strong> to exchange.
                    You're currently <strong>{withdrawalSettings.minimum_points - points} points</strong> away!
                    Keep earning points to unlock exchanges.
                  </p>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {!withdrawalSettings?.enabled && (
          <Alert variant="destructive">
            <AlertDescription>
              Point exchanges are currently disabled by the administrator. Please check back later.
            </AlertDescription>
          </Alert>
        )}

        {/* Terms and Conditions */}
        {withdrawalSettings?.terms_conditions && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Terms & Conditions</CardTitle>
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
          <h2 className="text-xl font-semibold mb-4">Available Exchanges</h2>
          {withdrawalItems.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground">No exchange options available at the moment.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {withdrawalItems.map((item) => {
                const isAvailable = canExchange(item);
                const status = getItemStatus(item);

                return (
                  <Card 
                    key={item.id} 
                    className={!isAvailable ? "opacity-75" : ""}
                  >
                    {item.image_url && (
                      <div className="aspect-video w-full overflow-hidden rounded-t-lg bg-muted">
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    )}
                    <CardHeader>
                      <CardTitle className="flex items-start justify-between gap-2">
                        <span>{item.name}</span>
                        <div className="flex items-center gap-1 text-primary font-bold text-lg whitespace-nowrap">
                          <Coins className="h-5 w-5" />
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
                      
                      <div className={`flex items-center gap-2 text-sm ${isAvailable ? "text-primary" : "text-muted-foreground"}`}>
                        {status.icon}
                        <span>{status.text}</span>
                      </div>

                      <Button
                        onClick={() => handleExchange(item)}
                        disabled={!isAvailable || processingId === item.id}
                        className="w-full"
                      >
                        {processingId === item.id ? (
                          "Processing..."
                        ) : isAvailable ? (
                          "Exchange Now"
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