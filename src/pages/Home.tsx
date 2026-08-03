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
import appLogo from "@/assets/app-logo.png";
import NotificationBell from "@/components/NotificationBell";
import { useGameCatalog } from "@/hooks/useGameCatalog";


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
  const { games: catalogGames } = useGameCatalog();
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
    supabase.from('profiles').select('wallet_balance, points, game_points').eq('id', user.id).single()
      .then(({ data }) => {
        if (data) {
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

  return (
    <>
      <OnboardingFlow isOpen={showOnboarding} onComplete={handleOnboardingComplete} />
      <AnimatedPage>
        <MobileLayout className="max-w-screen-xl mx-auto bg-background">
          {/* ── Hero: brand, balance card, quick actions ── */}
          <header className="px-5 pt-6 pb-2">
            <motion.div
              initial={{ y: -10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="flex items-center justify-between mb-4"
            >
              <div className="flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-2xl bg-card border border-border/60 flex items-center justify-center shadow-lg shadow-primary/10 overflow-hidden">
                  <img src={appLogo} alt="Kaung Digital Store logo" width={36} height={36} className="w-full h-full object-contain" />
                </span>
                <div className="leading-tight">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-semibold">
                    Kaung Digital
                  </p>
                  <h1 className="text-sm font-display font-bold tracking-tight">Store</h1>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href="https://t.me/kaungdigitalstore"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Join our Telegram group"
                  className="w-11 h-11 rounded-2xl bg-[#229ED9]/10 border border-[#229ED9]/30 flex items-center justify-center hover:bg-[#229ED9]/20 transition-colors"
                >
                  <svg viewBox="0 0 24 24" className="h-6 w-6 text-[#229ED9] fill-current" aria-hidden="true">
                    <path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71l-4.14-3.05-1.99 1.93c-.23.23-.42.42-.83.42z" />
                  </svg>
                </a>
                <NotificationBell className="w-11 h-11 rounded-2xl" />
              </div>

            </motion.div>

            {/* Balance card */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="relative overflow-hidden rounded-3xl border border-primary/20 shadow-2xl shadow-primary/10"
              style={{
                background:
                  "linear-gradient(135deg, hsl(var(--primary) / 0.92) 0%, hsl(var(--primary) / 0.65) 42%, hsl(var(--accent) / 0.75) 100%)",
              }}
            >
              {/* soft light orbs */}
              <div className="absolute -top-16 -right-10 w-44 h-44 rounded-full bg-white/20 blur-3xl pointer-events-none" />
              <div className="absolute -bottom-20 -left-12 w-48 h-48 rounded-full bg-black/20 blur-3xl pointer-events-none" />

              <div className="relative p-5">
                <div className="flex items-start justify-between">
                  <div className="inline-flex items-center gap-2">
                    <span className="w-8 h-8 rounded-xl bg-primary-foreground/15 border border-primary-foreground/20 flex items-center justify-center backdrop-blur-sm">
                      <Wallet className="h-4 w-4 text-primary-foreground" />
                    </span>
                    <div className="leading-tight">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-primary-foreground/70 font-semibold">
                        Wallet balance
                      </p>
                      <p className="text-[11px] text-primary-foreground/60 font-medium -mt-0.5">Kaung Digital Store</p>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate('/games')}
                    className="inline-flex items-center gap-1.5 px-2.5 h-8 rounded-full bg-primary-foreground/15 border border-primary-foreground/20 backdrop-blur-sm"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                    <span className="text-[11px] font-bold text-primary-foreground tabular-nums">
                      {totalCoins.toLocaleString()}
                    </span>
                  </button>
                </div>

                <div className="mt-5 flex items-end gap-2">
                  <p className="text-[34px] leading-none font-display font-black tabular-nums tracking-tight text-primary-foreground">
                    {formatMMK(walletBalance)}
                  </p>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-2">
                  <button
                    onClick={() => navigate('/top-up')}
                    className="h-11 rounded-2xl bg-primary-foreground text-primary font-bold text-xs inline-flex items-center justify-center gap-1.5 shadow-lg active:scale-[0.98] transition"
                  >
                    <Wallet className="h-4 w-4" /> Top Up
                  </button>
                  <button
                    onClick={() => navigate('/wallet-history')}
                    className="h-11 rounded-2xl bg-primary-foreground/15 border border-primary-foreground/25 text-primary-foreground font-bold text-xs inline-flex items-center justify-center gap-1.5 backdrop-blur-sm active:scale-[0.98] transition"
                  >
                    <Receipt className="h-4 w-4" /> History
                  </button>
                </div>
              </div>
            </motion.div>
          </header>


          {/* ── Game Shop ── */}
          <AnimatedSection delay={0.05}>
            <section className="px-5 pb-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <span className="w-1 h-8 rounded-full bg-gradient-to-b from-primary to-fuchsia-500" />
                  <div>
                    <h2 className="text-base font-display font-bold tracking-tight">Game Shop</h2>
                    <p className="text-[11px] text-muted-foreground -mt-0.5">Instant top-up at official rates</p>
                  </div>
                </div>
                <button
                  onClick={() => navigate("/game?g=")}
                  className="inline-flex items-center gap-1 text-xs text-primary font-semibold px-3 h-8 rounded-full bg-primary/10 border border-primary/20 hover:bg-primary/15 transition"
                >
                  View All <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {catalogGames.map((cg, i) => {
                  const g = {
                    id: cg.category_key,
                    name: cg.name,
                    short: cg.short_name || cg.name,
                    image: cg.image_url || "/images/games/mobile-legends.png",
                  };
                  return (
                  <motion.button
                    key={g.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 + i * 0.05 }}
                    whileTap={{ scale: 0.96 }}
                    whileHover={{ y: -3 }}
                    onClick={() => navigate(`/game?g=${encodeURIComponent(g.id)}`)}
                    className="rounded-2xl overflow-hidden bg-card border border-border/60 hover:border-primary/40 hover:shadow-xl transition-all text-left"
                  >
                    <div className="aspect-square bg-muted overflow-hidden">
                      <img
                        src={g.image}
                        alt={g.name}
                        loading="lazy"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-2">
                      <p className="text-[11px] font-bold leading-tight truncate">{g.short}</p>
                      <p className="text-[9px] text-muted-foreground truncate">Instant</p>
                    </div>
                  </motion.button>
                ))}
              </div>
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

          {/* ── Earn Coins (compact) ── */}
          <AnimatedSection delay={0.2}>
            <section className="px-5 mt-6">
              <motion.button
                whileTap={{ scale: 0.985 }}
                onClick={() => navigate("/games")}
                className="w-full text-left rounded-3xl overflow-hidden relative border border-primary/25 bg-gradient-to-br from-primary/15 via-fuchsia-500/10 to-transparent p-4"
              >
                <div className="absolute -right-6 -top-8 h-28 w-28 rounded-full bg-primary/20 blur-2xl" />
                <div className="relative flex items-center gap-3">
                  <div className="h-11 w-11 shrink-0 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center">
                    <Gamepad2 className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <h2 className="text-sm font-display font-bold tracking-tight">Earn Coins</h2>
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-yellow-400/15 border border-yellow-400/30 px-1.5 py-[1px] text-[9px] font-extrabold text-yellow-600 dark:text-yellow-300">
                        <Zap className="h-2.5 w-2.5" fill="currentColor" /> FREE
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate">
                      Play mini games and earn coins instantly
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-primary shrink-0" />
                </div>

                <div className="relative mt-3 flex gap-2 overflow-x-auto no-scrollbar">
                  {EARN_POINTS_GAMES.map((game) => (
                    <span
                      key={game.id}
                      className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-background/70 border border-border/60 px-2.5 py-1"
                    >
                      <span className="text-sm leading-none">{game.emoji}</span>
                      <span className="text-[11px] font-semibold">{game.name}</span>
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                        +{game.points}
                      </span>
                    </span>
                  ))}
                </div>
              </motion.button>
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
