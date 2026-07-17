import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArrowLeft, Trophy, Gift, Coins, Loader2, Users, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Row {
  user_id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  referral_count: number;
  points: number;
  game_points: number;
  created_at: string;
}

const TopReferrersManage = () => {
  const navigate = useNavigate();
  const { isLoading: authLoading } = useAdminCheck();
  const { toast } = useToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  const [selected, setSelected] = useState<Row | null>(null);
  const [amount, setAmount] = useState("50");
  const [note, setNote] = useState("");
  const [granting, setGranting] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("get_top_referrers", { limit_count: 100 });
    if (error) {
      toast({ title: "Load failed", description: error.message, variant: "destructive" });
      setRows([]);
    } else {
      setRows((data || []) as any);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!authLoading) load();
  }, [authLoading]);

  const handleGrant = async () => {
    if (!selected) return;
    const amt = parseInt(amount, 10);
    if (!Number.isFinite(amt) || amt === 0) {
      toast({ title: "Invalid amount", variant: "destructive" });
      return;
    }
    setGranting(true);
    const { error } = await supabase.rpc("admin_grant_coin_bonus", {
      target_user_id: selected.user_id,
      bonus_amount: amt,
      note: note.trim() || null,
    });
    setGranting(false);
    if (error) {
      toast({ title: "Grant failed", description: error.message, variant: "destructive" });
    } else {
      toast({
        title: "Bonus granted",
        description: `${amt > 0 ? "+" : ""}${amt} coins → ${selected.name}`,
      });
      setSelected(null);
      setNote("");
      setAmount("50");
      load();
    }
  };

  const filtered = rows.filter(
    (r) =>
      !query.trim() ||
      r.name?.toLowerCase().includes(query.toLowerCase()) ||
      r.email?.toLowerCase().includes(query.toLowerCase())
  );

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2 flex-1">
            <Trophy className="h-5 w-5 text-amber-500" />
            <h1 className="text-lg font-bold">Top Referrers</h1>
          </div>
          <Badge variant="secondary">{filtered.length} users</Badge>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-4 space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Leaderboard
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">
                No referrers found.
              </div>
            ) : (
              <div className="space-y-2">
                {filtered.map((r, i) => (
                  <div
                    key={r.user_id}
                    className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:shadow-sm transition-all"
                  >
                    <div className="w-8 text-center font-bold text-muted-foreground shrink-0">
                      #{i + 1}
                    </div>
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={r.avatar_url ?? undefined} />
                      <AvatarFallback>
                        {r.name?.charAt(0)?.toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{r.name || "Unnamed"}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{r.email}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                        <Users className="h-3 w-3 mr-1" />
                        {r.referral_count} refs
                      </Badge>
                      <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <Coins className="h-3 w-3 text-amber-500" />
                        <span className="tabular-nums">
                          {new Intl.NumberFormat("en-US").format(
                            (r.points || 0) + (r.game_points || 0)
                          )}
                        </span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelected(r);
                        setAmount("50");
                        setNote(`Referral bonus (${r.referral_count} referrals)`);
                      }}
                    >
                      <Gift className="h-4 w-4 mr-1" />
                      Bonus
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Grant Bonus Coins</DialogTitle>
            <DialogDescription>
              {selected?.name} — currently{" "}
              {new Intl.NumberFormat("en-US").format(
                (selected?.points || 0) + (selected?.game_points || 0)
              )}{" "}
              coins ({selected?.referral_count} referrals)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label htmlFor="bonus-amount">Amount (positive = add, negative = subtract)</Label>
              <Input
                id="bonus-amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="50"
              />
            </div>
            <div>
              <Label htmlFor="bonus-note">Note (optional)</Label>
              <Input
                id="bonus-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Referral bonus"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSelected(null)} disabled={granting}>
              Cancel
            </Button>
            <Button onClick={handleGrant} disabled={granting}>
              {granting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Granting…
                </>
              ) : (
                <>
                  <Gift className="h-4 w-4 mr-2" />
                  Grant Bonus
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TopReferrersManage;
