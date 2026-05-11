import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Gift, Loader2, Heart, Home as HomeIcon, Copy } from "lucide-react";
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
