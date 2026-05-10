import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Gift, Loader2, Heart, Home as HomeIcon, Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const STYLES = [
  { name: "Sunset Bloom", bg: "linear-gradient(135deg,#ff9a8b,#ff6a88,#ff99ac)", color: "#fff" },
  { name: "Ocean Glow", bg: "linear-gradient(135deg,#1e3c72,#2a5298)", color: "#fff" },
  { name: "Galaxy", bg: "linear-gradient(135deg,#0f0c29,#302b63,#24243e)", color: "#fff" },
  { name: "Cherry Pop", bg: "linear-gradient(135deg,#ff6e7f,#bfe9ff)", color: "#fff" },
  { name: "Aurora", bg: "linear-gradient(135deg,#00c6ff,#0072ff)", color: "#fff" },
  { name: "Peach Cream", bg: "linear-gradient(135deg,#ffecd2,#fcb69f)", color: "#5b3024" },
  { name: "Mint Fresh", bg: "linear-gradient(135deg,#a8edea,#fed6e3)", color: "#0f3a36" },
  { name: "Royal Velvet", bg: "linear-gradient(135deg,#7028e4,#e5b2ca)", color: "#fff" },
  { name: "Gold Honey", bg: "linear-gradient(135deg,#f7971e,#ffd200)", color: "#5b3a00" },
  { name: "Midnight Rose", bg: "linear-gradient(135deg,#0f2027,#203a43,#2c5364)", color: "#ffd6e0" },
];

const GiftView = () => {
  const { slug } = useParams<{ slug: string }>();
  const [loading, setLoading] = useState(true);
  const [gift, setGift] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      const { data, error } = await supabase
        .from("ai_gift_links")
        .select("slug, payload, status, created_at")
        .eq("slug", slug)
        .eq("status", "approved")
        .maybeSingle();
      if (error || !data) {
        setError("This gift link is not available.");
      } else {
        setGift(data);
      }
      setLoading(false);
    })();
  }, [slug]);

  const share = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ url, title: "A gift for you 💝" }); return; } catch {}
    }
    await navigator.clipboard.writeText(url);
    toast.success("Link copied");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !gift) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background px-6 text-center">
        <Gift className="w-12 h-12 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">{error ?? "Gift not found"}</p>
        <Link to="/"><Button variant="outline"><HomeIcon className="w-4 h-4 mr-2" /> Home</Button></Link>
      </div>
    );
  }

  const styleIdx = Number(gift.payload?.style_index ?? 0);
  const style = STYLES[Math.max(0, Math.min(STYLES.length - 1, styleIdx))];
  const message = gift.payload?.message ?? "";
  const imageUrl = gift.payload?.image_url ?? null;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 bg-background relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 -left-20 w-96 h-96 rounded-full bg-pink-500/15 blur-3xl animate-pulse" />
        <div className="absolute bottom-0 -right-20 w-96 h-96 rounded-full bg-indigo-500/15 blur-3xl animate-pulse" style={{ animationDelay: "1.5s" }} />
      </div>

      <motion.div
        initial={{ y: 20, opacity: 0, scale: 0.96 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 120, damping: 18 }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="rounded-3xl overflow-hidden shadow-2xl border border-border/50">
          <div style={{ background: style.bg, color: style.color }} className="p-8 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="w-16 h-16 mx-auto rounded-full bg-white/20 backdrop-blur flex items-center justify-center mb-4"
            >
              <Gift className="w-8 h-8" />
            </motion.div>
            {imageUrl && (
              <img src={imageUrl} alt="gift" className="w-28 h-28 mx-auto rounded-full object-cover border-4 border-white/40 mb-4 shadow-xl" />
            )}
            <p className="text-xs uppercase tracking-widest opacity-80 mb-2">A gift for you</p>
            <p className="text-base font-medium whitespace-pre-wrap leading-relaxed">
              {message || "💝"}
            </p>
          </div>
          <div className="bg-card p-4 flex items-center gap-2">
            <Button onClick={share} className="flex-1" variant="default">
              <Heart className="w-4 h-4 mr-2" /> Share back
            </Button>
            <Link to="/" className="flex-1">
              <Button variant="outline" className="w-full">
                <HomeIcon className="w-4 h-4 mr-2" /> Visit
              </Button>
            </Link>
          </div>
        </div>
        <p className="text-center text-[11px] text-muted-foreground mt-4">Sent with love via our AI Gift Studio</p>
      </motion.div>
    </div>
  );
};

export default GiftView;
