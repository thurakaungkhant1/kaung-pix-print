import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Upload, Sparkles, Download, Loader2, X, AlertCircle, RotateCw, Crown, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import BottomNav from "@/components/BottomNav";
import { addLogoWatermark } from "@/lib/aiPhotoWatermark";

interface Generation {
  id: string;
  prompt: string;
  result_image_url: string | null;
  created_at: string;
}

interface AIStyle {
  id: string;
  key: string;
  label: string;
  tier: "free" | "premium";
  display_order: number;
}

const AIPhoto = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [prompt, setPrompt] = useState("");
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [sourcePreview, setSourcePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<Generation[]>([]);
  const [latest, setLatest] = useState<string | null>(null);
  const [latestRaw, setLatestRaw] = useState<string | null>(null);
  const [latestIsPremium, setLatestIsPremium] = useState(false);
  const [watermarkFailed, setWatermarkFailed] = useState(false);
  const [retryingWm, setRetryingWm] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Credits / premium / styles state
  const [isPremium, setIsPremium] = useState(false);
  const [dailyCredits, setDailyCredits] = useState<number | null>(null);
  const [premiumPack, setPremiumPack] = useState(0);
  const [styles, setStyles] = useState<AIStyle[]>([]);
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState<string>("");

  useEffect(() => {
    const prefill = sessionStorage.getItem("ai_prefill_prompt");
    if (prefill) {
      setPrompt(prefill);
      sessionStorage.removeItem("ai_prefill_prompt");
    }
  }, []);

  // Load styles
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("ai_styles")
        .select("id, key, label, tier, display_order")
        .eq("is_active", true)
        .order("display_order", { ascending: true });
      if (data) setStyles(data as AIStyle[]);
    })();
  }, []);

  // Load profile + premium + history
  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: prof }, { data: prem }, { data: hist }] = await Promise.all([
        supabase
          .from("profiles")
          .select("daily_ai_credits, premium_ai_credits")
          .eq("id", user.id)
          .maybeSingle(),
        supabase
          .from("premium_memberships")
          .select("is_active, expires_at")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("ai_photo_generations")
          .select("id, prompt, result_image_url, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(20),
      ]);

      const active = !!(prem?.is_active && prem.expires_at && new Date(prem.expires_at) > new Date());
      setIsPremium(active);
      setDailyCredits(prof?.daily_ai_credits ?? 5);
      setPremiumPack(prof?.premium_ai_credits ?? 0);

      const list = hist ?? [];
      setHistory(list);
      // Skip watermark for premium users on history thumbnails too
      if (!active) {
        list.forEach(async (g) => {
          if (!g.result_image_url) return;
          try {
            const wm = await addLogoWatermark(g.result_image_url);
            setHistory((curr) => {
              const next = [...curr];
              const i = next.findIndex((x) => x.id === g.id);
              if (i >= 0) next[i] = { ...next[i], result_image_url: wm };
              return next;
            });
          } catch (e) {
            console.warn("history watermark failed", e);
          }
        });
      }
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

  const showUpgrade = (reason: string) => {
    setUpgradeReason(reason);
    setUpgradeOpen(true);
  };

  const pickStyle = (s: AIStyle) => {
    if (s.tier === "premium" && !isPremium) {
      showUpgrade(`"${s.label}" style ကို Premium user တွေသာ သုံးနိုင်ပါတယ်။`);
      return;
    }
    setSelectedStyle(selectedStyle === s.key ? null : s.key);
  };

  const runGenerate = async (overridePrompt?: string) => {
    const finalPrompt = (overridePrompt ?? prompt).trim();
    if (!finalPrompt) {
      setErrorMsg("Please enter a prompt before generating.");
      toast.error("Prompt is required");
      return;
    }
    if (!isPremium && dailyCredits !== null && dailyCredits <= 0) {
      showUpgrade("Daily limit reached. Upgrade to Premium to continue generating.");
      return;
    }
    setErrorMsg(null);
    setLoading(true);
    setLatest(null);
    try {
      let sourceUrl: string | undefined;
      if (sourceFile && user) {
        const safeName = sourceFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `${user.id}/source-${Date.now()}-${safeName}`;
        const { error: upErr } = await supabase.storage
          .from("ai-uploads")
          .upload(path, sourceFile, { contentType: sourceFile.type });
        if (upErr) throw upErr;
        const { data: signed } = await supabase.storage
          .from("ai-uploads")
          .createSignedUrl(path, 600);
        sourceUrl = signed?.signedUrl;
      }

      const { data, error } = await supabase.functions.invoke("ai-generate-photo", {
        body: { prompt: finalPrompt, source_image_url: sourceUrl, style_key: selectedStyle },
      });
      if (error) {
        let msg = error.message ?? "Generation failed";
        let code: string | undefined;
        try {
          const ctx: Response | undefined = (error as any).context;
          if (ctx) {
            const j = await ctx.clone().json();
            if (j?.error) msg = j.error;
            if (j?.code) code = j.code;
          }
        } catch {}
        if (code === "FREE_LIMIT_REACHED" || code === "PREMIUM_REQUIRED") {
          showUpgrade(msg);
          return;
        }
        throw new Error(msg);
      }
      if (data?.error) throw new Error(data.error);
      if (!data?.result_image_url) throw new Error("No image was returned. Please try again.");

      // Update credit display from server response
      if (data.credits) {
        setDailyCredits(data.credits.daily ?? dailyCredits);
        setPremiumPack(data.credits.premium_pack ?? premiumPack);
      }

      const rawUrl = data.result_image_url as string;
      const skipWm = !!data.skip_watermark;
      setLatestRaw(rawUrl);
      setLatestIsPremium(skipWm);

      let displayUrl = rawUrl;
      let wmOk = true;
      if (!skipWm) {
        try {
          displayUrl = await addLogoWatermark(rawUrl);
        } catch (wmErr) {
          wmOk = false;
          console.warn("Watermark failed", wmErr);
          toast.error("Watermark မထည့်နိုင်ပါ — ပြန်စမ်းနိုင်ပါတယ်");
        }
      }
      setWatermarkFailed(!wmOk);
      setLatest(displayUrl);
      setHistory((h) => [{ ...data.generation, result_image_url: displayUrl }, ...h]);
      if (wmOk) toast.success("Image generated!");

      if (!overridePrompt) {
        setPrompt("");
        setSourceFile(null);
        setSourcePreview(null);
      }
    } catch (e: any) {
      const msg = e.message ?? "Generation failed";
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const generate = () => runGenerate();

  const retryWatermark = async () => {
    if (!latestRaw) return;
    setRetryingWm(true);
    try {
      const wm = await addLogoWatermark(latestRaw);
      setLatest(wm);
      setWatermarkFailed(false);
      setHistory((h) => h.map((x, i) => (i === 0 ? { ...x, result_image_url: wm } : x)));
      toast.success("Watermark ထည့်ပြီးပါပြီ");
    } catch {
      toast.error("Watermark ထပ်မအောင်မြင်ပါ — ပြန်စမ်းပါ");
    } finally {
      setRetryingWm(false);
    }
  };

  const regenerate = (g: Generation) => {
    setPrompt(g.prompt);
    setSourceFile(null);
    setSourcePreview(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
    setTimeout(() => runGenerate(g.prompt), 200);
  };

  const download = async (url: string) => {
    try {
      const r = await fetch(url);
      const blob = await r.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `ai-photo-${Date.now()}.png`;
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
          <h1 className="font-semibold flex-1">AI Photo Generator</h1>
          {isPremium ? (
            <div className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-white font-semibold">
              <Crown className="w-3 h-3" />
              Premium
            </div>
          ) : (
            <div className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary font-medium">
              <Zap className="w-3 h-3" />
              {dailyCredits ?? 5}/5 today
            </div>
          )}
        </div>
      </header>

      <div className="px-4 py-5 max-w-md mx-auto space-y-5">
        {/* Credits panel */}
        <div className="rounded-xl border border-border bg-card p-3 grid grid-cols-2 gap-3 text-center">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Free credits</div>
            <div className="text-lg font-bold">{dailyCredits ?? "—"}</div>
            <div className="text-[10px] text-muted-foreground">resets daily</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Premium pack</div>
            <div className="text-lg font-bold flex items-center justify-center gap-1">
              <Crown className="w-3.5 h-3.5 text-amber-500" />
              {premiumPack}
            </div>
            <div className="text-[10px] text-muted-foreground">{isPremium ? "Active" : "Locked"}</div>
          </div>
        </div>

        {!isPremium && (
          <button
            onClick={() => navigate("/premium" as any)}
            className="w-full rounded-xl p-3 bg-gradient-to-r from-amber-400 via-orange-500 to-pink-500 text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-lg"
          >
            <Crown className="w-4 h-4" /> Upgrade to Premium for HD + No Watermark
          </button>
        )}

        {/* Style picker */}
        {styles.length > 0 && (
          <div>
            <label className="text-sm font-medium mb-2 block">Style</label>
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
              {styles.map((s) => {
                const locked = s.tier === "premium" && !isPremium;
                const active = selectedStyle === s.key;
                return (
                  <button
                    key={s.id}
                    onClick={() => pickStyle(s)}
                    className={`relative flex-shrink-0 px-3 py-2 rounded-full text-xs font-medium border transition ${
                      active
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card border-border hover:border-primary/50"
                    } ${locked ? "opacity-80" : ""}`}
                  >
                    {s.tier === "premium" && (
                      <Crown className="w-3 h-3 inline mr-1 text-amber-500" />
                    )}
                    {s.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Upload */}
        <div>
          <label className="text-sm font-medium mb-2 block">Reference image (optional)</label>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
          />
          {sourcePreview ? (
            <div className="relative rounded-xl overflow-hidden border border-border">
              <img src={sourcePreview} alt="source" className="w-full h-48 object-cover" />
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
              className="w-full h-32 rounded-xl border-2 border-dashed border-border hover:border-primary/50 flex flex-col items-center justify-center gap-2 text-muted-foreground transition-colors"
            >
              <Upload className="w-6 h-6" />
              <span className="text-xs">Tap to upload an image</span>
            </button>
          )}
        </div>

        {/* Prompt */}
        <div>
          <label className="text-sm font-medium mb-2 block">Prompt</label>
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe the image you want to create..."
            rows={4}
            maxLength={1000}
          />
          <p className="text-xs text-muted-foreground mt-1 text-right">{prompt.length}/1000</p>
        </div>

        <Button
          onClick={generate}
          disabled={loading || !prompt.trim()}
          className="w-full h-12 bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 text-white font-semibold"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Generate
              <span className="ml-2 text-xs opacity-90">
                {isPremium ? "Premium • HD" : `${dailyCredits ?? 0} left today`}
              </span>
            </>
          )}
        </Button>

        {!prompt.trim() && !loading && (
          <p className="text-xs text-muted-foreground -mt-2 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5" />
            Enter a prompt to enable Generate.
          </p>
        )}

        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-destructive/40 bg-destructive/10 text-destructive px-3 py-2.5 text-xs flex items-start gap-2"
          >
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span className="leading-relaxed">{errorMsg}</span>
          </motion.div>
        )}

        {/* Latest result */}
        {latest && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-xl overflow-hidden border border-border bg-card relative ${
              latestIsPremium ? "premium-glow" : ""
            }`}
          >
            <div className="relative">
              <img src={latest} alt="generated" className="w-full block" />
              {latestIsPremium && (
                <>
                  <div className="premium-particle-overlay">
                    <span /><span /><span /><span /><span /><span />
                  </div>
                  <div className="premium-shine" />
                </>
              )}
            </div>
            {latestIsPremium && (
              <div className="px-3 py-1.5 bg-gradient-to-r from-amber-500/20 via-pink-500/20 to-violet-500/20 text-amber-700 dark:text-amber-300 text-[11px] font-semibold flex items-center gap-1">
                <Crown className="w-3 h-3" /> Premium • HD • No watermark
              </div>
            )}
            {watermarkFailed && !latestIsPremium && (
              <div className="px-3 py-2 bg-amber-500/10 border-t border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" /> Watermark မထည့်နိုင်ခဲ့ပါ
                </span>
                <button
                  onClick={retryWatermark}
                  disabled={retryingWm}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500 text-white text-[11px] font-semibold disabled:opacity-50"
                >
                  {retryingWm ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCw className="w-3 h-3" />}
                  ပြန်စမ်း
                </button>
              </div>
            )}
            <Button onClick={() => download(latest)} variant="secondary" className="w-full rounded-none">
              <Download className="w-4 h-4 mr-2" /> Download
            </Button>
          </motion.div>
        )}

        {/* History */}
        {history.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold mb-3">Your Gallery</h2>
            <div className="grid grid-cols-2 gap-2">
              {history.map((g) =>
                g.result_image_url ? (
                  <button
                    key={g.id}
                    onClick={() => download(g.result_image_url!)}
                    className={`aspect-square rounded-lg overflow-hidden border bg-muted relative group ${
                      isPremium ? "border-amber-400/60 shadow-[0_0_18px_-4px_hsl(43_96%_56%/0.55)]" : "border-border"
                    }`}
                  >
                    <img src={g.result_image_url} alt={g.prompt} className="w-full h-full object-cover" />
                    {isPremium && (
                      <div className="absolute top-1 right-1 px-1.5 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-pink-500 text-white text-[9px] font-bold flex items-center gap-0.5 shadow">
                        <Crown className="w-2.5 h-2.5" /> HD
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition flex items-center justify-center">
                      <Download className="w-5 h-5 text-white opacity-0 group-hover:opacity-100" />
                    </div>
                  </button>
                ) : (
                  <div
                    key={g.id}
                    className="aspect-square rounded-lg overflow-hidden border border-destructive/40 bg-destructive/5 relative flex flex-col items-center justify-center gap-2 p-2 text-center"
                  >
                    <AlertCircle className="w-5 h-5 text-destructive" />
                    <p className="text-[10px] text-muted-foreground line-clamp-2">{g.prompt}</p>
                    <button
                      onClick={() => regenerate(g)}
                      disabled={loading}
                      className="text-[11px] inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary text-primary-foreground font-medium disabled:opacity-50"
                    >
                      <RotateCw className="w-3 h-3" /> Regenerate
                    </button>
                  </div>
                )
              )}
            </div>
          </div>
        )}
      </div>

      {/* Premium upgrade modal */}
      <Dialog open={upgradeOpen} onOpenChange={setUpgradeOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-amber-500" /> Go Premium
            </DialogTitle>
            <DialogDescription>{upgradeReason}</DialogDescription>
          </DialogHeader>
          <ul className="text-sm space-y-1.5 my-2">
            <li className="flex items-center gap-2">✨ Unlimited HD generations</li>
            <li className="flex items-center gap-2">🚫 No watermark</li>
            <li className="flex items-center gap-2">🎨 Exclusive premium styles</li>
            <li className="flex items-center gap-2">⚡ Priority generation</li>
          </ul>
          <Button
            onClick={() => {
              setUpgradeOpen(false);
              navigate("/premium" as any);
            }}
            className="w-full bg-gradient-to-r from-amber-400 via-orange-500 to-pink-500 text-white font-semibold"
          >
            Upgrade now
          </Button>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
};

export default AIPhoto;
