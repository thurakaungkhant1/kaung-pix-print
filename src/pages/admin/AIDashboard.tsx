import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft, Sparkles, Image as ImageIcon, Heart, Gift, CheckCircle2, XCircle,
  Coins, TrendingUp, Loader2, Pause, Play, Crown, Save, Plus, Search,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const AIDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ photosToday: 0, photosTotal: 0, photos7d: [] as { d: string; n: number }[], pendingInv: 0, pendingGifts: 0, totalInvitations: 0, totalGifts: 0, invitationPrice: 1000 });
  const [settings, setSettings] = useState<any>(null);
  const [styles, setStyles] = useState<any[]>([]);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [gifts, setGifts] = useState<any[]>([]);
  const [savingSettings, setSavingSettings] = useState(false);

  // Credit grant
  const [grantEmail, setGrantEmail] = useState("");
  const [grantAmount, setGrantAmount] = useState("10");
  const [granting, setGranting] = useState(false);

  const load = async () => {
    setLoading(true);
    const start = new Date(); start.setUTCHours(0, 0, 0, 0);
    const last7 = new Date(Date.now() - 7 * 86400_000).toISOString();

    const [{ data: settingsRow }, photoToday, photoTotal, { data: photos7 }, { data: stylesRow }, invs, gfts] = await Promise.all([
      supabase.from("ai_usage_settings").select("*").limit(1).maybeSingle(),
      supabase.from("ai_photo_generations").select("id", { count: "exact", head: true }).gte("created_at", start.toISOString()),
      supabase.from("ai_photo_generations").select("id", { count: "exact", head: true }),
      supabase.from("ai_photo_generations").select("created_at").gte("created_at", last7),
      supabase.from("ai_styles").select("*").order("display_order", { ascending: true }),
      supabase.from("ai_invitations").select("*").order("created_at", { ascending: false }).limit(50),
      supabase.from("ai_gift_links").select("*").order("created_at", { ascending: false }).limit(50),
    ]);

    // Build 7-day buckets
    const buckets: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400_000);
      const key = d.toISOString().slice(5, 10);
      buckets[key] = 0;
    }
    (photos7 ?? []).forEach((p: any) => {
      const k = new Date(p.created_at).toISOString().slice(5, 10);
      if (k in buckets) buckets[k]++;
    });

    const invList = invs.data ?? []; const giftList = gfts.data ?? [];
    setSettings(settingsRow);
    setStyles(stylesRow ?? []);
    setInvitations(invList); setGifts(giftList);
    setStats({
      photosToday: photoToday.count ?? 0,
      photosTotal: photoTotal.count ?? 0,
      photos7d: Object.entries(buckets).map(([d, n]) => ({ d, n })),
      invitationPrice: Number(settingsRow?.invitation_price_mmk ?? 1000),
      pendingInv: invList.filter((i: any) => i.status === "pending" || !i.paid).length,
      pendingGifts: giftList.filter((g: any) => g.status === "pending").length,
      totalInvitations: invList.length,
      totalGifts: giftList.length,
    });
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const saveSettings = async () => {
    if (!settings) return;
    setSavingSettings(true);
    const { error } = await supabase.from("ai_usage_settings").update({
      ai_paused: settings.ai_paused,
      free_daily_limit: settings.free_daily_limit,
      premium_daily_limit: settings.premium_daily_limit,
      photo_cost_coins: settings.photo_cost_coins,
    }).eq("id", settings.id);
    setSavingSettings(false);
    if (error) toast.error(error.message);
    else toast.success("Settings saved");
  };

  const toggleStyle = async (s: any) => {
    const next = !s.is_active;
    setStyles((prev) => prev.map((x) => (x.id === s.id ? { ...x, is_active: next } : x)));
    const { error } = await supabase.from("ai_styles").update({ is_active: next }).eq("id", s.id);
    if (error) {
      toast.error(error.message);
      setStyles((prev) => prev.map((x) => (x.id === s.id ? { ...x, is_active: !next } : x)));
    }
  };

  const flipTier = async (s: any) => {
    const next = s.tier === "premium" ? "free" : "premium";
    const { error } = await supabase.from("ai_styles").update({ tier: next }).eq("id", s.id);
    if (error) return toast.error(error.message);
    setStyles((prev) => prev.map((x) => (x.id === s.id ? { ...x, tier: next } : x)));
  };

  const grantCredits = async () => {
    const amt = parseInt(grantAmount, 10);
    if (!grantEmail.trim() || !amt || amt <= 0) {
      toast.error("Enter email and positive amount");
      return;
    }
    setGranting(true);
    try {
      const { data: prof, error: pErr } = await supabase
        .from("profiles").select("id, premium_ai_credits, email")
        .eq("email", grantEmail.trim().toLowerCase()).maybeSingle();
      if (pErr) throw pErr;
      if (!prof) throw new Error("User not found");
      const { error: uErr } = await supabase
        .from("profiles")
        .update({ premium_ai_credits: (prof.premium_ai_credits ?? 0) + amt })
        .eq("id", prof.id);
      if (uErr) throw uErr;
      toast.success(`Granted ${amt} premium credits to ${prof.email}`);
      setGrantEmail(""); setGrantAmount("10");
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    } finally {
      setGranting(false);
    }
  };

  const updateInvitation = async (id: string, patch: any) => {
    const { error } = await supabase.from("ai_invitations").update(patch).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Updated"); load();
  };
  const updateGift = async (id: string, status: string) => {
    const { error } = await supabase.from("ai_gift_links").update({ status }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Updated"); load();
  };

  const cards = [
    { label: "Photos Today", value: `${stats.photosToday}`, sub: `Free ${settings?.free_daily_limit ?? 5} • Prem ${settings?.premium_daily_limit ?? 100}`, icon: ImageIcon, gradient: "from-purple-500 to-pink-500" },
    { label: "Total AI Photos", value: stats.photosTotal.toLocaleString(), sub: settings?.ai_paused ? "⏸ Paused" : "● Live", icon: Sparkles, gradient: "from-fuchsia-500 to-rose-500" },
    { label: "Pending Invitations", value: `${stats.pendingInv}`, sub: `${stats.invitationPrice.toLocaleString()} MMK each`, icon: Heart, gradient: "from-rose-500 to-orange-400" },
    { label: "Pending Gift Links", value: `${stats.pendingGifts}`, sub: `${stats.totalGifts} total`, icon: Gift, gradient: "from-blue-500 to-indigo-500" },
  ];

  const max7 = Math.max(1, ...stats.photos7d.map((b) => b.n));

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen bg-background pb-12 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 -right-20 w-96 h-96 rounded-full bg-purple-500/10 blur-3xl" />
        <div className="absolute bottom-0 -left-20 w-96 h-96 rounded-full bg-blue-500/10 blur-3xl" />
      </div>

      <header className="sticky top-0 z-40 bg-background/70 backdrop-blur-xl border-b border-border/40">
        <div className="flex items-center gap-3 px-4 h-14 max-w-6xl mx-auto">
          <Link to="/admin" className="p-2 -ml-2 rounded-full hover:bg-accent transition"><ArrowLeft className="w-5 h-5" /></Link>
          <h1 className="font-semibold flex-1">AI Suite Dashboard</h1>
          <Button size="sm" variant="ghost" onClick={load} disabled={loading}>{loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Refresh"}</Button>
        </div>
      </header>

      <div className="relative z-10 px-4 py-6 max-w-6xl mx-auto space-y-6">
        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {cards.map((c, i) => (
            <motion.div key={c.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
              <Card className="overflow-hidden border-border/40 bg-card/60 backdrop-blur-xl hover:shadow-xl hover:scale-[1.02] transition-all">
                <CardContent className="p-4 relative">
                  <div className={`absolute -top-8 -right-8 w-24 h-24 rounded-full bg-gradient-to-br ${c.gradient} opacity-20 blur-2xl`} />
                  <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${c.gradient} flex items-center justify-center shadow-lg mb-3`}>
                    <c.icon className="w-4 h-4 text-white" />
                  </div>
                  <div className="text-2xl font-bold">{c.value}</div>
                  <div className="text-xs font-medium text-foreground/80">{c.label}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">{c.sub}</div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <Tabs defaultValue="settings">
          <TabsList className="w-full grid grid-cols-5">
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="styles">Styles</TabsTrigger>
            <TabsTrigger value="credits">Credits</TabsTrigger>
            <TabsTrigger value="invitations">Invites</TabsTrigger>
            <TabsTrigger value="gifts">Gifts</TabsTrigger>
          </TabsList>

          {/* SETTINGS */}
          <TabsContent value="settings" className="mt-4 space-y-4">
            {settings && (
              <Card className="border-border/40 bg-card/60 backdrop-blur">
                <CardContent className="p-5 space-y-5">
                  <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-muted/40 border border-border/40">
                    <div className="flex items-center gap-2">
                      {settings.ai_paused ? <Pause className="w-4 h-4 text-amber-500" /> : <Play className="w-4 h-4 text-emerald-500" />}
                      <div>
                        <div className="font-semibold text-sm">AI Generation</div>
                        <div className="text-xs text-muted-foreground">{settings.ai_paused ? "Paused — users see maintenance message" : "Live for all users"}</div>
                      </div>
                    </div>
                    <Switch checked={!settings.ai_paused} onCheckedChange={(v) => setSettings({ ...settings, ai_paused: !v })} />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs">Free daily limit</Label>
                      <Input type="number" min={0} value={settings.free_daily_limit ?? 5}
                        onChange={(e) => setSettings({ ...settings, free_daily_limit: parseInt(e.target.value || "0", 10) })} />
                    </div>
                    <div>
                      <Label className="text-xs">Premium daily limit</Label>
                      <Input type="number" min={0} value={settings.premium_daily_limit ?? 100}
                        onChange={(e) => setSettings({ ...settings, premium_daily_limit: parseInt(e.target.value || "0", 10) })} />
                    </div>
                    <div>
                      <Label className="text-xs">Photo cost (coins)</Label>
                      <Input type="number" min={0} value={settings.photo_cost_coins ?? 50}
                        onChange={(e) => setSettings({ ...settings, photo_cost_coins: parseInt(e.target.value || "0", 10) })} />
                    </div>
                  </div>

                  <Button onClick={saveSettings} disabled={savingSettings} className="w-full">
                    {savingSettings ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Save settings
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* 7-day usage chart */}
            <Card className="border-border/40 bg-card/60 backdrop-blur">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="font-semibold text-sm flex items-center gap-1.5"><TrendingUp className="w-4 h-4 text-primary" /> Last 7 days</div>
                  <span className="text-xs text-muted-foreground">photos / day</span>
                </div>
                <div className="flex items-end gap-2 h-36">
                  {stats.photos7d.map((b) => (
                    <div key={b.d} className="flex-1 flex flex-col items-center gap-1">
                      <div className="text-[10px] font-bold">{b.n}</div>
                      <div className="w-full rounded-t-md bg-gradient-to-t from-purple-500 to-pink-500 transition-all"
                        style={{ height: `${(b.n / max7) * 100}%`, minHeight: 2 }} />
                      <div className="text-[10px] text-muted-foreground">{b.d}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* STYLES */}
          <TabsContent value="styles" className="mt-4 space-y-2">
            {styles.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-12">No styles yet.</p>
            ) : styles.map((s) => (
              <Card key={s.id} className="border-border/40 bg-card/60 backdrop-blur">
                <CardContent className="p-3.5 flex items-center gap-3 flex-wrap">
                  <div className="flex-1 min-w-[180px]">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{s.label}</span>
                      <Badge variant="outline" className="text-[10px] font-mono">{s.key}</Badge>
                      <Badge className={s.tier === "premium" ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30" : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"}>
                        {s.tier === "premium" && <Crown className="w-3 h-3 mr-1" />}{s.tier}
                      </Badge>
                    </div>
                    {s.prompt_suffix && <div className="text-xs text-muted-foreground mt-1 line-clamp-1">{s.prompt_suffix}</div>}
                  </div>
                  <div className="flex items-center gap-3">
                    <Button size="sm" variant="ghost" onClick={() => flipTier(s)}>
                      Make {s.tier === "premium" ? "free" : "premium"}
                    </Button>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{s.is_active ? "On" : "Off"}</span>
                      <Switch checked={s.is_active} onCheckedChange={() => toggleStyle(s)} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* CREDITS */}
          <TabsContent value="credits" className="mt-4 space-y-3">
            <Card className="border-border/40 bg-card/60 backdrop-blur">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <Coins className="w-4 h-4 text-amber-500" />
                  <div className="font-semibold text-sm">Grant Premium AI Credits</div>
                </div>
                <p className="text-xs text-muted-foreground">Add premium-pool credits to a specific user (used before daily quota).</p>
                <div className="grid grid-cols-1 md:grid-cols-[1fr_140px_auto] gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input className="pl-9" placeholder="user@email.com"
                      value={grantEmail} onChange={(e) => setGrantEmail(e.target.value)} />
                  </div>
                  <Input type="number" min={1} placeholder="Amount"
                    value={grantAmount} onChange={(e) => setGrantAmount(e.target.value)} />
                  <Button onClick={grantCredits} disabled={granting}>
                    {granting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                    Grant
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* INVITATIONS */}
          <TabsContent value="invitations" className="mt-4 space-y-2">
            {invitations.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-12">No invitations yet.</p>
            ) : invitations.map((inv) => (
              <Card key={inv.id} className="border-border/40 bg-card/60 backdrop-blur">
                <CardContent className="p-4 flex items-center gap-3 flex-wrap">
                  <div className="flex-1 min-w-[200px]">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium capitalize">{inv.theme}</span>
                      <Badge variant={inv.status === "approved" ? "default" : "secondary"}>{inv.status}</Badge>
                      <Badge variant={inv.paid ? "default" : "outline"} className="gap-1"><Coins className="w-3 h-3" />{inv.paid ? "Paid" : "Unpaid"}</Badge>
                      <span className="text-xs text-muted-foreground">{Number(inv.price_mmk).toLocaleString()} MMK</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 line-clamp-1">{inv.invitation_text}</div>
                  </div>
                  <div className="flex gap-2">
                    {!inv.paid && <Button size="sm" variant="outline" onClick={() => updateInvitation(inv.id, { paid: true })}><Coins className="w-3.5 h-3.5 mr-1" />Mark Paid</Button>}
                    {inv.status !== "approved" && <Button size="sm" onClick={() => updateInvitation(inv.id, { status: "approved", approved_at: new Date().toISOString() })}><CheckCircle2 className="w-3.5 h-3.5 mr-1" />Approve</Button>}
                    {inv.status !== "rejected" && <Button size="sm" variant="destructive" onClick={() => updateInvitation(inv.id, { status: "rejected" })}><XCircle className="w-3.5 h-3.5 mr-1" />Reject</Button>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* GIFTS */}
          <TabsContent value="gifts" className="mt-4 space-y-2">
            {gifts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-12">No gift links yet.</p>
            ) : gifts.map((g) => (
              <Card key={g.id} className="border-border/40 bg-card/60 backdrop-blur">
                <CardContent className="p-4 flex items-center gap-3 flex-wrap">
                  <div className="flex-1 min-w-[200px]">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-sm">/g/{g.slug}</span>
                      <Badge variant={g.status === "approved" ? "default" : "secondary"}>{g.status}</Badge>
                      <span className="text-xs text-muted-foreground flex items-center gap-1"><TrendingUp className="w-3 h-3" />{g.views} views</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 line-clamp-1">{g.payload?.message || "(image only)"}</div>
                  </div>
                  <div className="flex gap-2">
                    {g.status !== "approved" && <Button size="sm" onClick={() => updateGift(g.id, "approved")}><CheckCircle2 className="w-3.5 h-3.5 mr-1" />Approve</Button>}
                    {g.status !== "rejected" && <Button size="sm" variant="destructive" onClick={() => updateGift(g.id, "rejected")}><XCircle className="w-3.5 h-3.5 mr-1" />Reject</Button>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </motion.div>
  );
};

export default AIDashboard;
