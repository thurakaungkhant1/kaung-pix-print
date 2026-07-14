import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ShoppingBag, Crown, Star, ChevronRight, Sparkles, Users, Package,
  Camera, Percent, Clock, ArrowRight, Flame, Shield, Zap, Gamepad2,
  Smartphone, Wifi, Receipt, Bell, Wallet,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import MobileLayout from "@/components/MobileLayout";
import OnboardingFlow from "@/components/OnboardingFlow";
import { supabase } from "@/integrations/supabase/client";
import AdBanner from "@/components/AdBanner";
import AnimatedPage from "@/components/animations/AnimatedPage";
import AnimatedSection from "@/components/animations/AnimatedSection";
import { motion } from "framer-motion";

interface PromotionalBanner {
  id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  badge_text: string | null;
  gradient_from: string;
  gradient_via: string | null;
  gradient_to: string;
  icon_name: string;
  link_url: string;
  link_text: string;
  display_order: number | null;
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Percent, Crown, Package, Flame, Sparkles, Clock, Star, ShoppingBag, Camera, Shield, Users,
  Zap, Gamepad2, Smartphone, Wifi, Receipt, Wallet, ShoppingCart: ShoppingBag,
};

const DIGITAL_ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  package: Package, shield: Shield, sparkles: Sparkles, star: Star, zap: Zap,
  crown: Crown, gamepad: Gamepad2, smartphone: Smartphone, wifi: Wifi,
  receipt: Receipt, wallet: Wallet, camera: Camera, flame: Flame,
};

interface DigitalCategory {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  display_order: number;
  is_active: boolean;
}

const getBannerColor = (colorName: string): string => {
  const colorMap: Record<string, string> = {
    'rose-500': '#f43f5e', 'pink-500': '#ec4899', 'orange-400': '#fb923c',
    'violet-600': '#7c3aed', 'purple-600': '#9333ea', 'indigo-600': '#4f46e5',
    'emerald-500': '#10b981', 'teal-500': '#14b8a6', 'cyan-500': '#06b6d4',
    'blue-500': '#3b82f6', 'green-500': '#22c55e', 'amber-500': '#f59e0b',
    'red-500': '#ef4444', 'yellow-500': '#eab308',
  };
  return colorMap[colorName] || colorMap['blue-500'];
};

// Featured in-app mini games used in the Earn Coins block. These award real
// coins via useGamePoints when played in the /games portal.
const EARN_POINTS_GAMES = [
  { id: "snake", name: "Snake", points: 5, gradient: "from-emerald-400 to-teal-600", emoji: "🐍" },
  { id: "2048", name: "2048", points: 5, gradient: "from-amber-400 to-orange-600", emoji: "🎯" },
  { id: "memory", name: "Memory Match", points: 5, gradient: "from-fuchsia-400 to-purple-600", emoji: "🧠" },
  { id: "flappy", name: "Flappy Bird", points: 5, gradient: "from-sky-400 to-blue-600", emoji: "🐦" },
];

const Home = () => {
  const [digitalCats, setDigitalCats] = useState<DigitalCategory[]>([]);
  const [digitalLoading, setDigitalLoading] = useState(true);
  const [digitalError, setDigitalError] = useState<string | null>(null);
  const [digitalReloadKey, setDigitalReloadKey] = useState(0);
  const [digitalPreview, setDigitalPreview] = useState<Array<{ id: number; name: string; image_url: string | null }>>([]);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [recentPhotos, setRecentPhotos] = useState<any[]>([]);
  const [banners, setBanners] = useState<PromotionalBanner[]>([]);
  const [photosLoading, setPhotosLoading] = useState(true);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [totalCoins, setTotalCoins] = useState<number>(0);
  const [profileName, setProfileName] = useState<string>("");
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const bannerContainerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (banners.length <= 1) return;
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    if (isPaused) return;
    setProgress(0);
    const progressStep = 100 / (4000 / 40);
    progressIntervalRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          setCurrentBannerIndex((prevIndex) => (prevIndex + 1) % banners.length);
          return 0;
        }
        return prev + progressStep;
      });
    }, 40);
    return () => { if (progressIntervalRef.current) clearInterval(progressIntervalRef.current); };
  }, [banners.length, isPaused, currentBannerIndex]);

  useEffect(() => {
    if (bannerContainerRef.current && banners.length > 1) {
      const container = bannerContainerRef.current;
      const bannerWidth = container.scrollWidth / banners.length;
      container.scrollTo({ left: bannerWidth * currentBannerIndex, behavior: 'smooth' });
    }
  }, [currentBannerIndex, banners.length]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
    setIsPaused(true);
  };
  const handleTouchMove = (e: React.TouchEvent) => { touchEndX.current = e.targetTouches[0].clientX; };
  const handleTouchEnd = () => {
    const diff = touchStartX.current - touchEndX.current;
    if (Math.abs(diff) > 50) {
      if (diff > 0) setCurrentBannerIndex((prev) => (prev + 1) % banners.length);
      else setCurrentBannerIndex((prev) => (prev - 1 + banners.length) % banners.length);
    }
    setTimeout(() => setIsPaused(false), 3000);
  };

  useEffect(() => { localStorage.setItem("hasSeenOnboarding", "true"); }, []);

  useEffect(() => {
    supabase.from('photos').select('*').order('created_at', { ascending: false }).limit(6)
      .then(({ data }) => { if (data) setRecentPhotos(data); setPhotosLoading(false); });
    supabase.from('promotional_banners').select('*').eq('is_active', true).order('display_order', { ascending: true })
      .then(({ data }) => {
        if (data) {
          // Hide any "Flash Sale" promotional banner per request
          const filtered = data.filter((b: any) => {
            const t = `${b.title ?? ""} ${b.badge_text ?? ""}`.toLowerCase();
            return !t.includes("flash sale");
          });
          setBanners(filtered);
        }
      });
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadDigital = async () => {
      setDigitalLoading(true);
      setDigitalError(null);
      const { data, error } = await (supabase as any)
        .from('digital_categories')
        .select('id,name,slug,icon,display_order,is_active')
        .eq('is_active', true)
        .order('display_order', { ascending: true })
        .order('name', { ascending: true });
      if (cancelled) return;
      if (error) {
        setDigitalError(error.message || 'Failed to load');
        setDigitalCats([]);
      } else {
        setDigitalCats((data || []) as DigitalCategory[]);
      }
      setDigitalLoading(false);
    };
    loadDigital();
    // Load a few sample digital products so users see what's inside
    (async () => {
      const { data } = await (supabase as any)
        .from('products')
        .select('id,name,image_url')
        .eq('category', 'Digital Products')
        .not('image_url', 'is', null)
        .order('created_at', { ascending: false })
        .limit(4);
      if (!cancelled && data) setDigitalPreview(data as any);
    })();
    const channel = supabase
      .channel('home-digital-cats')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'digital_categories' }, () => loadDigital())
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [digitalReloadKey]);

  useEffect(() => {
    if (!user) return;
    supabase.from('profiles').select('name, wallet_balance, points, game_points').eq('id', user.id).single()
      .then(({ data }) => {
        if (data) {
          setProfileName(data.name || "");
          setWalletBalance(Number(data.wallet_balance) || 0);
          setTotalCoins((Number(data.points) || 0) + (Number(data.game_points) || 0));
        }
      });
    const channel = supabase
      .channel('home-wallet')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` },
        (payload) => {
          if (payload.new) {
            if (typeof payload.new.wallet_balance === 'number') setWalletBalance(payload.new.wallet_balance);
            const p = Number(payload.new.points) || 0;
            const g = Number(payload.new.game_points) || 0;
            setTotalCoins(p + g);
          }
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const handleOnboardingComplete = useCallback(() => {
    localStorage.setItem("hasSeenOnboarding", "true");
    setShowOnboarding(false);
  }, []);

  const formatMMK = (n: number) =>
    new Intl.NumberFormat('en-US').format(Math.round(n)) + ' MMK';

  const greetingName = profileName || user?.email?.split('@')[0] || "Guest";

  return (
    <>
      <OnboardingFlow isOpen={showOnboarding} onComplete={handleOnboardingComplete} />
      <AnimatedPage>
        <MobileLayout className="max-w-screen-xl mx-auto bg-background">
          {/* ── Top Bar: balance + notifications only ── */}
          <header className="px-5 pt-7 pb-4">
            <motion.div
              initial={{ y: -10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-card/90 via-card/70 to-background/90 border border-border/60 p-3.5 shadow-sm backdrop-blur-xl"
            >
              <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-primary/10 blur-2xl" />
              <div className="absolute -bottom-8 -left-8 w-24 h-24 rounded-full bg-fuchsia-500/10 blur-2xl" />
              <div className="relative flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-medium text-muted-foreground">
                    Your balance
                  </span>
                  <button
                    onClick={() => navigate('/top-up')}
                    className="flex items-center gap-1.5 px-3 h-9 rounded-xl bg-primary/10 border border-primary/25 hover:bg-primary/20 transition-all shadow-sm"
                  >
                    <Wallet className="h-3.5 w-3.5 text-primary" />
                    <span className="text-xs font-bold text-primary tabular-nums">
                      {formatMMK(walletBalance)}
                    </span>
                  </button>
                </div>
                <button
                  onClick={() => navigate('/account')}
                  className="w-9 h-9 rounded-xl bg-muted/70 border border-border/60 flex items-center justify-center hover:bg-muted transition-colors flex-shrink-0"
                  aria-label="Notifications"
                >
                  <Bell className="h-3.5 w-3.5 text-foreground" />
                </button>
              </div>
            </motion.div>
          </header>

          {/* ── Onyx Emerald Premium Preview + Digital Products ── */}
          <AnimatedSection delay={0.05}>
            <section className="px-5 pb-4">
              <motion.button
                whileTap={{ scale: 0.98 }}
                whileHover={{ y: -3 }}
                onClick={() => navigate("/category/Digital%20Products")}
                aria-label="Browse Digital Products"
                className="w-full text-left relative overflow-hidden rounded-3xl group shadow-2xl ring-1 ring-emerald-400/20"
                style={{
                  background:
                    "radial-gradient(120% 80% at 0% 0%, rgba(16,185,129,0.25), transparent 55%), radial-gradient(120% 80% at 100% 100%, rgba(20,184,166,0.18), transparent 55%), linear-gradient(135deg, #050505 0%, #0a0f0d 55%, #06140f 100%)",
                }}
              >
                <div className="absolute inset-0 opacity-40 mix-blend-screen pointer-events-none">
                  <div className="absolute -top-10 -left-10 w-72 h-72 rounded-full bg-emerald-500/25 blur-3xl" />
                  <div className="absolute -bottom-16 -right-10 w-72 h-72 rounded-full bg-teal-400/15 blur-3xl" />
                </div>
                <div
                  className="absolute inset-0 opacity-[0.08] pointer-events-none"
                  style={{
                    backgroundImage:
                      "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
                    backgroundSize: "28px 28px",
                  }}
                />

                <div className="relative z-10 p-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-2xl bg-emerald-500/15 ring-1 ring-emerald-400/30 backdrop-blur">
                      <Package className="h-5 w-5 text-emerald-300" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <Badge className="bg-emerald-400/15 text-emerald-300 border border-emerald-400/30 text-[10px] mb-1 tracking-[0.18em] font-bold rounded-full px-2.5 py-0.5">
                        ONYX • EMERALD
                      </Badge>
                      <h3 className="text-xl font-display font-black text-white leading-tight tracking-tight drop-shadow">
                        Digital Products
                      </h3>
                      <p className="text-white/70 text-[11px] mt-0.5">
                        Premium software, streaming, gift cards & courses.
                      </p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-emerald-300 mt-2 group-hover:translate-x-1 transition-transform" />
                  </div>

                  {digitalLoading ? (
                    <div className="mt-3 grid grid-cols-4 gap-2" aria-busy="true" aria-label="Loading categories">
                      {[0, 1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className="rounded-xl px-2 py-2 flex flex-col items-center gap-1.5 bg-white/[0.04] border border-white/10 backdrop-blur-sm"
                        >
                          <div className="h-4 w-4 rounded bg-white/10 animate-pulse" />
                          <div className="h-2.5 w-12 rounded bg-white/10 animate-pulse" />
                        </div>
                      ))}
                    </div>
                  ) : digitalError ? (
                    <div className="mt-3 rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2.5 flex items-center justify-between gap-3">
                      <span className="text-[11px] text-rose-200/90">
                        Couldn’t load categories. {digitalError}
                      </span>
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => { e.stopPropagation(); e.preventDefault(); setDigitalReloadKey((k) => k + 1); }}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); setDigitalReloadKey((k) => k + 1); } }}
                        className="text-[11px] font-bold text-emerald-300 underline-offset-2 hover:underline cursor-pointer"
                      >
                        Retry
                      </span>
                    </div>
                  ) : digitalCats.length === 0 ? (
                    <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 flex items-center justify-between gap-3">
                      <span className="text-[11px] text-white/70">
                        No categories yet — admin can add some.
                      </span>
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => { e.stopPropagation(); e.preventDefault(); setDigitalReloadKey((k) => k + 1); }}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); setDigitalReloadKey((k) => k + 1); } }}
                        className="text-[11px] font-bold text-emerald-300 underline-offset-2 hover:underline cursor-pointer"
                      >
                        Refresh
                      </span>
                    </div>
                  ) : (
                    <>
                      {/* Sample apps preview so users know what's inside */}
                      {digitalPreview.length > 0 && (
                        <div className="mt-3">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-300/80">
                              Inside the catalog
                            </span>
                            <span className="text-[10px] text-white/50">Tap to explore</span>
                          </div>
                          <div className="grid grid-cols-4 gap-2">
                            {digitalPreview.map((p) => (
                              <div
                                key={p.id}
                                className="relative rounded-2xl aspect-[4/3] overflow-hidden bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/10 backdrop-blur-sm transition-all duration-300 group-hover:-translate-y-0.5 group-hover:border-emerald-400/30 group-hover:shadow-[0_8px_24px_-8px_rgba(16,185,129,0.5)]"
                              >
                                {p.image_url ? (
                                  <img
                                    src={p.image_url}
                                    alt={p.name}
                                    loading="lazy"
                                    className="absolute inset-0 h-full w-full object-cover"
                                  />
                                ) : (
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <Package className="h-4 w-4 text-emerald-300/70" />
                                  </div>
                                )}
                                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/50 to-transparent px-1 pt-3 pb-1">
                                  <p className="text-white text-[9px] font-semibold leading-tight text-center line-clamp-1 drop-shadow">
                                    {p.name}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Category chips */}
                      <div className="mt-2 grid grid-cols-4 gap-2">
                        {digitalCats.slice(0, 4).map((c) => {
                          const Icon = DIGITAL_ICON_MAP[(c.icon || "package").toLowerCase()] || Package;
                          return (
                            <div
                              key={c.id}
                              className="rounded-xl px-2 py-1.5 flex items-center gap-1.5 bg-white/[0.04] border border-white/10 backdrop-blur-sm transition-all duration-300 hover:bg-emerald-500/10 hover:border-emerald-400/30"
                            >
                              <Icon className="h-3.5 w-3.5 text-emerald-300 flex-shrink-0" />
                              <span className="text-white/90 text-[10px] font-semibold tracking-wide truncate">
                                {c.name}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}

                  <div className="mt-3 flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-1.5 px-4 h-9 rounded-full bg-emerald-400 text-black font-bold text-xs shadow-[0_8px_24px_-6px_rgba(16,185,129,0.6)]">
                      <Sparkles className="h-3.5 w-3.5" />
                      Browse Catalog
                      <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                    <span className="text-[10px] text-emerald-300/80 font-medium tracking-wider">
                      {digitalPreview.length > 0 ? `${digitalPreview.length}+ APPS` : "NEW LOOK"}
                    </span>
                  </div>
                </div>
              </motion.button>
            </section>
          </AnimatedSection>


          {/* ── Hero Banner ── */}
          {banners.length > 0 && (
            <section className="px-5">
              <div
                ref={bannerContainerRef}
                className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide scroll-smooth snap-x snap-mandatory"
                onMouseEnter={() => setIsPaused(true)}
                onMouseLeave={() => setIsPaused(false)}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                {banners.map((banner) => {
                  const IconComponent = ICON_MAP[banner.icon_name] || Sparkles;
                  return (
                    <motion.div
                      key={banner.id}
                      whileTap={{ scale: 0.98 }}
                      className="snap-center flex-shrink-0 w-full relative overflow-hidden rounded-3xl cursor-pointer"
                      style={{
                        background: `linear-gradient(135deg, ${getBannerColor(banner.gradient_from)}, ${banner.gradient_via ? getBannerColor(banner.gradient_via) + ',' : ''} ${getBannerColor(banner.gradient_to)})`,
                      }}
                      onClick={() => navigate(banner.link_url)}
                    >
                      {/* Decorative background image hint */}
                      <div className="absolute inset-0 opacity-30 mix-blend-overlay">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_50%,rgba(255,255,255,0.25),transparent_60%)]" />
                      </div>
                      <IconComponent className="absolute -right-4 -bottom-4 h-32 w-32 text-white/10" />

                      <div className="relative z-10 p-5 min-h-[170px] flex flex-col justify-between">
                        <div>
                          {banner.badge_text && (
                            <Badge className="bg-yellow-400 text-yellow-950 border-0 font-bold text-[10px] px-2.5 py-1 rounded-full mb-3 hover:bg-yellow-400">
                              {banner.badge_text}
                            </Badge>
                          )}
                          <h3 className="text-xl font-display font-black text-white/90 leading-tight drop-shadow-sm">
                            {banner.title}
                          </h3>
                          {banner.description && (
                            <p className="text-white/70 text-xs mt-1 line-clamp-1">{banner.description}</p>
                          )}
                        </div>
                        <Button
                          size="sm"
                          className="self-start mt-3 bg-blue-500 hover:bg-blue-600 text-white rounded-full px-5 h-9 font-semibold text-xs shadow-lg"
                          onClick={(e) => { e.stopPropagation(); navigate(banner.link_url); }}
                        >
                          {banner.link_text || "Top Up Now"}
                        </Button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {banners.length > 1 && (
                <div className="flex justify-center gap-1.5 pt-3">
                  {banners.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => { setCurrentBannerIndex(index); setProgress(0); }}
                      className="relative h-1.5 rounded-full overflow-hidden transition-all"
                      style={{ width: index === currentBannerIndex ? '24px' : '6px' }}
                    >
                      <div className={cn("absolute inset-0 rounded-full",
                        index === currentBannerIndex ? "bg-primary/25" : "bg-muted-foreground/25")} />
                      {index === currentBannerIndex && (
                        <div className="absolute inset-y-0 left-0 bg-primary rounded-full"
                          style={{ width: `${progress}%` }} />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* ── Earn Coins (Featured Mini Games) ── */}
          <AnimatedSection delay={0.2}>
            <section className="px-5 mt-6">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-base font-display font-bold">Earn Coins</h2>
                  <p className="text-[11px] text-muted-foreground -mt-0.5">Play mini games and earn coins instantly</p>
                </div>
                <button onClick={() => navigate("/games")} className="text-xs text-primary font-semibold">
                  See All
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {EARN_POINTS_GAMES.map((game, i) => (
                  <motion.button
                    key={game.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + i * 0.05 }}
                    whileTap={{ scale: 0.97 }}
                    whileHover={{ y: -3 }}
                    onClick={() => navigate("/games")}
                    className="text-left rounded-2xl overflow-hidden bg-card border border-border/60 hover:shadow-2xl hover:border-primary/30 transition-all group"
                  >
                    <div className={cn("aspect-[4/3] bg-gradient-to-br relative overflow-hidden", game.gradient)}>
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.35),transparent_55%)]" />

                      <motion.div
                        animate={{ y: [0, -6, 0], rotate: [0, 4, 0] }}
                        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: i * 0.4 }}
                        className="absolute right-3 bottom-3 text-4xl drop-shadow-lg"
                      >
                        {game.emoji}
                      </motion.div>

                      <div className="absolute top-2.5 right-2.5 glass-chip rounded-full px-2 py-1 flex items-center gap-1 shadow-sm">
                        <Zap className="h-3 w-3 text-yellow-200" fill="currentColor" />
                        <span className="text-[10px] font-extrabold text-white tracking-wide">
                          +{game.points}
                        </span>
                      </div>

                      <div className="absolute inset-x-2 bottom-2 glass-chip rounded-xl px-3 py-2 flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-white/25 flex items-center justify-center backdrop-blur">
                          <Gamepad2 className="h-3.5 w-3.5 text-white" />
                        </div>
                        <p className="text-xs font-bold text-white truncate drop-shadow">{game.name}</p>
                      </div>
                    </div>
                    <div className="p-3 flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-muted-foreground">Tap to play</span>
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                        +{game.points} pts
                        <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                      </span>
                    </div>
                  </motion.button>
                ))}
              </div>

              <button
                onClick={() => navigate("/games")}
                className="mt-3 w-full py-2.5 rounded-full bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 border border-primary/20 text-xs font-semibold text-primary hover:bg-primary/15 transition"
              >
                Explore all mini games →
              </button>
            </section>
          </AnimatedSection>








          {/* Photo Gallery section removed */}
          <AdBanner pageLocation="home" position="inline" className="px-5 mt-6" />

          <div className="text-center py-4 pb-24 mt-4">
            <p className="text-[10px] text-muted-foreground/50 tracking-wide">created by thurakaungkhant</p>
          </div>
        </MobileLayout>
      </AnimatedPage>
    </>
  );
};

export default Home;
