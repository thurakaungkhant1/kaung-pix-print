import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Key, Zap, CheckCircle, AlertCircle, Loader2, Eye, EyeOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const ApiSettings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  
  const [smileApiKey, setSmileApiKey] = useState("");
  const [smilePartnerId, setSmilePartnerId] = useState("");
  const [autoTopupEnabled, setAutoTopupEnabled] = useState(false);
  const [apiStatus, setApiStatus] = useState<"unknown" | "connected" | "error">("unknown");

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data } = await supabase
        .from("ad_settings")
        .select("*")
        .in("setting_key", ["smile_api_key", "smile_partner_id", "auto_topup_enabled"]);

      if (data) {
        data.forEach((setting) => {
          switch (setting.setting_key) {
            case "smile_api_key":
              setSmileApiKey(setting.setting_value);
              break;
            case "smile_partner_id":
              setSmilePartnerId(setting.setting_value);
              break;
            case "auto_topup_enabled":
              setAutoTopupEnabled(setting.setting_value === "true");
              break;
          }
        });
        if (data.find(s => s.setting_key === "smile_api_key")?.setting_value) {
          setApiStatus("connected");
        }
      }
    } catch (error) {
      console.error("Error loading settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveSetting = async (key: string, value: string, description?: string) => {
    const { data: existing } = await supabase
      .from("ad_settings")
      .select("id")
      .eq("setting_key", key)
      .single();

    if (existing) {
      await supabase.from("ad_settings").update({ setting_value: value, updated_at: new Date().toISOString() }).eq("setting_key", key);
    } else {
      await supabase.from("ad_settings").insert({ setting_key: key, setting_value: value, description: description || null });
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await Promise.all([
        saveSetting("smile_api_key", smileApiKey, "Smile.one API Key for auto top-up"),
        saveSetting("smile_partner_id", smilePartnerId, "Smile.one Partner ID"),
        saveSetting("auto_topup_enabled", autoTopupEnabled.toString(), "Enable auto top-up feature"),
      ]);

      if (smileApiKey) {
        setApiStatus("connected");
      } else {
        setApiStatus("unknown");
        setAutoTopupEnabled(false);
      }

      toast({ title: "Settings saved", description: "API settings have been updated successfully" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to save settings", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleTestApi = async () => {
    if (!smileApiKey || !smilePartnerId) {
      toast({ title: "Missing credentials", description: "Please enter API Key and Partner ID first", variant: "destructive" });
      return;
    }

    setTesting(true);
    try {
      // Test the API connection via edge function
      const { data, error } = await supabase.functions.invoke("auto-topup", {
        body: { action: "test", api_key: smileApiKey, partner_id: smilePartnerId },
      });

      if (error) throw error;

      if (data?.success) {
        setApiStatus("connected");
        toast({ title: "API Connected!", description: "Smile.one API connection successful" });
      } else {
        setApiStatus("error");
        toast({ title: "Connection Failed", description: data?.message || "Could not connect to API", variant: "destructive" });
      }
    } catch (error: any) {
      setApiStatus("error");
      toast({ title: "Connection Failed", description: error.message || "Could not test API connection", variant: "destructive" });
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="bg-gradient-primary text-primary-foreground p-4 sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin")} className="hover:bg-primary-foreground/10">
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <div className="flex items-center gap-2">
            <Key className="h-6 w-6" />
            <h1 className="text-2xl font-bold">API Settings</h1>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto p-4 space-y-6">
        {/* API Status */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${apiStatus === "connected" ? "bg-green-500" : apiStatus === "error" ? "bg-red-500" : "bg-yellow-500"}`} />
                <div>
                  <p className="font-medium">Auto Top-up API</p>
                  <p className="text-sm text-muted-foreground">
                    {apiStatus === "connected" ? "Connected & Ready" : apiStatus === "error" ? "Connection Error" : "Not Configured"}
                  </p>
                </div>
              </div>
              <Badge variant={apiStatus === "connected" ? "default" : "secondary"}>
                {apiStatus === "connected" ? <><CheckCircle className="h-3 w-3 mr-1" />Active</> : <><AlertCircle className="h-3 w-3 mr-1" />Inactive</>}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Smile.one API Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Smile.one API Configuration
            </CardTitle>
            <CardDescription>
              Configure your Smile.one API credentials to enable automatic game top-ups. 
              Get your API key from <a href="https://smile.one" target="_blank" rel="noopener noreferrer" className="text-primary underline">smile.one</a>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="partner_id">Partner ID / Merchant ID</Label>
              <Input
                id="partner_id"
                placeholder="Enter your Smile.one Partner ID"
                value={smilePartnerId}
                onChange={(e) => setSmilePartnerId(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="api_key">API Key / Secret Key</Label>
              <div className="relative">
                <Input
                  id="api_key"
                  type={showApiKey ? "text" : "password"}
                  placeholder="Enter your Smile.one API Key"
                  value={smileApiKey}
                  onChange={(e) => setSmileApiKey(e.target.value)}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full"
                  onClick={() => setShowApiKey(!showApiKey)}
                >
                  {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Your API key is stored securely and never exposed to users</p>
            </div>

            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div>
                <Label htmlFor="auto_topup">Enable Auto Top-up</Label>
                <p className="text-sm text-muted-foreground">Automatically process game top-ups when orders are approved</p>
              </div>
              <Switch
                id="auto_topup"
                checked={autoTopupEnabled}
                onCheckedChange={setAutoTopupEnabled}
                disabled={!smileApiKey}
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={handleTestApi} disabled={testing || !smileApiKey} className="flex-1">
                {testing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Testing...</> : "Test Connection"}
              </Button>
              <Button onClick={handleSave} disabled={saving} className="flex-1">
                {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</> : "Save Settings"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* How it works */}
        <Card>
          <CardHeader>
            <CardTitle>How Auto Top-up Works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">1</span>
              </div>
              <p>User orders game top-up (MLBB Diamonds / PUBG UC) with Player ID</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">2</span>
              </div>
              <p>Admin approves the order from the dashboard</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">3</span>
              </div>
              <p>If auto top-up is enabled, the system automatically sends diamonds/UC to the player via Smile.one API</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">4</span>
              </div>
              <p>Bonus coins are automatically credited to the user's account</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ApiSettings;
