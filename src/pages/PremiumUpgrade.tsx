import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft, Crown, Sparkles, Zap, Shield, Image as ImageIcon,
  Coins, CheckCircle2, Loader2, AlertCircle, Star,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePremiumMembership } from "@/hooks/usePremiumMembership";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import BottomNav from "@/components/BottomNav";

const PERKS = [
  { icon: Sparkles, title: "Unlimited HD Generations", desc: "100 / day premium pool with smart queue", color: "from-amber-400 to-orange-500" },
  { icon: Shield, title: "No Watermark", desc: "Clean, share-ready images for socials", color: "from-rose-400 to-pink-500" },
  { icon: ImageIcon, title: "Exclusive Premium Styles", desc: "Cinematic, Cyberpunk, Ghibli & more", color: "from-violet-400 to-fuchsia-500" },
  { icon: Zap, title: "Glow / Neon / Particle FX", desc: "Eye-catching premium presentation", color: "from-cyan-400 to-blue-500" },
  { icon: Star, title: "Verified Blue Badge", desc: "Stand out across the platform", color: "from-blue-400 to-indigo-500" },
];

const POINT_PRICE = 500;
const KBZ_PRICE_MMK = 5000;

const PremiumUpgrade = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isPremium, getDaysRemaining, activatePremium, refreshMembership } = usePremiumMembership();
  const [points, setPoints] = useState(0);
  const [activating, setActivating] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("points").eq("id", user.id).maybeSingle()
      .then(({ data }) => setPoints(data?.points ?? 0));
  }, [user]);

  const buyWithPoints = async () => {
    if (!user) return;
    if (points < POINT_PRICE) {
      toast.error(`Need ${POINT_PRICE - points} more points`);
      return;
    }
    setActivating(true);
    try {
      const { error: e1 } = await supabase.from("profiles")
        .update({ points: points - POINT_PRICE }).eq("id", user.id);
      if (e1) throw e1;
      await supabase.from("point_transactions").insert({
        user_id: user.id, amount: -POINT_PRICE,
        transaction_type: "premium_purchase",
        description: `Premium activated for ${POINT_PRICE} points`,
      });
      const r = await activatePremium(3);
      if (r.error) {
        await supabase.from("profiles").update({ points }).eq("id", user.id);
        throw new Error(r.error);
      }
      toast.success("🎉 Premium activated for 3 months!");
      setPoints(points - POINT_PRICE);
      await refreshMembership();
    } catch (e: any) {
      toast.error(e.message ?? "Activation failed");
    } finally {
      setActivating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24 relative overflow-hidden">
      {/* Aurora background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -left-32 w-[28rem] h-[28rem] rounded-full bg-amber-400/20 blur-[100px]" />
        <div className="absolute top-40 -right-32 w-[28rem] h-[28rem] rounded-full bg-fuchsia-500/20 blur-[100px]" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[28rem] h-[28rem] rounded-full bg-blue-500/15 blur-[100px]" />
      </div>

      <header className="sticky top-0 z-40 bg-background/70 backdrop-blur-xl border-b border-border/40">
        <div className="flex items-center gap-3 px-4 h-14 max-w-md mx-auto">
          <Link to="/ai" className="p-2 -ml-2 rounded-full hover:bg-accent">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="font-semibold flex-1">Premium</h1>
        </div>
      </header>

      <div className="relative z-10 px-5 py-6 max-w-md mx-auto space-y-6">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="relative rounded-3xl p-6 text-center overflow-hidden border border-amber-300/30 shadow-2xl"
          style={{ background: "linear-gradient(135deg, #f59e0b 0%, #ec4899 55%, #8b5cf6 100%)" }}
        >
          <div className="premium-particle-overlay absolute inset-0 pointer-events-none">
            <span /><span /><span /><span /><span /><span />
          </div>
          <div className="relative z-10">
            <div className="inline-flex p-3 rounded-2xl bg-white/25 backdrop-blur-md border border-white/30 mb-3">
              <Crown className="h-8 w-8 text-white drop-shadow" />
            </div>
            <h2 className="font-display text-2xl font-black text-white drop-shadow">
              {isPremium ? "You are Premium" : "Go Premium"}
            </h2>
            <p className="text-white/90 text-sm mt-1">
              {isPremium
                ? `${getDaysRemaining()} days remaining`
                : "Unlock the full power of As You Like AI"}
            </p>
            {!isPremium && (
              <div className="mt-4 inline-flex items-center gap-1.5 px-4 h-9 rounded-full bg-white text-orange-600 font-bold text-xs shadow-lg">
                3 months • {POINT_PRICE} points or {KBZ_PRICE_MMK.toLocaleString()} MMK
              </div>
            )}
          </div>
        </motion.div>

        {/* Perks */}
        <div className="space-y-2.5">
          {PERKS.map((p, i) => (
            <motion.div
              key={p.title}
              initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-start gap-3 p-3.5 rounded-2xl bg-card/70 backdrop-blur border border-border/50"
            >
              <div className={`p-2.5 rounded-xl bg-gradient-to-br ${p.color} shadow-lg`}>
                <p.icon className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm">{p.title}</div>
                <div className="text-xs text-muted-foreground">{p.desc}</div>
              </div>
              {isPremium && <CheckCircle2 className="h-5 w-5 text-emerald-500 mt-1" />}
            </motion.div>
          ))}
        </div>

        {!isPremium && (
          <div className="space-y-3">
            <div className="rounded-2xl border border-border/50 bg-card/70 backdrop-blur p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Coins className="h-4 w-4 text-amber-500" />
                  <span className="text-sm font-medium">Your points</span>
                </div>
                <span className={`text-sm font-bold ${points >= POINT_PRICE ? "text-emerald-500" : "text-destructive"}`}>
                  {points.toLocaleString()} / {POINT_PRICE}
                </span>
              </div>
              {points < POINT_PRICE && (
                <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 mb-2">
                  <AlertCircle className="h-3.5 w-3.5" />
                  Need {(POINT_PRICE - points).toLocaleString()} more points
                </div>
              )}
              <Button
                onClick={buyWithPoints}
                disabled={activating || points < POINT_PRICE}
                className="w-full h-12 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold"
              >
                {activating ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Activating...</>
                ) : (
                  <><Sparkles className="w-4 h-4 mr-2" /> Activate with {POINT_PRICE} Points</>
                )}
              </Button>
            </div>

            <div className="rounded-2xl border border-border/50 bg-card/70 backdrop-blur p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Pay with KBZPay / WavePay</span>
                <span className="text-sm font-bold text-primary">{KBZ_PRICE_MMK.toLocaleString()} MMK</span>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Top-up your wallet first, then admin will activate Premium after payment confirmation.
              </p>
              <Button
                variant="outline"
                onClick={() => navigate("/top-up")}
                className="w-full h-11 rounded-xl"
              >
                Top up wallet
              </Button>
            </div>

            <p className="text-[11px] text-muted-foreground text-center">
              Premium lasts 3 months. Auto-resets daily AI quotas to premium pool.
            </p>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default PremiumUpgrade;
