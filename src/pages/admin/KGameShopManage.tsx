import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Cloud, Loader2, CheckCircle2, XCircle } from "lucide-react";
import MobileLayout from "@/components/MobileLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useFeatureFlag } from "@/hooks/useFeatureFlag";
import { KGAMESHOP_FLAG, KGAMESHOP_MERGE_FLAG } from "@/hooks/useGameCatalog";
import { supabase } from "@/integrations/supabase/client";

const KGameShopManage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { enabled: kgameshopOn, setFlag: setKgameshopFlag, loading } = useFeatureFlag(KGAMESHOP_FLAG, false);
  const { enabled: mergeOn, setFlag: setMergeFlag } = useFeatureFlag(KGAMESHOP_MERGE_FLAG, true);
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  const runTest = async () => {
    setTesting(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("kgameshop-games");
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "KGameShop request failed");
      setResult({ ok: true, message: `Connected. ${(data.games || []).length} games received.` });
    } catch (e: any) {
      setResult({ ok: false, message: e?.message || "Could not reach KGameShop" });
    } finally {
      setTesting(false);
    }
  };

  const apply = async (setter: typeof setKgameshopFlag, value: boolean, label: string) => {
    const err = await setter(value, label);
    toast({
      title: err ? "Update failed" : "Saved",
      description: err ? err.message : "Game Shop updated for all users.",
      variant: err ? "destructive" : undefined,
    });
  };

  return (
    <MobileLayout className="pb-24">
      <header className="bg-gradient-primary text-primary-foreground p-4 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/admin")} aria-label="Back">
            <ArrowLeft className="h-6 w-6" />
          </button>
          <Cloud className="h-6 w-6" />
          <div className="flex-1">
            <h1 className="text-lg font-bold leading-tight">KGameShop API</h1>
            <p className="text-xs opacity-80">External game list settings</p>
          </div>
        </div>
      </header>

      <div className="max-w-screen-md mx-auto p-4 space-y-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex-1">
              <p className="text-sm font-semibold leading-none">Use KGameShop Game List</p>
              <p className="text-[11px] text-muted-foreground mt-1">
                {kgameshopOn
                  ? "Games from the KGameShop API are shown in the Game Shop."
                  : "Only your manually added games are shown."}
              </p>
            </div>
            <Switch
              checked={kgameshopOn}
              disabled={loading}
              onCheckedChange={(v) => apply(setKgameshopFlag, v, "Use KGameShop Game List")}
              aria-label="Toggle KGameShop game list"
            />
          </CardContent>
        </Card>

        <Card className={kgameshopOn ? "" : "opacity-60"}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex-1">
              <p className="text-sm font-semibold leading-none">Keep my manual games visible</p>
              <p className="text-[11px] text-muted-foreground mt-1">
                Show your own games together with the KGameShop games instead of replacing them.
              </p>
            </div>
            <Switch
              checked={mergeOn}
              disabled={!kgameshopOn}
              onCheckedChange={(v) => apply(setMergeFlag as any, v, "Keep manual games with KGameShop")}
              aria-label="Toggle merging manual games"
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-3">
            <div>
              <p className="text-sm font-semibold leading-none">Connection test</p>
              <p className="text-[11px] text-muted-foreground mt-1">
                Check whether KGameShop is reachable from the server right now.
              </p>
            </div>
            <Button onClick={runTest} disabled={testing} className="w-full gap-2">
              {testing && <Loader2 className="h-4 w-4 animate-spin" />}
              {testing ? "Testing..." : "Test connection"}
            </Button>
            {result && (
              <div
                className={`flex items-start gap-2 rounded-lg p-3 text-xs ${
                  result.ok ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"
                }`}
              >
                {result.ok ? (
                  <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
                ) : (
                  <XCircle className="h-4 w-4 mt-0.5 shrink-0" />
                )}
                <span className="break-words">{result.message}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Button variant="outline" className="w-full" onClick={() => navigate("/admin/game-catalog")}>
          Manage my own games
        </Button>
      </div>
    </MobileLayout>
  );
};

export default KGameShopManage;
