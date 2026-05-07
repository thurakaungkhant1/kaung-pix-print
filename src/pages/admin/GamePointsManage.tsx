import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import MobileLayout from "@/components/MobileLayout";
import AnimatedPage from "@/components/animations/AnimatedPage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft, Search, Gamepad2, Trophy, Users, TrendingUp,
  Edit, Loader2, BarChart3, Settings, Save, Gift, Plus, Trash2, Coins,
} from "lucide-react";

interface GameUser { id: string; name: string; email: string | null; game_points: number; avatar_url: string | null; }
interface GameScore { id: string; user_id: string; game_name: string; score: number; points_earned: number; is_win: boolean; created_at: string; profiles?: { name: string }; }
interface RewardItem {
  id: string; name: string; description: string | null; emoji: string | null;
  cost_points: number; reward_type: string; reward_value: number;
  stock: number | null; is_active: boolean; display_order: number;
}
interface Redemption {
  id: string; user_id: string; reward_name: string; cost_points: number;
  reward_type: string; reward_value: number; status: string; created_at: string;
  profiles?: { name: string };
}

const REWARD_TYPES = [
  { value: "manual", label: "Manual delivery" },
  { value: "wallet_credit", label: "Wallet credit (MMK)" },
  { value: "shop_coins", label: "Shop coins" },
  { value: "premium_days", label: "Premium days" },
];

const GamePointsManage = () => {
  const { isAdmin } = useAdminCheck({ redirectTo: "/", redirectOnFail: true });
  const { toast } = useToast();
  const navigate = useNavigate();
  const [users, setUsers] = useState<GameUser[]>([]);
  const [scores, setScores] = useState<GameScore[]>([]);
  const [rewards, setRewards] = useState<RewardItem[]>([]);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<GameUser | null>(null);
  const [pointsChange, setPointsChange] = useState("");
  const [operation, setOperation] = useState<"add" | "subtract" | "set">("add");
  const [updating, setUpdating] = useState(false);
  const [stats, setStats] = useState({ totalPlayers: 0, totalGamesPlayed: 0, totalPointsAwarded: 0, topGame: "" });
  const [settings, setSettings] = useState<any>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [rewardOpen, setRewardOpen] = useState(false);
  const [editingReward, setEditingReward] = useState<Partial<RewardItem> | null>(null);
  const [savingReward, setSavingReward] = useState(false);

  useEffect(() => {
    if (isAdmin) {
      supabase.from("game_settings").select("*").order("updated_at", { ascending: false }).limit(1).maybeSingle()
        .then(({ data }) => { if (data) setSettings(data); });
      loadData();
    }
  }, [isAdmin]);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([loadUsers(), loadScores(), loadStats(), loadRewards(), loadRedemptions()]);
    setLoading(false);
  };

  const loadUsers = async () => {
    const { data } = await supabase.from("profiles").select("id, name, email, game_points, avatar_url").order("game_points", { ascending: false });
    if (data) setUsers(data);
  };

  const loadScores = async () => {
    const { data } = await supabase.from("game_scores").select("*").order("created_at", { ascending: false }).limit(200);
    if (data) {
      const userIds = [...new Set(data.map(s => s.user_id))];
      const { data: profiles } = await supabase.from("profiles").select("id, name").in("id", userIds);
      const map = new Map(profiles?.map(p => [p.id, p]) || []);
      setScores(data.map(s => ({ ...s, profiles: map.get(s.user_id) || { name: "Unknown" } })));
    }
  };

  const loadRewards = async () => {
    const { data } = await supabase.from("game_reward_items").select("*").order("display_order");
    if (data) setRewards(data as RewardItem[]);
  };

  const loadRedemptions = async () => {
    const { data } = await supabase.from("game_redemptions").select("*").order("created_at", { ascending: false }).limit(100);
    if (data) {
      const userIds = [...new Set(data.map(r => r.user_id))];
      const { data: profiles } = await supabase.from("profiles").select("id, name").in("id", userIds);
      const map = new Map(profiles?.map(p => [p.id, p]) || []);
      setRedemptions(data.map(r => ({ ...r, profiles: map.get(r.user_id) || { name: "Unknown" } })));
    }
  };

  const loadStats = async () => {
    const [playersRes, scoresRes] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }).gt("game_points", 0),
      supabase.from("game_scores").select("game_name, points_earned"),
    ]);
    const totalPointsAwarded = scoresRes.data?.reduce((s, r) => s + r.points_earned, 0) || 0;
    const gameCounts: Record<string, number> = {};
    scoresRes.data?.forEach(s => { gameCounts[s.game_name] = (gameCounts[s.game_name] || 0) + 1; });
    const topGame = Object.entries(gameCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A";
    setStats({ totalPlayers: playersRes.count || 0, totalGamesPlayed: scoresRes.data?.length || 0, totalPointsAwarded, topGame });
  };

  const saveSettings = async () => {
    if (!settings) return;
    setSavingSettings(true);
    const payload = {
      base_play_points: Number(settings.base_play_points),
      win_bonus_points: Number(settings.win_bonus_points),
      high_score_bonus_points: Number(settings.high_score_bonus_points),
      high_score_threshold: Number(settings.high_score_threshold),
      daily_limit: Number(settings.daily_limit),
      cooldown_seconds: Number(settings.cooldown_seconds),
      wallet_exchange_rate: Number(settings.wallet_exchange_rate),
    };
    const { error } = await supabase.from("game_settings").update(payload).eq("id", settings.id);
    setSavingSettings(false);
    if (error) toast({ title: "Save failed", description: error.message, variant: "destructive" });
    else toast({ title: "✅ Settings saved" });
  };

  const handleEditPoints = async () => {
    if (!selectedUser || !pointsChange) return;
    setUpdating(true);
    const change = parseInt(pointsChange);
    if (isNaN(change) || change < 0) { toast({ title: "Invalid amount", variant: "destructive" }); setUpdating(false); return; }
    let newPoints = selectedUser.game_points;
    if (operation === "add") newPoints += change;
    else if (operation === "subtract") newPoints = Math.max(0, newPoints - change);
    else newPoints = change;
    const { error } = await supabase.from("profiles").update({ game_points: newPoints }).eq("id", selectedUser.id);
    if (error) toast({ title: "Error updating points", variant: "destructive" });
    else { toast({ title: "Game points updated!" }); setEditOpen(false); setPointsChange(""); loadUsers(); }
    setUpdating(false);
  };

  const openNewReward = () => {
    setEditingReward({ name: "", description: "", emoji: "🎁", cost_points: 100, reward_type: "manual", reward_value: 0, stock: null, is_active: true, display_order: rewards.length });
    setRewardOpen(true);
  };

  const saveReward = async () => {
    if (!editingReward?.name || !editingReward.cost_points) { toast({ title: "Name & cost required", variant: "destructive" }); return; }
    setSavingReward(true);
    const payload = {
      name: editingReward.name!,
      description: editingReward.description || null,
      emoji: editingReward.emoji || "🎁",
      cost_points: Number(editingReward.cost_points),
      reward_type: editingReward.reward_type || "manual",
      reward_value: Number(editingReward.reward_value || 0),
      stock: editingReward.stock != null && editingReward.stock !== ("" as any) ? Number(editingReward.stock) : null,
      is_active: editingReward.is_active ?? true,
      display_order: Number(editingReward.display_order || 0),
    };
    const { error } = editingReward.id
      ? await supabase.from("game_reward_items").update(payload).eq("id", editingReward.id)
      : await supabase.from("game_reward_items").insert(payload);
    setSavingReward(false);
    if (error) toast({ title: "Save failed", description: error.message, variant: "destructive" });
    else { toast({ title: "✅ Reward saved" }); setRewardOpen(false); loadRewards(); }
  };

  const deleteReward = async (id: string) => {
    if (!confirm("Delete this reward?")) return;
    const { error } = await supabase.from("game_reward_items").delete().eq("id", id);
    if (error) toast({ title: "Delete failed", variant: "destructive" });
    else { toast({ title: "Deleted" }); loadRewards(); }
  };

  const updateRedemptionStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("game_redemptions").update({ status }).eq("id", id);
    if (error) toast({ title: "Update failed", variant: "destructive" });
    else { toast({ title: `Marked ${status}` }); loadRedemptions(); }
  };

  const filtered = users.filter(u => u.name.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase()));

  if (loading) {
    return <MobileLayout><div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></MobileLayout>;
  }

  return (
    <AnimatedPage>
      <MobileLayout>
        <div className="max-w-screen-xl mx-auto p-4 pb-24">
          <div className="flex items-center gap-3 mb-6">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin")} className="rounded-xl"><ArrowLeft className="h-5 w-5" /></Button>
            <div>
              <h1 className="text-xl font-display font-bold">Game Points Management</h1>
              <p className="text-xs text-muted-foreground">Users, rewards, settings & analytics</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {[
              { label: "Active Players", value: stats.totalPlayers, icon: Users, color: "text-primary" },
              { label: "Games Played", value: stats.totalGamesPlayed.toLocaleString(), icon: Gamepad2, color: "text-accent" },
              { label: "Points Awarded", value: stats.totalPointsAwarded.toLocaleString(), icon: TrendingUp, color: "text-green-500" },
              { label: "Top Game", value: stats.topGame, icon: Trophy, color: "text-amber-500" },
            ].map((s, i) => (
              <Card key={i} className="p-3 rounded-2xl border-border/50">
                <div className="flex items-center gap-2 mb-1"><s.icon className={`h-4 w-4 ${s.color}`} /><span className="text-[10px] text-muted-foreground">{s.label}</span></div>
                <p className="text-lg font-bold truncate">{s.value}</p>
              </Card>
            ))}
          </div>

          <Tabs defaultValue="users">
            <TabsList className="grid w-full grid-cols-5 mb-4 h-11 rounded-xl">
              <TabsTrigger value="users" className="text-xs gap-1.5 rounded-lg"><Users className="h-3.5 w-3.5" /> Users</TabsTrigger>
              <TabsTrigger value="rewards" className="text-xs gap-1.5 rounded-lg"><Gift className="h-3.5 w-3.5" /> Rewards</TabsTrigger>
              <TabsTrigger value="redemptions" className="text-xs gap-1.5 rounded-lg"><Coins className="h-3.5 w-3.5" /> Claims</TabsTrigger>
              <TabsTrigger value="history" className="text-xs gap-1.5 rounded-lg"><BarChart3 className="h-3.5 w-3.5" /> History</TabsTrigger>
              <TabsTrigger value="settings" className="text-xs gap-1.5 rounded-lg"><Settings className="h-3.5 w-3.5" /> Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="users">
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search users..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 rounded-xl" />
              </div>
              <Card className="rounded-2xl border-border/50 overflow-hidden">
                <Table>
                  <TableHeader><TableRow><TableHead className="text-xs">User</TableHead><TableHead className="text-xs text-right">Game Points</TableHead><TableHead className="text-xs text-right w-20">Action</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {filtered.slice(0, 50).map((u, i) => (
                      <TableRow key={u.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">{i + 1}</div>
                            <div><p className="text-sm font-medium truncate max-w-[120px]">{u.name}</p><p className="text-[10px] text-muted-foreground truncate max-w-[120px]">{u.email || "-"}</p></div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right"><Badge variant="secondary" className="font-mono">{u.game_points.toLocaleString()}</Badge></TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline" className="h-8 w-8 p-0 rounded-lg" onClick={() => { setSelectedUser(u); setEditOpen(true); setPointsChange(""); }}><Edit className="h-3.5 w-3.5" /></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </TabsContent>

            <TabsContent value="rewards">
              <div className="flex justify-between items-center mb-3">
                <p className="text-sm text-muted-foreground">{rewards.length} reward items</p>
                <Button size="sm" onClick={openNewReward} className="rounded-xl gap-1.5"><Plus className="h-4 w-4" /> New Reward</Button>
              </div>
              <div className="space-y-2">
                {rewards.map(r => (
                  <Card key={r.id} className="p-3 rounded-2xl border-border/50">
                    <div className="flex items-center gap-3">
                      <div className="text-3xl">{r.emoji}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-bold truncate">{r.name}</p>
                          {!r.is_active && <Badge variant="outline" className="text-[9px]">Inactive</Badge>}
                          <Badge variant="secondary" className="text-[9px]">{r.reward_type}</Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate">{r.description}</p>
                        <p className="text-[11px] mt-0.5"><span className="font-bold text-primary">{r.cost_points.toLocaleString()}</span> pts → {r.reward_value} {r.reward_type === "wallet_credit" ? "MMK" : r.reward_type === "shop_coins" ? "coins" : r.reward_type === "premium_days" ? "days" : ""}</p>
                      </div>
                      <div className="flex flex-col gap-1">
                        <Button size="icon" variant="outline" className="h-8 w-8 rounded-lg" onClick={() => { setEditingReward(r); setRewardOpen(true); }}><Edit className="h-3.5 w-3.5" /></Button>
                        <Button size="icon" variant="outline" className="h-8 w-8 rounded-lg text-destructive" onClick={() => deleteReward(r.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="redemptions">
              <Card className="rounded-2xl border-border/50 overflow-hidden">
                <Table>
                  <TableHeader><TableRow><TableHead className="text-xs">User</TableHead><TableHead className="text-xs">Reward</TableHead><TableHead className="text-xs">Status</TableHead><TableHead className="text-xs text-right">Action</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {redemptions.map(r => (
                      <TableRow key={r.id}>
                        <TableCell className="text-xs font-medium">{r.profiles?.name}</TableCell>
                        <TableCell className="text-xs"><div>{r.reward_name}</div><div className="text-[10px] text-muted-foreground">{r.cost_points} pts</div></TableCell>
                        <TableCell><Badge variant={r.status === "delivered" || r.status === "approved" ? "default" : r.status === "rejected" ? "destructive" : "secondary"} className="text-[9px]">{r.status}</Badge></TableCell>
                        <TableCell className="text-right">
                          {r.status === "pending" && (
                            <div className="flex gap-1 justify-end">
                              <Button size="sm" variant="outline" className="h-7 px-2 text-[10px] rounded-lg" onClick={() => updateRedemptionStatus(r.id, "delivered")}>Deliver</Button>
                              <Button size="sm" variant="outline" className="h-7 px-2 text-[10px] rounded-lg text-destructive" onClick={() => updateRedemptionStatus(r.id, "rejected")}>Reject</Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {redemptions.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-xs text-muted-foreground py-6">No redemptions yet</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </Card>
            </TabsContent>

            <TabsContent value="history">
              <Card className="rounded-2xl border-border/50 overflow-hidden">
                <Table>
                  <TableHeader><TableRow><TableHead className="text-xs">Player</TableHead><TableHead className="text-xs">Game</TableHead><TableHead className="text-xs text-right">Score</TableHead><TableHead className="text-xs text-right">Points</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {scores.slice(0, 100).map(s => (
                      <TableRow key={s.id}>
                        <TableCell className="text-xs font-medium">{s.profiles?.name}</TableCell>
                        <TableCell><Badge variant="outline" className="text-[10px]">{s.game_name}</Badge></TableCell>
                        <TableCell className="text-right text-xs">{s.score}</TableCell>
                        <TableCell className="text-right"><span className={`text-xs font-bold ${s.is_win ? "text-green-500" : "text-muted-foreground"}`}>+{s.points_earned}</span></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </TabsContent>

            <TabsContent value="settings">
              {!settings ? (
                <Card className="rounded-2xl"><CardContent className="p-8 text-center text-sm text-muted-foreground">Loading…</CardContent></Card>
              ) : (
                <Card className="rounded-2xl border-border/50">
                  <CardHeader><CardTitle className="text-base flex items-center gap-2"><Settings className="h-4 w-4" /> Game Points Configuration</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    {[
                      { key: "base_play_points", label: "Base play points", help: "Per game played" },
                      { key: "win_bonus_points", label: "Win bonus points", help: "Extra when player wins" },
                      { key: "high_score_bonus_points", label: "High score bonus", help: "Extra when score > threshold" },
                      { key: "high_score_threshold", label: "High score threshold", help: "Score required for bonus" },
                      { key: "daily_limit", label: "Daily earning cap", help: "Max points per day per user" },
                      { key: "cooldown_seconds", label: "Cooldown (seconds)", help: "Between plays of same game" },
                      { key: "wallet_exchange_rate", label: "Wallet exchange rate", help: "Game points needed per 1 MMK (e.g. 10 = 10 pts → 1 Ks)" },
                    ].map((f) => (
                      <div key={f.key} className="space-y-1.5">
                        <Label className="text-sm">{f.label}</Label>
                        <Input type="number" min={0} value={settings[f.key] ?? 0} onChange={(e) => setSettings({ ...settings, [f.key]: e.target.value })} className="rounded-xl" />
                        <p className="text-[11px] text-muted-foreground">{f.help}</p>
                      </div>
                    ))}
                    <Button onClick={saveSettings} disabled={savingSettings} className="w-full rounded-xl">
                      {savingSettings ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />} Save Settings
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Edit Points Dialog */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="rounded-2xl">
            <DialogHeader><DialogTitle>Edit Game Points — {selectedUser?.name}</DialogTitle></DialogHeader>
            <div className="space-y-4 py-2">
              <div className="text-center p-4 bg-muted/50 rounded-xl">
                <p className="text-sm text-muted-foreground">Current Points</p>
                <p className="text-3xl font-display font-bold text-primary">{selectedUser?.game_points.toLocaleString()}</p>
              </div>
              <div className="space-y-2"><Label>Operation</Label>
                <Select value={operation} onValueChange={(v: any) => setOperation(v)}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="add">Add Points</SelectItem><SelectItem value="subtract">Subtract Points</SelectItem><SelectItem value="set">Set Exact Amount</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Amount</Label><Input type="number" value={pointsChange} onChange={e => setPointsChange(e.target.value)} placeholder="Enter amount" className="rounded-xl" /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditOpen(false)} className="rounded-xl">Cancel</Button>
              <Button onClick={handleEditPoints} disabled={updating || !pointsChange} className="rounded-xl">{updating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reward CRUD Dialog */}
        <Dialog open={rewardOpen} onOpenChange={setRewardOpen}>
          <DialogContent className="rounded-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editingReward?.id ? "Edit Reward" : "New Reward"}</DialogTitle></DialogHeader>
            {editingReward && (
              <div className="space-y-3 py-2">
                <div className="grid grid-cols-[80px_1fr] gap-2">
                  <div><Label className="text-xs">Emoji</Label><Input value={editingReward.emoji || ""} onChange={e => setEditingReward({ ...editingReward, emoji: e.target.value })} className="rounded-xl text-center" /></div>
                  <div><Label className="text-xs">Name</Label><Input value={editingReward.name || ""} onChange={e => setEditingReward({ ...editingReward, name: e.target.value })} className="rounded-xl" /></div>
                </div>
                <div><Label className="text-xs">Description</Label><Textarea value={editingReward.description || ""} onChange={e => setEditingReward({ ...editingReward, description: e.target.value })} className="rounded-xl" rows={2} /></div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label className="text-xs">Cost (game points)</Label><Input type="number" value={editingReward.cost_points || ""} onChange={e => setEditingReward({ ...editingReward, cost_points: Number(e.target.value) })} className="rounded-xl" /></div>
                  <div><Label className="text-xs">Display order</Label><Input type="number" value={editingReward.display_order ?? 0} onChange={e => setEditingReward({ ...editingReward, display_order: Number(e.target.value) })} className="rounded-xl" /></div>
                </div>
                <div><Label className="text-xs">Reward type</Label>
                  <Select value={editingReward.reward_type || "manual"} onValueChange={v => setEditingReward({ ...editingReward, reward_type: v })}>
                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>{REWARD_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label className="text-xs">Reward value</Label><Input type="number" value={editingReward.reward_value ?? 0} onChange={e => setEditingReward({ ...editingReward, reward_value: Number(e.target.value) })} className="rounded-xl" /><p className="text-[10px] text-muted-foreground mt-1">MMK / coins / days</p></div>
                  <div><Label className="text-xs">Stock (optional)</Label><Input type="number" value={editingReward.stock ?? ""} onChange={e => setEditingReward({ ...editingReward, stock: e.target.value === "" ? null : Number(e.target.value) })} className="rounded-xl" placeholder="Unlimited" /></div>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50"><Label className="text-sm">Active</Label><Switch checked={editingReward.is_active ?? true} onCheckedChange={v => setEditingReward({ ...editingReward, is_active: v })} /></div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setRewardOpen(false)} className="rounded-xl">Cancel</Button>
              <Button onClick={saveReward} disabled={savingReward} className="rounded-xl">{savingReward ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </MobileLayout>
    </AnimatedPage>
  );
};

export default GamePointsManage;
