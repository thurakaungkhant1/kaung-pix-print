import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Gift, Loader2, Heart, Home as HomeIcon, Copy, Sparkles, Search, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

import GiftCardPreview, { GIFT_STYLES as STYLES } from "@/components/GiftCardPreview";

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
      <div className="min-h-screen flex items-center justify-center bg-background px-4 py-10 relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-32 -left-20 w-96 h-96 rounded-full bg-pink-500/10 blur-3xl animate-pulse" />
          <div className="absolute bottom-0 -right-20 w-96 h-96 rounded-full bg-indigo-500/10 blur-3xl animate-pulse" style={{ animationDelay: "1.5s" }} />
        </div>
        <motion.div
          initial={{ y: 20, opacity: 0, scale: 0.96 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 120, damping: 18 }}
          className="relative z-10 w-full max-w-sm"
        >
          <div className="rounded-3xl border border-border/50 bg-card/80 backdrop-blur-xl shadow-2xl p-6 text-center">
            <div className="relative mx-auto w-20 h-20 mb-5">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-pink-500/20 to-indigo-500/20 blur-xl" />
              <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-pink-500/15 to-indigo-500/15 border border-border/40 flex items-center justify-center">
                <Gift className="w-9 h-9 text-muted-foreground" />
                <div className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-background border border-border/50 flex items-center justify-center">
                  <AlertCircle className="w-4 h-4 text-amber-500" />
                </div>
              </div>
            </div>
            <h1 className="text-xl font-display font-bold mb-2">Gift not available</h1>
            <p className="text-sm text-muted-foreground mb-1">
              {error ?? "We couldn't find this gift."}
            </p>
            <p className="text-xs text-muted-foreground/80 mb-6">
              The link may have expired, been removed, or the address could be mistyped.
            </p>
            <div className="flex flex-col gap-2">
              <Link to="/ai/gift">
                <Button className="w-full bg-gradient-to-r from-pink-500 via-indigo-500 to-purple-500 text-white">
                  <Sparkles className="w-4 h-4 mr-2" /> Create your own gift
                </Button>
              </Link>
              <Link to="/">
                <Button variant="outline" className="w-full">
                  <HomeIcon className="w-4 h-4 mr-2" /> Back to Home
                </Button>
              </Link>
            </div>
          </div>
          <p className="text-center text-[11px] text-muted-foreground mt-4">
            Sent with love via our AI Gift Studio
          </p>
        </motion.div>
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
          <GiftCardPreview style={style} message={message} imageUrl={imageUrl} variant="full" />
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
