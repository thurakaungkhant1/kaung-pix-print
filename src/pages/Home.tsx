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

const EARN_POINTS_GAMES = [
  { id: "car-dodge", name: "Car Dodge", points: 20, gradient: "from-rose-500 via-pink-500 to-orange-400", pattern: "game-pattern-dodge", emoji: "🏎️" },
  { id: "bubble-pop", name: "Bubble Pop", points: 15, gradient: "from-fuchsia-500 via-violet-500 to-cyan-400", pattern: "game-pattern-bubbles", emoji: "🫧" },
];

const Home = () => {
  const [digitalCats, setDigitalCats] = useState<DigitalCategory[]>([]);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [recentPhotos, setRecentPhotos] = useState<any[]>([]);
  const [banners, setBanners] = useState<PromotionalBanner[]>([]);
  const [photosLoading, setPhotosLoading] = useState(true);
  const [walletBalance, setWalletBalance] = useState<number>(0);
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
    const loadDigital = async () => {
      const { data } = await (supabase as any)
        .from('digital_categories')
        .select('id,name,slug,icon,display_order,is_active')
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      setDigitalCats((data || []) as DigitalCategory[]);
    };
    loadDigital();
    const channel = supabase
      .channel('home-digital-cats')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'digital_categories' }, () => loadDigital())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    if (!user) return;
    supabase.from('profiles').select('name, wallet_balance').eq('id', user.id).single()
      .then(({ data }) => {
        if (data) {
          setProfileName(data.name || "");
          setWalletBalance(Number(data.wallet_balance) || 0);
        }
      });
    const channel = supabase
      .channel('home-wallet')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` },
        (payload) => {
          if (payload.new && typeof payload.new.wallet_balance === 'number') {
            setWalletBalance(payload.new.wallet_balance);
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
          {/* ── Top Bar: sleek profile widget ── */}
          <header className="px-5 pt-7 pb-5">
            <motion.div
              initial={{ y: -10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="glass-card rounded-2xl p-2.5 pl-3 flex items-center gap-3 shadow-sm"
            >
              <button
                onClick={() => navigate('/account')}
                className="relative w-11 h-11 rounded-xl bg-gradient-to-br from-fuchsia-500 via-pink-500 to-orange-400 flex items-center justify-center text-white font-display font-bold text-base shadow-md ring-2 ring-white/60 dark:ring-white/10 flex-shrink-0"
                aria-label="Open account"
              >
                {greetingName.charAt(0).toUpperCase()}
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-background" />
              </button>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground/80 leading-none mb-1">
                  Mingalarpar 🙏
                </p>
                <h1 className="text-sm font-display font-bold text-foreground truncate leading-tight">
                  {greetingName}
                </h1>
              </div>
              <button
                onClick={() => navigate('/top-up')}
                className="flex items-center gap-1.5 px-3 h-10 rounded-xl bg-gradient-to-r from-primary/15 to-fuchsia-500/15 border border-primary/25 hover:from-primary/25 hover:to-fuchsia-500/25 transition-all shadow-sm"
              >
                <Wallet className="h-4 w-4 text-primary" />
                <span className="text-xs font-bold text-primary tabular-nums">
                  {formatMMK(walletBalance)}
                </span>
              </button>
              <button
                onClick={() => navigate('/account')}
                className="w-10 h-10 rounded-xl bg-card/70 border border-border/60 flex items-center justify-center hover:bg-muted transition-colors flex-shrink-0"
                aria-label="Notifications"
              >
                <Bell className="h-4 w-4 text-foreground" />
              </button>
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

                <div className="relative z-10 p-6">
                  <div className="flex items-start gap-3">
                    <div className="p-3 rounded-2xl bg-emerald-500/15 ring-1 ring-emerald-400/30 backdrop-blur">
                      <Package className="h-6 w-6 text-emerald-300" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <Badge className="bg-emerald-400/15 text-emerald-300 border border-emerald-400/30 text-[10px] mb-1.5 tracking-[0.18em] font-bold rounded-full px-2.5 py-0.5">
                        ONYX • EMERALD
                      </Badge>
                      <h3 className="text-2xl font-display font-black text-white leading-tight tracking-tight drop-shadow">
                        Digital Products
                      </h3>
                      <p className="text-white/70 text-xs mt-1">
                        Premium software, streaming, gift cards & courses.
                      </p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-emerald-300 mt-2 group-hover:translate-x-1 transition-transform" />
                  </div>

                  <div className="mt-5 grid grid-cols-4 gap-2">
                    {[
                      { label: "Software", icon: Shield },
                      { label: "Streaming", icon: Sparkles },
                      { label: "Gift Cards", icon: Star },
                      { label: "Courses", icon: Zap },
                    ].map((f) => (
                      <div
                        key={f.label}
                        className="rounded-xl px-2 py-2.5 flex flex-col items-center gap-1 bg-white/[0.04] border border-white/10 backdrop-blur-sm transition-all duration-300 group-hover:-translate-y-0.5 hover:bg-emerald-500/10 hover:border-emerald-400/30"
                      >
                        <f.icon className="h-4 w-4 text-emerald-300" />
                        <span className="text-white/90 text-[10px] font-semibold tracking-wide">
                          {f.label}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-1.5 px-5 h-10 rounded-full bg-emerald-400 text-black font-bold text-xs shadow-[0_8px_24px_-6px_rgba(16,185,129,0.6)]">
                      <Sparkles className="h-3.5 w-3.5" />
                      Browse Catalog
                      <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                    <span className="text-[10px] text-emerald-300/80 font-medium tracking-wider">
                      NEW LOOK
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

          {/* ── Earn Points (Featured Mini Games) ── */}
          <AnimatedSection delay={0.2}>
            <section className="px-5 mt-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-display font-bold">Earn Points</h2>
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
                      {/* Abstract pattern overlay */}
                      <div className={cn("absolute inset-0 opacity-80", game.pattern)} />
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.35),transparent_55%)]" />

                      {/* Floating game emoji */}
                      <motion.div
                        animate={{ y: [0, -6, 0], rotate: [0, 4, 0] }}
                        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: i * 0.4 }}
                        className="absolute right-3 bottom-3 text-4xl drop-shadow-lg"
                      >
                        {game.emoji}
                      </motion.div>

                      {/* +pts glass badge */}
                      <div className="absolute top-2.5 right-2.5 glass-chip rounded-full px-2 py-1 flex items-center gap-1 shadow-sm">
                        <Zap className="h-3 w-3 text-yellow-200" fill="currentColor" />
                        <span className="text-[10px] font-extrabold text-white tracking-wide">
                          +{game.points}
                        </span>
                      </div>

                      {/* Bottom glass title bar */}
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
            </section>
          </AnimatedSection>





          {/* ── Photo Gallery Preview ── */}
          <AnimatedSection delay={0.3}>
            <section className="px-5 mt-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-display font-bold">Photo Gallery</h2>
                <button onClick={() => navigate("/photo")} className="text-xs text-primary font-semibold">
                  See All
                </button>
              </div>
              {photosLoading ? (
                <div className="aspect-[16/10] rounded-2xl bg-muted animate-pulse" />
              ) : recentPhotos.length > 0 ? (
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate(`/photo/${recentPhotos[0].id}`)}
                  className="w-full text-left rounded-2xl overflow-hidden bg-card border border-border/60 hover:shadow-lg transition-all"
                >
                  <div className="aspect-[16/10] relative bg-muted overflow-hidden">
                    <img
                      src={recentPhotos[0].preview_image || recentPhotos[0].file_url}
                      alt={recentPhotos[0].client_name}
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                    <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2 text-white">
                      <Camera className="h-4 w-4" />
                      <p className="text-sm font-semibold drop-shadow-lg truncate">View Exclusive Wallpapers</p>
                    </div>
                  </div>
                </motion.button>
              ) : (
                <Card className="p-8 text-center border-dashed rounded-2xl">
                  <Camera className="h-7 w-7 mx-auto text-muted-foreground/60 mb-2" />
                  <p className="text-sm text-muted-foreground">No photos yet</p>
                </Card>
              )}
            </section>
          </AnimatedSection>
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
