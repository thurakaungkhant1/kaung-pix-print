import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Upload, Sparkles, Download, Loader2, X, IdCard, AlertCircle, RotateCw, ImagePlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import BottomNav from "@/components/BottomNav";

interface Preset {
  id: string;
  name: string;
  description: string | null;
  prompt: string;
  thumbnail_url: string | null;
}

interface HistoryItem {
  id: string;
  prompt: string;
  result_image_url: string | null;
  created_at: string;
}

const AIPassport = () => {
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [selected, setSelected] = useState<Preset | null>(null);
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [sourcePreview, setSourcePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [usedToday, setUsedToday] = useState(0);
  const [dailyLimit, setDailyLimit] = useState(5);
  const [result, setResult] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: settings }, { data: today }, { data: list }] = await Promise.all([
        supabase.from("ai_usage_settings").select("daily_photo_limit").limit(1).maybeSingle(),
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
          .select("id, name, description, prompt, thumbnail_url")
          .eq("is_active", true)
          .order("display_order", { ascending: true }),
      ]);
      if (settings) setDailyLimit(settings.daily_photo_limit);
      setUsedToday(today?.length ?? 0);
      setPresets((list as Preset[]) ?? []);
      const { data: hist } = await supabase
        .from("ai_photo_generations")
        .select("id, prompt, result_image_url, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(12);
      setHistory((hist as HistoryItem[]) ?? []);
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

  const closeModal = () => {
    if (loading) return;
    setSelected(null);
    setSourceFile(null);
    setSourcePreview(null);
    setResult(null);
    setErrorMsg(null);
  };

  const generate = async () => {
    if (!selected) return;
    if (!sourceFile || !user) {
      setErrorMsg("Please upload your front-facing photo first.");
      toast.error("Upload your photo");
      return;
    }
    if (remaining === 0) {
      setErrorMsg(`Daily limit reached (${dailyLimit}/day). Try again tomorrow.`);
      toast.error("Daily limit reached");
      return;
    }
    setErrorMsg(null);
    setLoading(true);
    setResult(null);
    try {
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
      if (error) {
        let msg = error.message ?? "Generation failed";
        try {
          const ctx: Response | undefined = (error as any).context;
          if (ctx) {
            const j = await ctx.clone().json();
            if (j?.error) msg = j.error;
          }
        } catch {}
        throw new Error(msg);
      }
      if (data?.error) throw new Error(data.error);
      if (!data?.result_image_url) throw new Error("No image was returned. Please try a different photo.");

      setResult(data.result_image_url);
      setUsedToday(data.used_today);
      if (data.generation) setHistory((h) => [data.generation as HistoryItem, ...h].slice(0, 12));
      toast.success("Passport photo ready!");
    } catch (e: any) {
      const msg = e.message ?? "Generation failed";
      setErrorMsg(msg);
      toast.error(msg);
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

      <div className="px-4 py-5 max-w-md mx-auto space-y-4">
        <div>
          <h2 className="font-semibold text-base mb-1">Choose a style</h2>
          <p className="text-xs text-muted-foreground">
            Tap any sample → upload your photo → instantly get the matching passport-style portrait.
          </p>
        </div>

        {presets.length === 0 ? (
          <div className="text-xs text-muted-foreground p-6 border border-dashed rounded-xl text-center">
            No styles available yet. Please check back soon.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {presets.map((p) => (
              <motion.button
                key={p.id}
                whileTap={{ scale: 0.96 }}
                onClick={() => setSelected(p)}
                className="group relative rounded-2xl overflow-hidden border border-border bg-card hover:border-emerald-500/50 transition shadow-sm hover:shadow-lg text-left"
              >
                <div className="aspect-[3/4] bg-muted overflow-hidden">
                  {p.thumbnail_url ? (
                    <img
                      src={p.thumbnail_url}
                      alt={p.name}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground/50">
                      <IdCard className="w-10 h-10" />
                    </div>
                  )}
                </div>
                <div className="p-2.5">
                  <p className="text-xs font-semibold leading-snug truncate">{p.name}</p>
                  {p.description && (
                    <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">{p.description}</p>
                  )}
                </div>
              </motion.button>
            ))}
          </div>
        )}

        {history.length > 0 && (
          <div className="pt-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-base">Recent creations</h2>
              <span className="text-[11px] text-muted-foreground">{history.length}</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {history.map((g) =>
                g.result_image_url ? (
                  <motion.div
                    key={g.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="relative group rounded-xl overflow-hidden border border-border bg-muted aspect-[3/4]"
                  >
                    <img
                      src={g.result_image_url}
                      alt={g.prompt}
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={() => download(g.result_image_url!)}
                      className="absolute inset-0 flex items-end justify-center bg-gradient-to-t from-black/70 via-black/0 to-transparent opacity-0 group-hover:opacity-100 transition pb-2"
                      title="Download"
                    >
                      <span className="text-[10px] font-medium text-white inline-flex items-center gap-1 bg-black/40 backdrop-blur px-2 py-1 rounded-full">
                        <Download className="w-3 h-3" /> Save
                      </span>
                    </button>
                    <span className="absolute top-1 left-1 text-[9px] px-1.5 py-0.5 rounded-full bg-black/50 text-white backdrop-blur">
                      {new Date(g.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </span>
                  </motion.div>
                ) : null
              )}
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center"
            onClick={closeModal}
          >
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 30, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-background rounded-t-3xl sm:rounded-3xl p-5 space-y-4 max-h-[92vh] overflow-y-auto"
            >
              <div className="flex items-start gap-3">
                <div className="w-16 h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                  {selected.thumbnail_url && (
                    <img src={selected.thumbnail_url} alt="" className="w-full h-full object-cover" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm">{selected.name}</h3>
                  {selected.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{selected.description}</p>
                  )}
                </div>
                <button onClick={closeModal} className="p-1.5 rounded-full hover:bg-accent">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {!result && (
                <>
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
                      className="w-full h-44 rounded-xl border-2 border-dashed border-border hover:border-emerald-500/50 flex flex-col items-center justify-center gap-2 text-muted-foreground transition-colors"
                    >
                      <Upload className="w-7 h-7" />
                      <span className="text-xs font-medium">Upload your front-facing photo</span>
                      <span className="text-[10px] text-muted-foreground/70">JPG / PNG, up to 10MB</span>
                    </button>
                  )}

                  <Button
                    onClick={generate}
                    disabled={loading || !sourceFile || remaining === 0}
                    className="w-full h-12 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-white font-semibold"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" /> Create Passport Photo
                      </>
                    )}
                  </Button>
                  <p className="text-[11px] text-center text-muted-foreground">
                    Free • {remaining}/{dailyLimit} left today
                  </p>
                </>
              )}

              {result && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl overflow-hidden border border-border bg-card"
                >
                  <img src={result} alt="passport" className="w-full" />
                  <div className="grid grid-cols-2">
                    <Button
                      onClick={() => {
                        setResult(null);
                        setSourceFile(null);
                        setSourcePreview(null);
                      }}
                      variant="secondary"
                      className="rounded-none"
                    >
                      Try again
                    </Button>
                    <Button onClick={() => download(result)} className="rounded-none">
                      <Download className="w-4 h-4 mr-2" /> Download
                    </Button>
                  </div>
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  );
};

export default AIPassport;
