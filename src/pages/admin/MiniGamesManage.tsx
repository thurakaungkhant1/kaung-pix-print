import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { useToast } from "@/hooks/use-toast";
import MobileLayout from "@/components/MobileLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Gamepad2, Loader2, Search, Save, RotateCcw } from "lucide-react";

// Master list — must match src/pages/GamesPortal.tsx GAMES ids
const GAME_CATALOG: { id: string; name: string; emoji: string; tag: string; defaultPoints: number }[] = [
  { id: "tic-tac-toe", name: "Tic Tac Toe", emoji: "🎯", tag: "Popular", defaultPoints: 15 },
  { id: "snake", name: "Snake", emoji: "🐍", tag: "Classic", defaultPoints: 15 },
  { id: "memory", name: "Memory Match", emoji: "🧠", tag: "Brain", defaultPoints: 15 },
  { id: "2048", name: "2048", emoji: "🧮", tag: "Puzzle", defaultPoints: 20 },
  { id: "click-speed", name: "Click Speed", emoji: "👆", tag: "Speed", defaultPoints: 10 },
  { id: "whack-a-mole", name: "Whack-a-Mole", emoji: "🐹", tag: "Action", defaultPoints: 15 },
  { id: "reaction", name: "Reaction Time", emoji: "⚡", tag: "Speed", defaultPoints: 10 },
  { id: "quiz", name: "Myanmar Quiz", emoji: "❓", tag: "Quiz", defaultPoints: 20 },
  { id: "flappy", name: "Flappy Bird", emoji: "🐦", tag: "Arcade", defaultPoints: 20 },
  { id: "car-dodge", name: "Car Dodge", emoji: "🏎️", tag: "Arcade", defaultPoints: 20 },
  { id: "color-match", name: "Color Match", emoji: "🎨", tag: "Brain", defaultPoints: 15 },
  { id: "word-scramble", name: "Word Scramble", emoji: "🔤", tag: "Word", defaultPoints: 15 },
  { id: "math", name: "Math Challenge", emoji: "➕", tag: "Brain", defaultPoints: 15 },
  { id: "simon", name: "Simon Says", emoji: "🔴", tag: "Memory", defaultPoints: 15 },
  { id: "bubble-pop", name: "Bubble Pop Glos", emoji: "🫧", tag: "Action", defaultPoints: 15 },
  { id: "typing", name: "Typing Race", emoji: "⌨️", tag: "Speed", defaultPoints: 15 },
  { id: "number-guess", name: "Number Guess", emoji: "🔢", tag: "Logic", defaultPoints: 10 },
  { id: "rps", name: "Rock Paper Scissors", emoji: "✂️", tag: "Classic", defaultPoints: 10 },
  { id: "pattern", name: "Pattern Recall", emoji: "🧩", tag: "Memory", defaultPoints: 15 },
  { id: "coin-flip", name: "Coin Flip", emoji: "🪙", tag: "Luck", defaultPoints: 10 },
  { id: "emoji-match", name: "Emoji Match", emoji: "😀", tag: "Speed", defaultPoints: 15 },
  { id: "target-shoot", name: "Target Shoot", emoji: "🎯", tag: "Action", defaultPoints: 15 },
  { id: "flag-quiz", name: "Flag Quiz", emoji: "🏳️", tag: "Quiz", defaultPoints: 20 },
  { id: "piano-tiles", name: "Piano Tiles", emoji: "🎹", tag: "Rhythm", defaultPoints: 15 },
  { id: "fruit-catch", name: "Fruit Catch", emoji: "🧺", tag: "Arcade", defaultPoints: 15 },
  { id: "hilo", name: "Hi-Lo Cards", emoji: "🃏", tag: "Luck", defaultPoints: 10 },
  { id: "maze", name: "Maze Runner", emoji: "🏃", tag: "Puzzle", defaultPoints: 20 },
  { id: "jump", name: "Jump Runner", emoji: "🦘", tag: "Arcade", defaultPoints: 15 },
  { id: "spot-diff", name: "Spot Difference", emoji: "🔍", tag: "Brain", defaultPoints: 15 },
  { id: "tower", name: "Tower Stack", emoji: "🏗️", tag: "Arcade", defaultPoints: 15 },
];

interface Row {
  game_id: string;
  is_active: boolean;
  points_override: number | null;
}

const MiniGamesManage = () => {
  const { isAdmin, isLoading: adminLoading } = useAdminCheck({ redirectTo: "/", redirectOnFail: true });
  const { toast } = useToast();
  const navigate = useNavigate();
  const [rows, setRows] = useState<Record<string, Row>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin]);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("mini_game_settings").select("*");
    const map: Record<string, Row> = {};
    GAME_CATALOG.forEach((g) => {
      map[g.id] = { game_id: g.id, is_active: true, points_override: null };
    });
    (data || []).forEach((r: any) => {
      map[r.game_id] = {
        game_id: r.game_id,
        is_active: r.is_active,
        points_override: r.points_override,
      };
    });
    setRows(map);
    setLoading(false);
  };

  const saveRow = async (gameId: string, patch: Partial<Row>) => {
    setSavingId(gameId);
    const next = { ...rows[gameId], ...patch };
    setRows((p) => ({ ...p, [gameId]: next }));
    const { error } = await supabase
      .from("mini_game_settings")
      .upsert(
        {
          game_id: gameId,
          is_active: next.is_active,
          points_override: next.points_override,
        },
        { onConflict: "game_id" }
      );
    setSavingId(null);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
      load();
    }
  };

  const resetRow = async (gameId: string) => {
    await saveRow(gameId, { is_active: true, points_override: null });
    toast({ title: "Reset", description: `${gameId} restored to defaults` });
  };

  const bulkSet = async (active: boolean) => {
    const payload = GAME_CATALOG.map((g) => ({
      game_id: g.id,
      is_active: active,
      points_override: rows[g.id]?.points_override ?? null,
    }));
    const { error } = await supabase
      .from("mini_game_settings")
      .upsert(payload, { onConflict: "game_id" });
    if (error) {
      toast({ title: "Bulk update failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: active ? "All enabled" : "All disabled" });
      load();
    }
  };

  const filtered = useMemo(
    () =>
      GAME_CATALOG.filter(
        (g) =>
          g.name.toLowerCase().includes(search.toLowerCase()) ||
          g.tag.toLowerCase().includes(search.toLowerCase())
      ),
    [search]
  );

  const activeCount = Object.values(rows).filter((r) => r.is_active).length;

  if (adminLoading || loading) {
    return (
      <MobileLayout className="pb-20">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout className="pb-20">
      <header className="bg-gradient-primary text-primary-foreground p-4 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/admin")}>
            <ArrowLeft className="h-6 w-6" />
          </button>
          <Gamepad2 className="h-6 w-6" />
          <div className="flex-1">
            <h1 className="text-lg font-bold leading-tight">Mini Games</h1>
            <p className="text-xs opacity-80">{activeCount} of {GAME_CATALOG.length} active</p>
          </div>
        </div>
      </header>

      <div className="max-w-screen-md mx-auto p-4 space-y-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search games..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="flex-1" onClick={() => bulkSet(true)}>
            Enable all
          </Button>
          <Button size="sm" variant="outline" className="flex-1" onClick={() => bulkSet(false)}>
            Disable all
          </Button>
        </div>

        <div className="space-y-2">
          {filtered.map((g) => {
            const row = rows[g.id];
            const overrideVal = row?.points_override;
            const points = overrideVal ?? g.defaultPoints;
            return (
              <Card key={g.id} className={!row?.is_active ? "opacity-60" : ""}>
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">{g.emoji}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-sm truncate">{g.name}</h3>
                        <Badge variant="outline" className="text-[10px]">{g.tag}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {points} pts {overrideVal != null && <span className="text-primary">(custom)</span>}
                      </p>
                    </div>
                    <Switch
                      checked={row?.is_active ?? true}
                      onCheckedChange={(v) => saveRow(g.id, { is_active: v })}
                      disabled={savingId === g.id}
                    />
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <Input
                      type="number"
                      min={0}
                      placeholder={`Default ${g.defaultPoints}`}
                      value={overrideVal ?? ""}
                      onChange={(e) => {
                        const v = e.target.value;
                        setRows((p) => ({
                          ...p,
                          [g.id]: { ...p[g.id], points_override: v === "" ? null : Number(v) },
                        }));
                      }}
                      className="h-8 text-xs"
                    />
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-8"
                      onClick={() => saveRow(g.id, { points_override: rows[g.id].points_override })}
                      disabled={savingId === g.id}
                    >
                      {savingId === g.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8"
                      onClick={() => resetRow(g.id)}
                      title="Reset to default"
                    >
                      <RotateCcw className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </MobileLayout>
  );
};

export default MiniGamesManage;
