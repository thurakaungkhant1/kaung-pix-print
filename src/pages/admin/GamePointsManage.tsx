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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft, Search, Gamepad2, Trophy, Users, TrendingUp,
  Edit, Loader2, BarChart3, Target, Settings, Save,
} from "lucide-react";

interface GameUser {
  id: string;
  name: string;
  email: string | null;
  game_points: number;
  avatar_url: string | null;
}

interface GameScore {
  id: string;
  user_id: string;
  game_name: string;
  score: number;
  points_earned: number;
  is_win: boolean;
  created_at: string;
  profiles?: { name: string };
}

const GamePointsManage = () => {
  const { isAdmin } = useAdminCheck({ redirectTo: "/", redirectOnFail: true });
  const { toast } = useToast();
  const navigate = useNavigate();
  const [users, setUsers] = useState<GameUser[]>([]);
  const [scores, setScores] = useState<GameScore[]>([]);
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

  useEffect(() => {
    if (isAdmin) {
      supabase.from("game_settings").select("*").order("updated_at", { ascending: false }).limit(1).maybeSingle()
        .then(({ data }) => { if (data) setSettings(data); });
    }
  }, [isAdmin]);

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
    };
    const { error } = await supabase.from("game_settings").update(payload).eq("id", settings.id);
    setSavingSettings(false);
    if (error) toast({ title: "Save failed", description: error.message, variant: "destructive" });
    else toast({ title: "✅ Settings saved", description: "Game points configuration updated" });
  };

  useEffect(() => {
    if (isAdmin) {
      loadData();
    }
  }, [isAdmin]);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([loadUsers(), loadScores(), loadStats()]);
    setLoading(false);
  };

  const loadUsers = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, name, email, game_points, avatar_url")
      .order("game_points", { ascending: false });
    if (data) setUsers(data);
  };

  const loadScores = async () => {
    const { data } = await supabase
      .from("game_scores")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (data) {
      const userIds = [...new Set(data.map(s => s.user_id))];
      const { data: profiles } = await supabase.from("profiles").select("id, name").in("id", userIds);
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      setScores(data.map(s => ({ ...s, profiles: profileMap.get(s.user_id) || { name: "Unknown" } })));
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

    setStats({
      totalPlayers: playersRes.count || 0,
      totalGamesPlayed: scoresRes.data?.length || 0,
      totalPointsAwarded,
      topGame,
    });
  };

  const handleEditPoints = async () => {
    if (!selectedUser || !pointsChange) return;
    setUpdating(true);
    const change = parseInt(pointsChange);
    if (isNaN(change) || change < 0) {
      toast({ title: "Invalid amount", variant: "destructive" });
      setUpdating(false);
      return;
    }

    let newPoints = selectedUser.game_points;
    if (operation === "add") newPoints += change;
    else if (operation === "subtract") newPoints = Math.max(0, newPoints - change);
    else newPoints = change;

    const { error } = await supabase.from("profiles").update({ game_points: newPoints }).eq("id", selectedUser.id);
    if (error) {
      toast({ title: "Error updating points", variant: "destructive" });
    } else {
      toast({ title: "Game points updated!", description: `${selectedUser.name}: ${newPoints} points` });
      setEditOpen(false);
      setPointsChange("");
      loadUsers();
    }
    setUpdating(false);
  };

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <MobileLayout>
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MobileLayout>
    );
  }

  return (
    <AnimatedPage>
      <MobileLayout>
        <div className="max-w-screen-xl mx-auto p-4 pb-24">
          <div className="flex items-center gap-3 mb-6">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin")} className="rounded-xl">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-display font-bold">Game Points Management</h1>
              <p className="text-xs text-muted-foreground">Manage user game points & view analytics</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {[
              { label: "Active Players", value: stats.totalPlayers, icon: Users, color: "text-primary" },
              { label: "Games Played", value: stats.totalGamesPlayed.toLocaleString(), icon: Gamepad2, color: "text-accent" },
              { label: "Points Awarded", value: stats.totalPointsAwarded.toLocaleString(), icon: TrendingUp, color: "text-green-500" },
              { label: "Top Game", value: stats.topGame, icon: Trophy, color: "text-amber-500" },
            ].map((s, i) => (
              <Card key={i} className="p-3 rounded-2xl border-border/50">
                <div className="flex items-center gap-2 mb-1">
                  <s.icon className={`h-4 w-4 ${s.color}`} />
                  <span className="text-[10px] text-muted-foreground">{s.label}</span>
                </div>
                <p className="text-lg font-bold truncate">{s.value}</p>
              </Card>
            ))}
          </div>

          <Tabs defaultValue="users">
            <TabsList className="grid w-full grid-cols-3 mb-4 h-11 rounded-xl">
              <TabsTrigger value="users" className="text-xs gap-1.5 rounded-lg">
                <Users className="h-3.5 w-3.5" /> Users
              </TabsTrigger>
              <TabsTrigger value="history" className="text-xs gap-1.5 rounded-lg">
                <BarChart3 className="h-3.5 w-3.5" /> History
              </TabsTrigger>
              <TabsTrigger value="settings" className="text-xs gap-1.5 rounded-lg">
                <Settings className="h-3.5 w-3.5" /> Settings
              </TabsTrigger>
            </TabsList>

            <TabsContent value="users">
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search users..." value={search} onChange={e => setSearch(e.target.value)}
                  className="pl-10 rounded-xl" />
              </div>

              <Card className="rounded-2xl border-border/50 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">User</TableHead>
                      <TableHead className="text-xs text-right">Game Points</TableHead>
                      <TableHead className="text-xs text-right w-20">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.slice(0, 50).map((u, i) => (
                      <TableRow key={u.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                              {i + 1}
                            </div>
                            <div>
                              <p className="text-sm font-medium truncate max-w-[120px]">{u.name}</p>
                              <p className="text-[10px] text-muted-foreground truncate max-w-[120px]">{u.email || "-"}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="secondary" className="font-mono">
                            {u.game_points.toLocaleString()}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline" className="h-8 w-8 p-0 rounded-lg"
                            onClick={() => { setSelectedUser(u); setEditOpen(true); setPointsChange(""); }}>
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </TabsContent>

            <TabsContent value="history">
              <Card className="rounded-2xl border-border/50 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Player</TableHead>
                      <TableHead className="text-xs">Game</TableHead>
                      <TableHead className="text-xs text-right">Score</TableHead>
                      <TableHead className="text-xs text-right">Points</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {scores.slice(0, 100).map(s => (
                      <TableRow key={s.id}>
                        <TableCell className="text-xs font-medium">{s.profiles?.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px]">{s.game_name}</Badge>
                        </TableCell>
                        <TableCell className="text-right text-xs">{s.score}</TableCell>
                        <TableCell className="text-right">
                          <span className={`text-xs font-bold ${s.is_win ? "text-green-500" : "text-muted-foreground"}`}>
                            +{s.points_earned}
                          </span>
                        </TableCell>
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
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2"><Settings className="h-4 w-4" /> Game Points Configuration</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {[
                      { key: "base_play_points", label: "Base play points", help: "Per game played" },
                      { key: "win_bonus_points", label: "Win bonus points", help: "Extra when player wins" },
                      { key: "high_score_bonus_points", label: "High score bonus", help: "Extra when score > threshold" },
                      { key: "high_score_threshold", label: "High score threshold", help: "Score required for bonus" },
                      { key: "daily_limit", label: "Daily earning cap", help: "Max points per day per user" },
                      { key: "cooldown_seconds", label: "Cooldown (seconds)", help: "Between plays of same game" },
                    ].map((f) => (
                      <div key={f.key} className="space-y-1.5">
                        <Label className="text-sm">{f.label}</Label>
                        <Input
                          type="number"
                          min={0}
                          value={settings[f.key] ?? 0}
                          onChange={(e) => setSettings({ ...settings, [f.key]: e.target.value })}
                          className="rounded-xl"
                        />
                        <p className="text-[11px] text-muted-foreground">{f.help}</p>
                      </div>
                    ))}
                    <Button onClick={saveSettings} disabled={savingSettings} className="w-full rounded-xl">
                      {savingSettings ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                      Save Settings
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Edit Dialog */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="rounded-2xl">
            <DialogHeader>
              <DialogTitle>Edit Game Points — {selectedUser?.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="text-center p-4 bg-muted/50 rounded-xl">
                <p className="text-sm text-muted-foreground">Current Points</p>
                <p className="text-3xl font-display font-bold text-primary">{selectedUser?.game_points.toLocaleString()}</p>
              </div>
              <div className="space-y-2">
                <Label>Operation</Label>
                <Select value={operation} onValueChange={(v: any) => setOperation(v)}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="add">Add Points</SelectItem>
                    <SelectItem value="subtract">Subtract Points</SelectItem>
                    <SelectItem value="set">Set Exact Amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Amount</Label>
                <Input type="number" value={pointsChange} onChange={e => setPointsChange(e.target.value)}
                  placeholder="Enter amount" className="rounded-xl" />
              </div>
              {pointsChange && (
                <div className="text-center p-3 bg-primary/5 rounded-xl border border-primary/20">
                  <p className="text-xs text-muted-foreground">New Balance</p>
                  <p className="text-xl font-bold text-primary">
                    {operation === "add" ? (selectedUser?.game_points || 0) + parseInt(pointsChange || "0") :
                     operation === "subtract" ? Math.max(0, (selectedUser?.game_points || 0) - parseInt(pointsChange || "0")) :
                     parseInt(pointsChange || "0")}
                  </p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditOpen(false)} className="rounded-xl">Cancel</Button>
              <Button onClick={handleEditPoints} disabled={updating || !pointsChange} className="rounded-xl">
                {updating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </MobileLayout>
    </AnimatedPage>
  );
};

export default GamePointsManage;
