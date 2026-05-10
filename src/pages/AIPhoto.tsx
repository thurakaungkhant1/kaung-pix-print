import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Upload, Sparkles, Download, Loader2, X, Coins } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import BottomNav from "@/components/BottomNav";

interface Generation {
  id: string;
  prompt: string;
  result_image_url: string | null;
  created_at: string;
}

const AIPhoto = () => {
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [prompt, setPrompt] = useState("");
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [sourcePreview, setSourcePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<Generation[]>([]);
  const [usedToday, setUsedToday] = useState(0);
  const [dailyLimit, setDailyLimit] = useState(5);
  const [photoCost, setPhotoCost] = useState(50);
  const [latest, setLatest] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: settings } = await supabase
        .from("ai_usage_settings")
        .select("photo_cost_coins, daily_photo_limit")
        .limit(1)
        .maybeSingle();
      if (settings) {
        setPhotoCost(settings.photo_cost_coins);
        setDailyLimit(settings.daily_photo_limit);
      }

      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const { data: today } = await supabase
        .from("ai_photo_generations")
        .select("id", { count: "exact" })
        .eq("user_id", user.id)
        .gte("created_at", start.toISOString());
      setUsedToday(today?.length ?? 0);

      const { data: hist } = await supabase
        .from("ai_photo_generations")
        .select("id, prompt, result_image_url, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      setHistory(hist ?? []);
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

  const generate = async () => {
    if (!prompt.trim()) {
      toast.error("Please enter a prompt");
      return;
    }
    if (usedToday >= dailyLimit) {
      toast.error(`Daily limit reached (${dailyLimit}/day)`);
      return;
    }
    setLoading(true);
    setLatest(null);
    try {
      let sourceUrl: string | undefined;
      if (sourceFile && user) {
        const path = `${user.id}/source-${Date.now()}-${sourceFile.name}`;
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
        body: { prompt: prompt.trim(), source_image_url: sourceUrl },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setLatest(data.result_image_url);
      setUsedToday(data.used_today);
      setHistory((h) => [data.generation, ...h]);
      toast.success(`Image generated! -${data.cost_coins} coins`);
      setPrompt("");
      setSourceFile(null);
      setSourcePreview(null);
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
      a.download = `ai-photo-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      toast.error("Download failed");
    }
  };

  const remaining = Math.max(0, dailyLimit - usedToday);

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/40">
        <div className="flex items-center gap-3 px-4 h-14">
          <Link to="/ai" className="p-2 -ml-2 rounded-full hover:bg-accent">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="font-semibold flex-1">AI Photo Generator</h1>
          <div className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary font-medium">
            <Sparkles className="w-3 h-3" />
            {remaining}/{dailyLimit} today
          </div>
        </div>
      </header>

      <div className="px-4 py-5 max-w-md mx-auto space-y-5">
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
          disabled={loading || !prompt.trim() || remaining === 0}
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
              <span className="ml-2 inline-flex items-center gap-1 text-xs opacity-90">
                <Coins className="w-3 h-3" /> {photoCost}
              </span>
            </>
          )}
        </Button>

        {/* Latest result */}
        {latest && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl overflow-hidden border border-border bg-card"
          >
            <img src={latest} alt="generated" className="w-full" />
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
                    className="aspect-square rounded-lg overflow-hidden border border-border bg-muted relative group"
                  >
                    <img src={g.result_image_url} alt={g.prompt} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition flex items-center justify-center">
                      <Download className="w-5 h-5 text-white opacity-0 group-hover:opacity-100" />
                    </div>
                  </button>
                ) : null
              )}
            </div>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default AIPhoto;
