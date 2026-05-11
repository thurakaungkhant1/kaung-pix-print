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
};

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
  { id: "car-dodge", name: "Car Dodge", points: 20, gradient: "from-rose-500 to-orange-500" },
  { id: "bubble-pop", name: "Bubble Pop", points: 15, gradient: "from-fuchsia-500 to-cyan-500" },
];

const Home = () => {
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
          {/* ── Top Bar: greeting + wallet pill + bell ── */}
          <header className="px-5 pt-6 pb-4">
            <motion.div
              initial={{ y: -10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="flex items-center justify-between gap-3"
            >
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground/80 mb-0.5">
                  Mingalarpar! 🙏
                </p>
                <h1 className="text-lg font-display font-bold text-foreground truncate">
                  {greetingName}
                </h1>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => navigate('/top-up')}
                  className="flex items-center gap-1.5 px-3 h-10 rounded-full bg-primary/10 border border-primary/20 hover:bg-primary/15 transition-colors"
                >
                  <Wallet className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold text-primary tabular-nums">
                    {formatMMK(walletBalance)}
                  </span>
                </button>
                <button
                  onClick={() => navigate('/account')}
                  className="w-10 h-10 rounded-full bg-card border border-border/60 flex items-center justify-center hover:bg-muted transition-colors"
                  aria-label="Notifications"
                >
                  <Bell className="h-4 w-4 text-foreground" />
                </button>
              </div>
            </motion.div>
          </header>

          {/* ── AI Suite Card (featured at top) ── */}
          <AnimatedSection delay={0.05}>
            <section className="px-5 pb-4">
              <motion.button
                whileTap={{ scale: 0.98 }}
                whileHover={{ y: -2 }}
                onClick={() => navigate("/ai")}
                aria-label="Open As You Like AI Suite"
                className="w-full text-left relative overflow-hidden rounded-3xl group shadow-xl ring-1 ring-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                style={{ background: "linear-gradient(135deg, #7c3aed 0%, #ec4899 55%, #3b82f6 100%)" }}
              >
                <div className="absolute -top-16 -right-10 w-52 h-52 bg-white/20 rounded-full blur-3xl" />
                <div className="absolute -bottom-16 -left-10 w-48 h-48 bg-white/10 rounded-full blur-3xl" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.18),transparent_55%)]" />

                <div className="relative z-10 p-5">
                  <div className="flex items-start gap-3">
                    <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md border border-white/25 shadow-inner">
                      <Sparkles className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <Badge className="bg-white/25 text-white border-0 text-[10px] mb-1.5 hover:bg-white/25 backdrop-blur">
                        NEW • AI SUITE
                      </Badge>
                      <h3 className="text-lg sm:text-xl font-display font-black text-white leading-tight drop-shadow">
                        As You Like AI
                      </h3>
                      <p className="text-white/85 text-xs mt-0.5">
                        Photo • Passport • Prompts • Gift Link
                      </p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-white mt-2 group-hover:translate-x-1 transition-transform" />
                  </div>

                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {[
                      { label: "Photo", icon: Camera },
                      { label: "Passport", icon: Shield },
                      { label: "Prompts", icon: Zap },
                      { label: "Gift Link", icon: Sparkles },
                    ].map((f) => (
                      <span
                        key={f.label}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/15 backdrop-blur border border-white/20 text-white text-[10px] font-semibold"
                      >
                        <f.icon className="h-3 w-3" />
                        {f.label}
                      </span>
                    ))}
                  </div>

                  <div className="mt-4 inline-flex items-center gap-1.5 px-3.5 h-9 rounded-full bg-white text-purple-700 font-bold text-xs shadow-lg group-hover:shadow-xl transition-shadow">
                    Try AI Now
                    <ArrowRight className="h-3.5 w-3.5" />
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
                    onClick={() => navigate("/games")}
                    className="text-left rounded-2xl overflow-hidden bg-card border border-border/60 hover:shadow-lg transition-all"
                  >
                    <div className={cn("aspect-[4/3] bg-gradient-to-br relative overflow-hidden", game.gradient)}>
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.3),transparent_50%)]" />
                      <Gamepad2 className="absolute right-2 bottom-2 h-12 w-12 text-white/30" />
                    </div>
                    <div className="p-3">
                      <p className="text-sm font-bold text-foreground mb-1">{game.name}</p>
                      <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                        <Gamepad2 className="h-3 w-3" />
                        +{game.points} pts
                      </div>
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
