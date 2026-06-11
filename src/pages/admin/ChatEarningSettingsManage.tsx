import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Loader2, Save, Coins } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import MobileLayout from "@/components/MobileLayout";

interface Settings {
  enabled: boolean;
  require_vpn: boolean;
  home_country: string;
  reward_per_message: number;
  daily_cap: number;
  min_message_length: number;
  cooldown_seconds: number;
}

const DEFAULTS: Settings = {
  enabled: true,
  require_vpn: true,
  home_country: "MM",
  reward_per_message: 1,
  daily_cap: 20,
  min_message_length: 2,
  cooldown_seconds: 10,
};

const ChatEarningSettingsManage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [s, setS] = useState<Settings>(DEFAULTS);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("chat_earning_settings").select("*").maybeSingle();
      if (data) {
        setS({
          enabled: data.enabled,
          require_vpn: data.require_vpn,
          home_country: data.home_country || "MM",
          reward_per_message: data.reward_per_message,
          daily_cap: data.daily_cap,
          min_message_length: data.min_message_length,
          cooldown_seconds: data.cooldown_seconds,
        });
      }
      setLoading(false);
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("chat_earning_settings")
      .upsert({ id: true as any, ...s, updated_at: new Date().toISOString() } as any);
    setSaving(false);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Saved", description: "Chat earning settings updated." });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <MobileLayout className="bg-background">
      <header className="bg-gradient-primary text-primary-foreground px-4 py-3 sticky top-0 z-40 shadow-md flex items-center gap-2">
        <button onClick={() => navigate("/admin")} className="p-2 -ml-2 rounded-full hover:bg-primary-foreground/10">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h1 className="font-display font-bold flex items-center gap-2">
            <Coins className="h-5 w-5" /> Chat Earning Settings
          </h1>
          <p className="text-[11px] opacity-80">Configure rewards & anti-abuse</p>
        </div>
      </header>

      <div className="p-4 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Toggles</CardTitle>
            <CardDescription>Enable / disable chat earning and VPN requirement</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Earning enabled</Label>
                <p className="text-xs text-muted-foreground">Users earn coins for chatting</p>
              </div>
              <Switch checked={s.enabled} onCheckedChange={(v) => setS({ ...s, enabled: v })} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Require VPN</Label>
                <p className="text-xs text-muted-foreground">Only award when user is outside home country</p>
              </div>
              <Switch checked={s.require_vpn} onCheckedChange={(v) => setS({ ...s, require_vpn: v })} />
            </div>
            <div>
              <Label>Home country (ISO-2)</Label>
              <Input
                value={s.home_country}
                onChange={(e) => setS({ ...s, home_country: e.target.value.toUpperCase().slice(0, 2) })}
                maxLength={2}
                placeholder="MM"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Reward & limits</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Reward per message</Label>
              <Input
                type="number"
                min={0}
                value={s.reward_per_message}
                onChange={(e) => setS({ ...s, reward_per_message: parseInt(e.target.value || "0", 10) })}
              />
            </div>
            <div>
              <Label>Daily cap (coins per user)</Label>
              <Input
                type="number"
                min={0}
                value={s.daily_cap}
                onChange={(e) => setS({ ...s, daily_cap: parseInt(e.target.value || "0", 10) })}
              />
            </div>
            <div>
              <Label>Cooldown (seconds)</Label>
              <Input
                type="number"
                min={0}
                value={s.cooldown_seconds}
                onChange={(e) => setS({ ...s, cooldown_seconds: parseInt(e.target.value || "0", 10) })}
              />
            </div>
            <div>
              <Label>Minimum message length</Label>
              <Input
                type="number"
                min={1}
                value={s.min_message_length}
                onChange={(e) => setS({ ...s, min_message_length: parseInt(e.target.value || "1", 10) })}
              />
            </div>
          </CardContent>
        </Card>

        <Button onClick={save} disabled={saving} className="w-full">
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Save settings
        </Button>
      </div>
    </MobileLayout>
  );
};

export default ChatEarningSettingsManage;
