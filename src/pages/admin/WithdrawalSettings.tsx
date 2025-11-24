import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save, Settings } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface WithdrawalSettings {
  id: string;
  minimum_points: number;
  exchange_rate: number;
  terms_conditions: string | null;
  enabled: boolean;
}

const WithdrawalSettings = () => {
  const [settings, setSettings] = useState<WithdrawalSettings | null>(null);
  const [minimumPoints, setMinimumPoints] = useState("1000");
  const [exchangeRate, setExchangeRate] = useState("1.0");
  const [termsConditions, setTermsConditions] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      checkAdmin();
      loadSettings();
    }
  }, [user]);

  const checkAdmin = async () => {
    if (!user) return;

    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!data) {
      navigate("/");
    }
  };

  const loadSettings = async () => {
    const { data } = await supabase
      .from("withdrawal_settings")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) {
      setSettings(data);
      setMinimumPoints(data.minimum_points.toString());
      setExchangeRate(data.exchange_rate.toString());
      setTermsConditions(data.terms_conditions || "");
      setEnabled(data.enabled);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    const minPoints = parseInt(minimumPoints);
    const rate = parseFloat(exchangeRate);

    if (isNaN(minPoints) || minPoints < 0) {
      toast({
        title: "Invalid minimum points",
        description: "Please enter a valid number",
        variant: "destructive",
      });
      return;
    }

    if (isNaN(rate) || rate <= 0) {
      toast({
        title: "Invalid exchange rate",
        description: "Please enter a valid positive number",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    const settingsData = {
      minimum_points: minPoints,
      exchange_rate: rate,
      terms_conditions: termsConditions || null,
      enabled: enabled,
      updated_at: new Date().toISOString(),
    };

    if (settings) {
      // Update existing settings
      const { error } = await supabase
        .from("withdrawal_settings")
        .update(settingsData)
        .eq("id", settings.id);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to update settings",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: "Withdrawal settings updated successfully",
        });
        loadSettings();
      }
    } else {
      // Create new settings
      const { error } = await supabase
        .from("withdrawal_settings")
        .insert(settingsData);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to create settings",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: "Withdrawal settings created successfully",
        });
        loadSettings();
      }
    }

    setSaving(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-gradient-primary text-primary-foreground p-4 sticky top-0 z-40">
        <div className="max-w-screen-xl mx-auto flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/admin")}
            className="text-primary-foreground hover:bg-primary-foreground/10"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">Withdrawal Settings</h1>
        </div>
      </header>

      <div className="max-w-screen-xl mx-auto p-4 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Configure Point Withdrawal System
            </CardTitle>
            <CardDescription>
              Customize the point withdrawal rules and terms for your users
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="enabled">Enable Withdrawals</Label>
                <Switch
                  id="enabled"
                  checked={enabled}
                  onCheckedChange={setEnabled}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Toggle to enable or disable the withdrawal feature for all users
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="minimum-points">Minimum Points Required</Label>
              <Input
                id="minimum-points"
                type="number"
                value={minimumPoints}
                onChange={(e) => setMinimumPoints(e.target.value)}
                placeholder="1000"
                min="0"
              />
              <p className="text-sm text-muted-foreground">
                Minimum point balance required to initiate a withdrawal
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="exchange-rate">Exchange Rate</Label>
              <Input
                id="exchange-rate"
                type="number"
                step="0.01"
                value={exchangeRate}
                onChange={(e) => setExchangeRate(e.target.value)}
                placeholder="1.0"
                min="0"
              />
              <p className="text-sm text-muted-foreground">
                Value of each point (e.g., 1.0 means 1 point = $1)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="terms">Terms & Conditions</Label>
              <Textarea
                id="terms"
                value={termsConditions}
                onChange={(e) => setTermsConditions(e.target.value)}
                placeholder="Enter withdrawal terms and conditions..."
                rows={4}
              />
              <p className="text-sm text-muted-foreground">
                Additional terms displayed to users during withdrawal
              </p>
            </div>

            <Button
              onClick={handleSave}
              disabled={saving}
              className="w-full"
              size="lg"
            >
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Saving..." : "Save Settings"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default WithdrawalSettings;
