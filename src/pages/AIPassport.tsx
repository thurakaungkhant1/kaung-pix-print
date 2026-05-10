import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Upload, Sparkles, Download, Loader2, X, Coins, IdCard, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import BottomNav from "@/components/BottomNav";
import { cn } from "@/lib/utils";

interface Preset {
  id: string;
  name: string;
  description: string | null;
  prompt: string;
}

const AIPassport = () => {
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [sourcePreview, setSourcePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [usedToday, setUsedToday] = useState(0);
  const [dailyLimit, setDailyLimit] = useState(5);
  const [photoCost, setPhotoCost] = useState(50);
  const [result, setResult] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: settings }, { data: today }, { data: list }] = await Promise.all([
        supabase
          .from("ai_usage_settings")
          .select("photo_cost_coins, daily_photo_limit")
          .limit(1)
          .maybeSingle(),
        (async () => {
          const start = new Date();
          start.setHours(0, 0, 0, 0);
          return supabase
            .from("ai_photo_generations")
            .select("id", { count: "exact" })
            .eq("user_id", user.id)
            .gte("created_at", start.toISOString());
        })(),
        supabase
          .from("passport_photo_prompts")
          .select("id, name, description, prompt")
          .eq("is_active", true)
          .order("display_order", { ascending: true }),
      ]);
      if (settings) {
        setPhotoCost(settings.photo_cost_coins);
        setDailyLimit(settings.daily_photo_limit);
      }
      setUsedToday(today?.length ?? 0);
      const presetList = (list as Preset[]) ?? [];
      setPresets(presetList);
      if (presetList.length > 0) setSelectedId(presetList[0].id);
    })();
  }, [user]);

  const handleFile = (f: File | null) => {
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) {
      toast.error("Image must be under 10MB");
      return;
    }
    setSourceFile(f);
    const reader = new FileReader();
    reader.onload = () => setSourcePreview(reader.result as string);
    reader.readAsDataURL(f);
  };

  const remaining = Math.max(0, dailyLimit - usedToday);
  const selected = presets.find((p) => p.id === selectedId);

  const generate = async () => {
    if (!sourceFile) {
      toast.error("Please upload your photo first");
      return;
    }
    if (!selected) {
      toast.error("Please select a passport style");
      return;
    }
    if (remaining === 0) {
      toast.error(`Daily limit reached (${dailyLimit}/day)`);
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      if (!user) throw new Error("Not signed in");
      const path = `${user.id}/passport-${Date.now()}-${sourceFile.name}`;
      const { error: upErr } = await supabase.storage
        .from("ai-uploads")
        .upload(path, sourceFile, { contentType: sourceFile.type });
      if (upErr) throw upErr;
      const { data: signed } = await supabase.storage
        .from("ai-uploads")
        .createSignedUrl(path, 600);

      const { data, error } = await supabase.functions.invoke("ai-generate-photo", {
        body: { prompt: selected.prompt, source_image_url: signed?.signedUrl },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setResult(data.result_image_url);
      setUsedToday(data.used_today);
      toast.success(`Passport photo ready! -${data.cost_coins} coins`);
    } catch (e: any) {
      toast.error(e.message ?? "Generation failed");
    } finally {
      setLoading(false);
    }
  };

  const download = async (url: string) => {
    try {
      const r = await fetch(url);
      const blob = await r.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `passport-photo-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      toast.error("Download failed");
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/40">
        <div className="flex items-center gap-3 px-4 h-14">
          <Link to="/ai" className="p-2 -ml-2 rounded-full hover:bg-accent">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2 flex-1">
            <IdCard className="w-5 h-5 text-emerald-500" />
            <h1 className="font-semibold">Passport Photo Maker</h1>
          </div>
          <div className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 font-medium">
            <Sparkles className="w-3 h-3" />
            {remaining}/{dailyLimit}
          </div>
        </div>
      </header>

      <div className="px-4 py-5 max-w-md mx-auto space-y-5">
        {/* Upload */}
        <div>
          <label className="text-sm font-medium mb-2 block">Your photo</label>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
          />
          {sourcePreview ? (
            <div className="relative rounded-xl overflow-hidden border border-border">
              <img src={sourcePreview} alt="source" className="w-full h-56 object-cover" />
              <button
                onClick={() => {
                  setSourceFile(null);
                  setSourcePreview(null);
                }}
                className="absolute top-2 right-2 p-1.5 rounded-full bg-background/80 backdrop-blur"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full h-40 rounded-xl border-2 border-dashed border-border hover:border-emerald-500/50 flex flex-col items-center justify-center gap-2 text-muted-foreground transition-colors"
            >
              <Upload className="w-7 h-7" />
              <span className="text-xs font-medium">Upload a clear front-facing photo</span>
              <span className="text-[10px] text-muted-foreground/70">JPG / PNG, up to 10MB</span>
            </button>
          )}
        </div>

        {/* Presets */}
        <div>
          <label className="text-sm font-medium mb-2 block">Choose a style</label>
          {presets.length === 0 ? (
            <div className="text-xs text-muted-foreground p-4 border border-dashed rounded-xl text-center">
              No styles available yet. Please check back soon.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {presets.map((p) => {
                const active = p.id === selectedId;
                return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedId(p.id)}
                    className={cn(
                      "relative text-left p-3 rounded-xl border transition-all",
                      active
                        ? "border-emerald-500 bg-emerald-500/10 shadow-md"
                        : "border-border bg-card/50 hover:border-emerald-500/40"
                    )}
                  >
                    {active && (
                      <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                        <Check className="w-3 h-3 text-white" />
                      </span>
                    )}
                    <p className="font-semibold text-xs leading-snug mb-1">{p.name}</p>
                    {p.description && (
                      <p className="text-[10px] text-muted-foreground line-clamp-2">{p.description}</p>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <Button
          onClick={generate}
          disabled={loading || !sourceFile || !selected || remaining === 0}
          className="w-full h-12 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-white font-semibold"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating passport photo...
            </>
          ) : (
            <>
              <IdCard className="w-4 h-4 mr-2" />
              Create Passport Photo
              <span className="ml-2 inline-flex items-center gap-1 text-xs opacity-90">
                <Coins className="w-3 h-3" /> {photoCost}
              </span>
            </>
          )}
        </Button>

        {result && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl overflow-hidden border border-border bg-card"
          >
            <img src={result} alt="passport" className="w-full" />
            <Button
              onClick={() => download(result)}
              variant="secondary"
              className="w-full rounded-none"
            >
              <Download className="w-4 h-4 mr-2" /> Download
            </Button>
          </motion.div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default AIPassport;
