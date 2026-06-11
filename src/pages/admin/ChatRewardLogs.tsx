import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Loader2, RefreshCw, History, Search } from "lucide-react";
import MobileLayout from "@/components/MobileLayout";

interface LogRow {
  id: string;
  user_id: string;
  amount: number;
  reason: string;
  message_preview: string | null;
  cooldown_remaining: number | null;
  country: string | null;
  created_at: string;
  profile?: { name: string | null; avatar_url: string | null } | null;
}

const REASON_COLORS: Record<string, string> = {
  ok: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  cooldown: "bg-amber-500/15 text-amber-600 border-amber-500/30",
  daily_cap: "bg-orange-500/15 text-orange-600 border-orange-500/30",
  vpn_required: "bg-sky-500/15 text-sky-600 border-sky-500/30",
  too_short: "bg-muted text-muted-foreground",
  duplicate: "bg-muted text-muted-foreground",
  disabled: "bg-muted text-muted-foreground",
  error: "bg-destructive/15 text-destructive border-destructive/30",
};

const REASONS = ["all", "ok", "cooldown", "daily_cap", "vpn_required", "too_short", "duplicate", "disabled", "error"];

const ChatRewardLogs = () => {
  const navigate = useNavigate();
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [reason, setReason] = useState("all");
  const [q, setQ] = useState("");

  const load = async () => {
    setLoading(true);
    let query = supabase
      .from("chat_reward_logs")
      .select("id,user_id,amount,reason,message_preview,cooldown_remaining,country,created_at")
      .order("created_at", { ascending: false })
      .limit(300);
    if (reason !== "all") query = query.eq("reason", reason);
    const { data } = await query;
    const rows = (data || []) as LogRow[];
    const ids = Array.from(new Set(rows.map((r) => r.user_id)));
    if (ids.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id,name,avatar_url")
        .in("id", ids);
      const map = new Map((profs || []).map((p: any) => [p.id, p]));
      rows.forEach((r) => (r.profile = map.get(r.user_id) || null));
    }
    setLogs(rows);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [reason]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return logs;
    return logs.filter(
      (r) =>
        r.profile?.name?.toLowerCase().includes(s) ||
        r.message_preview?.toLowerCase().includes(s) ||
        r.user_id.toLowerCase().includes(s)
    );
  }, [logs, q]);

  const stats = useMemo(() => {
    const total = logs.length;
    const ok = logs.filter((l) => l.reason === "ok").length;
    const coins = logs.reduce((s, l) => s + (l.amount || 0), 0);
    return { total, ok, coins };
  }, [logs]);

  return (
    <MobileLayout className="bg-background">
      <header className="bg-gradient-primary text-primary-foreground px-4 py-3 sticky top-0 z-40 shadow-md flex items-center gap-2">
        <button onClick={() => navigate("/admin")} className="p-2 -ml-2 rounded-full hover:bg-primary-foreground/10">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h1 className="font-display font-bold flex items-center gap-2">
            <History className="h-5 w-5" /> Chat Reward Logs
          </h1>
          <p className="text-[11px] opacity-80">Audit awardChatPoints attempts</p>
        </div>
        <button onClick={load} className="p-2 rounded-full hover:bg-primary-foreground/10">
          <RefreshCw className={`h-5 w-5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </header>

      <div className="p-4 space-y-3">
        <div className="grid grid-cols-3 gap-2">
          <Card><CardContent className="p-3 text-center">
            <p className="text-[10px] text-muted-foreground uppercase">Attempts</p>
            <p className="text-lg font-bold">{stats.total}</p>
          </CardContent></Card>
          <Card><CardContent className="p-3 text-center">
            <p className="text-[10px] text-muted-foreground uppercase">Awarded</p>
            <p className="text-lg font-bold text-emerald-600">{stats.ok}</p>
          </CardContent></Card>
          <Card><CardContent className="p-3 text-center">
            <p className="text-[10px] text-muted-foreground uppercase">Coins</p>
            <p className="text-lg font-bold text-primary">{stats.coins}</p>
          </CardContent></Card>
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search user / message" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <Select value={reason} onValueChange={setReason}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              {REASONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="py-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : filtered.length === 0 ? (
          <Card><CardContent className="py-10 text-center text-muted-foreground text-sm">No logs found.</CardContent></Card>
        ) : (
          <div className="space-y-2">
            {filtered.map((r) => (
              <Card key={r.id}>
                <CardContent className="p-3 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-sm truncate">{r.profile?.name || r.user_id.slice(0, 8)}</p>
                    <Badge className={`text-[10px] ${REASON_COLORS[r.reason] || ""}`} variant="outline">
                      {r.reason}
                    </Badge>
                  </div>
                  {r.message_preview && (
                    <p className="text-xs text-muted-foreground truncate">"{r.message_preview}"</p>
                  )}
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>
                      {r.amount > 0 ? <span className="text-emerald-600 font-semibold">+{r.amount} coin</span> : "—"}
                      {r.cooldown_remaining ? ` · ${r.cooldown_remaining}s cd` : ""}
                      {r.country ? ` · ${r.country}` : ""}
                    </span>
                    <span>{new Date(r.created_at).toLocaleString()}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </MobileLayout>
  );
};

export default ChatRewardLogs;
