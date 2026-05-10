import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Sparkles, Image as ImageIcon, Heart, Gift, CheckCircle2, XCircle, Coins, TrendingUp, Calendar, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const AIDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ photosToday: 0, photosTotal: 0, dailyLimit: 5, photoCost: 50, pendingInv: 0, pendingGifts: 0, totalInvitations: 0, totalGifts: 0, invitationPrice: 1000 });
  const [invitations, setInvitations] = useState<any[]>([]);
  const [gifts, setGifts] = useState<any[]>([]);

  const load = async () => {
    setLoading(true);
    const start = new Date(); start.setUTCHours(0, 0, 0, 0);
    const [{ data: settings }, photoToday, photoTotal, invs, gfts] = await Promise.all([
      supabase.from("ai_usage_settings").select("*").limit(1).maybeSingle(),
      supabase.from("ai_photo_generations").select("id", { count: "exact", head: true }).gte("created_at", start.toISOString()),
      supabase.from("ai_photo_generations").select("id", { count: "exact", head: true }),
      supabase.from("ai_invitations").select("*").order("created_at", { ascending: false }).limit(50),
      supabase.from("ai_gift_links").select("*").order("created_at", { ascending: false }).limit(50),
    ]);
    const invList = invs.data ?? []; const giftList = gfts.data ?? [];
    setInvitations(invList); setGifts(giftList);
    setStats({
      photosToday: photoToday.count ?? 0,
      photosTotal: photoTotal.count ?? 0,
      dailyLimit: settings?.daily_photo_limit ?? 5,
      photoCost: settings?.photo_cost_coins ?? 50,
      invitationPrice: Number(settings?.invitation_price_mmk ?? 1000),
      pendingInv: invList.filter((i: any) => i.status === "pending" || !i.paid).length,
      pendingGifts: giftList.filter((g: any) => g.status === "pending").length,
      totalInvitations: invList.length,
      totalGifts: giftList.length,
    });
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

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
    { label: "Photos Today", value: `${stats.photosToday}`, sub: `Limit ${stats.dailyLimit}/user`, icon: ImageIcon, gradient: "from-purple-500 to-pink-500" },
    { label: "Total AI Photos", value: stats.photosTotal.toLocaleString(), sub: `${stats.photoCost} coins / photo`, icon: Sparkles, gradient: "from-fuchsia-500 to-rose-500" },
    { label: "Pending Invitations", value: `${stats.pendingInv}`, sub: `${stats.invitationPrice.toLocaleString()} MMK each`, icon: Heart, gradient: "from-rose-500 to-orange-400" },
    { label: "Pending Gift Links", value: `${stats.pendingGifts}`, sub: `${stats.totalGifts} total`, icon: Gift, gradient: "from-blue-500 to-indigo-500" },
  ];

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

        <Tabs defaultValue="invitations">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="invitations">Invitations ({invitations.length})</TabsTrigger>
            <TabsTrigger value="gifts">Gift Links ({gifts.length})</TabsTrigger>
          </TabsList>

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
