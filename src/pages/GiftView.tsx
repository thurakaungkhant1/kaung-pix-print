import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Gift, Loader2, Heart, Home as HomeIcon, Sparkles, AlertCircle, Clock, ShieldOff, HelpCircle, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import QRScannerDialog from "@/components/QRScannerDialog";

import GiftCardPreview, { GIFT_STYLES as STYLES } from "@/components/GiftCardPreview";

type ErrorKind = "not_found" | "pending" | "removed" | "expired" | "network";
const ERROR_COPY: Record<ErrorKind, { title: string; message: string; hint: string; icon: any }> = {
  not_found: {
    title: "Gift not found",
    message: "We couldn't find a gift at this link.",
    hint: "The address may be mistyped — double-check the letters and try again.",
    icon: HelpCircle,
  },
  pending: {
    title: "Gift awaiting approval",
    message: "This gift is still being reviewed by our team.",
    hint: "Check back shortly — the sender will get a notification once it's live.",
    icon: Clock,
  },
  removed: {
    title: "Gift was removed",
    message: "The sender or our team took this gift down.",
    hint: "If this was a mistake, ask the sender to share a new gift link.",
    icon: ShieldOff,
  },
  expired: {
    title: "Gift has expired",
    message: "This gift link is no longer active.",
    hint: "Ask the sender to create a fresh one — it only takes a few seconds.",
    icon: Clock,
  },
  network: {
    title: "Couldn't load gift",
    message: "We had trouble reaching the server.",
    hint: "Check your connection and try again.",
    icon: AlertCircle,
  },
};

const GiftView = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [gift, setGift] = useState<any | null>(null);
  const [errorKind, setErrorKind] = useState<ErrorKind | null>(null);
  const [scanOpen, setScanOpen] = useState(false);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      try {
        const base = (import.meta.env.VITE_SUPABASE_URL as string) || "";
        const anon = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string) || "";
        const res = await fetch(`${base}/functions/v1/ai-gift-status?slug=${encodeURIComponent(slug)}`, {
          headers: { apikey: anon, Authorization: `Bearer ${anon}` },
        });
        if (!res.ok) {
          setErrorKind("network");
        } else {
          const json = await res.json();
          if (json.status === "approved") {
            setGift(json);
          } else if (["not_found", "pending", "removed", "expired"].includes(json.status)) {
            setErrorKind(json.status as ErrorKind);
          } else {
            setErrorKind("not_found");
          }
        }
      } catch {
        setErrorKind("network");
      } finally {
        setLoading(false);
      }
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
