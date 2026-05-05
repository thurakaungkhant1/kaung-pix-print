import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ShoppingBag, 
  Crown,
  Star,
  ChevronRight,
  Sparkles,
  Users,
  Package,
  Camera,
  Percent,
  Clock,
  ArrowRight,
  Flame,
  Shield,
  Zap,
  Gamepad2,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import MobileLayout from "@/components/MobileLayout";
import OnboardingFlow from "@/components/OnboardingFlow";
import WalletDisplay from "@/components/WalletDisplay";
import { supabase } from "@/integrations/supabase/client";
import { SkeletonCard, SkeletonHorizontalList } from "@/components/ui/skeleton-card";
import AdBanner from "@/components/AdBanner";
import AppFooter from "@/components/AppFooter";
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
  Percent,
  Crown,
  Package,
  Flame,
  Sparkles,
  Clock,
  Star,
  ShoppingBag,
  Camera,
  Shield,
  Users,
};

const getBannerColor = (colorName: string): string => {
  const colorMap: Record<string, string> = {
    'rose-500': '#f43f5e',
    'pink-500': '#ec4899',
    'orange-400': '#fb923c',
    'violet-600': '#7c3aed',
    'purple-600': '#9333ea',
    'indigo-600': '#4f46e5',
    'emerald-500': '#10b981',
    'teal-500': '#14b8a6',
    'cyan-500': '#06b6d4',
    'blue-500': '#3b82f6',
    'green-500': '#22c55e',
    'amber-500': '#f59e0b',
    'red-500': '#ef4444',
    'yellow-500': '#eab308',
  };
  return colorMap[colorName] || colorMap['rose-500'];
};

const Home = () => {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [physicalProducts, setPhysicalProducts] = useState<any[]>([]);
  const [recentPhotos, setRecentPhotos] = useState<any[]>([]);
  
  const [banners, setBanners] = useState<PromotionalBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const bannerContainerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  // Auto-scroll banners with progress bar
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

    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
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
  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };
  const handleTouchEnd = () => {
    const diff = touchStartX.current - touchEndX.current;
    if (Math.abs(diff) > 50) {
      if (diff > 0) setCurrentBannerIndex((prev) => (prev + 1) % banners.length);
      else setCurrentBannerIndex((prev) => (prev - 1 + banners.length) % banners.length);
    }
    setTimeout(() => setIsPaused(false), 3000);
  };

  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem("hasSeenOnboarding");
    if (!hasSeenOnboarding) setShowOnboarding(true);
  }, []);

  useEffect(() => {
    const loadData = async () => {
      const { data: productsData } = await supabase
        .from('products')
        .select('*')
        .not('category', 'ilike', '%diamond%')
        .not('category', 'ilike', '%game%')
        .not('category', 'ilike', '%mobile legends%')
        .not('category', 'ilike', '%pubg%')
        .not('category', 'ilike', '%free fire%')
        .not('category', 'ilike', '%phone%')
        .not('category', 'ilike', '%data%')
        .not('category', 'ilike', '%mobile%')
        .not('category', 'ilike', '%top-up%')
        .not('category', 'ilike', '%topup%')
        .not('category', 'ilike', '%bill%')
        .not('category', 'ilike', '%prepaid%')
        .not('category', 'ilike', '%airtime%')
        .not('category', 'ilike', '%recharge%')
        .not('name', 'ilike', '%phone%')
        .not('name', 'ilike', '%data%')
        .not('name', 'ilike', '%mobile%')
        .not('name', 'ilike', '%top-up%')
        .not('name', 'ilike', '%topup%')
        .not('name', 'ilike', '%bill%')
        .not('name', 'ilike', '%prepaid%')
        .not('name', 'ilike', '%airtime%')
        .not('name', 'ilike', '%recharge%')
        .not('name', 'ilike', '%mpt%')
        .not('name', 'ilike', '%ooredoo%')
        .not('name', 'ilike', '%mytel%')
        .not('name', 'ilike', '%atom%')
        .limit(6);
      if (productsData) setPhysicalProducts(productsData);

      const { data: photosData } = await supabase
        .from('photos')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(6);
      if (photosData) setRecentPhotos(photosData);


      const { data: bannersData } = await supabase
        .from('promotional_banners')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      if (bannersData) setBanners(bannersData);

      setLoading(false);
    };
    loadData();
  }, []);

  const handleOnboardingComplete = useCallback(() => {
    localStorage.setItem("hasSeenOnboarding", "true");
    setShowOnboarding(false);
  }, []);

  return (
    <>
      <OnboardingFlow isOpen={showOnboarding} onComplete={handleOnboardingComplete} />
      
      <AnimatedPage>
      <MobileLayout className="max-w-screen-xl mx-auto">
        {/* ── Hero Header ── */}
        <header className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-hero" />
          <div className="absolute inset-0 bg-gradient-glow opacity-70" />
          <div className="absolute -top-24 -right-24 w-72 h-72 bg-primary-foreground/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-primary-foreground/5 rounded-full blur-2xl" />

          <div className="relative z-10 p-5 pt-8 pb-7">
            <motion.div
              initial={{ y: -15, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="flex items-center justify-between mb-1"
            >
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="h-4 w-4 text-primary-foreground/70" />
                  <span className="text-xs font-medium text-primary-foreground/60 uppercase tracking-widest">
                    Welcome to
                  </span>
                </div>
                <h1 className="text-3xl font-display font-black text-primary-foreground tracking-tight">
                  Kaung Computer
                </h1>
                <p className="text-sm text-primary-foreground/60 mt-1">
                  Your trusted digital marketplace
                </p>
              </div>
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="p-3 bg-primary-foreground/10 rounded-2xl backdrop-blur-md border border-primary-foreground/10"
              >
                <Zap className="h-7 w-7 text-primary-foreground/80" />
              </motion.div>
            </motion.div>
          </div>
        </header>

        {/* Wallet */}
        {user && (
          <motion.section
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="px-5 -mt-3 relative z-20"
          >
            <WalletDisplay />
          </motion.section>
        )}

        {/* ── Promotional Banners ── */}
        {banners.length > 0 && (
          <section className="px-5 pt-5">
            <div 
              ref={bannerContainerRef}
              className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide scroll-smooth"
              onMouseEnter={() => setIsPaused(true)}
              onMouseLeave={() => setIsPaused(false)}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              {banners.map((banner) => {
                const IconComponent = ICON_MAP[banner.icon_name] || Sparkles;
                return (
                  <Card 
                    key={banner.id}
                    className="flex-shrink-0 w-[85%] overflow-hidden rounded-2xl border-0 cursor-pointer hover:shadow-xl transition-all group"
                    style={{
                      background: `linear-gradient(135deg, ${getBannerColor(banner.gradient_from)}, ${banner.gradient_via ? getBannerColor(banner.gradient_via) + ',' : ''} ${getBannerColor(banner.gradient_to)})`,
                    }}
                    onClick={() => navigate(banner.link_url)}
                  >
                    <CardContent className="p-5 relative">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
                      <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full blur-xl" />
                      
                      <div className="relative z-10 flex items-center justify-between">
                        <div className="space-y-2">
                          {banner.badge_text && (
                            <div className="flex items-center gap-2">
                              <IconComponent className="h-4 w-4 text-yellow-200 animate-pulse" />
                              <Badge className="bg-white/20 text-white border-0 backdrop-blur-sm text-[10px]">
                                {banner.badge_text}
                              </Badge>
                            </div>
                          )}
                          <h3 className="text-xl font-display font-black text-white leading-tight">
                            {banner.title}
                          </h3>
                          {banner.description && (
                            <p className="text-white/70 text-xs leading-relaxed">{banner.description}</p>
                          )}
                          <div className="flex items-center gap-1.5 pt-1">
                            <span className="text-white font-semibold text-xs group-hover:underline">
                              {banner.link_text}
                            </span>
                            <ArrowRight className="h-3.5 w-3.5 text-white group-hover:translate-x-1 transition-transform" />
                          </div>
                        </div>
                        <div className="p-3.5 bg-white/15 rounded-2xl backdrop-blur-sm flex-shrink-0">
                          <IconComponent className="h-8 w-8 text-white" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
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
                    style={{ width: index === currentBannerIndex ? '28px' : '8px' }}
                  >
                    <div className={cn(
                      "absolute inset-0 rounded-full",
                      index === currentBannerIndex ? "bg-primary/25" : "bg-muted-foreground/25"
                    )} />
                    {index === currentBannerIndex && (
                      <div 
                        className="absolute inset-y-0 left-0 bg-primary rounded-full transition-all duration-75 ease-linear"
                        style={{ width: `${progress}%` }}
                      />
                    )}
                  </button>
                ))}
              </div>
            )}
          </section>
        )}

        <AdBanner pageLocation="home" position="top" className="px-5 pt-4" />

        {/* ── Products Section ── */}
        <AnimatedSection>
        <section className="pt-6 pb-2 space-y-4">
          <div className="flex items-center justify-between px-5">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-primary/10">
                <Package className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-display font-bold leading-tight">Products</h2>
                <p className="text-[11px] text-muted-foreground">Browse our latest items</p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="gap-1 text-primary text-xs h-8 px-3"
              onClick={() => navigate("/physical-products")}
            >
              View All <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
          
          {loading ? (
            <div className="px-5">
              <SkeletonHorizontalList count={4} />
            </div>
          ) : physicalProducts.length > 0 ? (
            <div className="flex gap-3 overflow-x-auto px-5 pb-3 scrollbar-hide">
              {physicalProducts.map((product, index) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * index, duration: 0.4 }}
                  onClick={() => navigate(`/product/${product.id}`)}
                  className="flex-shrink-0 w-36 cursor-pointer group"
                >
                  <Card className="overflow-hidden border-border/50 hover:border-primary/30 transition-all rounded-2xl hover:shadow-md">
                    <div className="aspect-square bg-muted overflow-hidden relative">
                      <img 
                        src={product.image_url} 
                        alt={product.name}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-foreground/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      {product.original_price && product.original_price > product.price && (
                        <div className="absolute top-2 left-2">
                          <Badge className="bg-destructive text-destructive-foreground border-0 text-[9px] px-1.5 py-0.5 font-bold">
                            -{Math.round((1 - product.price / product.original_price) * 100)}%
                          </Badge>
                        </div>
                      )}
                    </div>
                    <CardContent className="p-2.5 space-y-1">
                      <h3 className="font-medium text-xs line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                        {product.name}
                      </h3>
                      <div className="flex items-baseline gap-1.5">
                        <p className="text-primary font-bold text-sm">{product.price.toLocaleString()} Ks</p>
                        {product.original_price && product.original_price > product.price && (
                          <p className="text-muted-foreground text-[10px] line-through">
                            {product.original_price.toLocaleString()}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
              {/* View All Card */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.35 }}
                className="flex-shrink-0 w-36 cursor-pointer"
                onClick={() => navigate("/physical-products")}
              >
                <Card className="overflow-hidden border-dashed hover:border-primary/50 transition-all rounded-2xl h-full">
                  <div className="aspect-[3/4] flex flex-col items-center justify-center text-muted-foreground gap-2">
                    <div className="p-3 rounded-full bg-muted">
                      <ChevronRight className="h-5 w-5" />
                    </div>
                    <span className="text-xs font-medium">View All</span>
                  </div>
                </Card>
              </motion.div>
            </div>
          ) : (
            <div className="px-5">
              <Card className="p-8 text-center border-dashed rounded-2xl">
                <Package className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">No products available yet</p>
              </Card>
            </div>
          )}
        </section>
        </AnimatedSection>

        {/* Photo Gallery Preview */}
        {recentPhotos.length > 0 && (
          <AnimatedSection delay={0.4}>
            <section className="mb-6">
              <div className="flex items-center justify-between px-5 mb-3">
                <div className="flex items-center gap-2">
                  <Camera className="h-4 w-4 text-primary" />
                  <h2 className="font-bold text-sm">Photo Gallery</h2>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-primary gap-1 h-7"
                  onClick={() => navigate("/photo")}
                >
                  View All <ArrowRight className="h-3 w-3" />
                </Button>
              </div>
              <div className="flex gap-2.5 overflow-x-auto scrollbar-none px-5 pb-2">
                {recentPhotos.map((photo, index) => (
                  <motion.div
                    key={photo.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex-shrink-0 w-28 cursor-pointer group"
                    onClick={() => navigate(`/photo/${photo.id}`)}
                  >
                    <div className="aspect-square rounded-xl overflow-hidden border border-border/50 group-hover:border-primary/30 transition-all shadow-sm group-hover:shadow-md">
                      <img
                        src={photo.preview_image || photo.file_url}
                        alt={photo.client_name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1 truncate text-center">
                      {photo.client_name}
                    </p>
                  </motion.div>
                ))}
              </div>
            </section>
          </AnimatedSection>
        )}

        {/* Mini Games Preview */}
        <AnimatedSection delay={0.5}>
          <section className="mb-6">
            <div className="flex items-center justify-between px-5 mb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-primary/10">
                  <Gamepad2 className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-display font-bold leading-tight">Mini Games</h2>
                  <p className="text-[11px] text-muted-foreground">Play & earn game points</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1 text-primary text-xs h-8 px-3"
                onClick={() => navigate("/games")}
              >
                Play All <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="flex gap-3 overflow-x-auto px-5 pb-3 scrollbar-hide">
              {[
                { name: "Tic Tac Toe", icon: "🎯", color: "from-blue-500/20 to-cyan-500/20", border: "border-blue-500/30" },
                { name: "Snake", icon: "🐍", color: "from-green-500/20 to-emerald-500/20", border: "border-green-500/30" },
                { name: "2048", icon: "🧮", color: "from-amber-500/20 to-orange-500/20", border: "border-amber-500/30" },
                { name: "Flappy Bird", icon: "🐦", color: "from-teal-500/20 to-cyan-500/20", border: "border-teal-500/30" },
                { name: "Memory", icon: "🧠", color: "from-purple-500/20 to-violet-500/20", border: "border-purple-500/30" },
                { name: "Quiz", icon: "❓", color: "from-indigo-500/20 to-blue-500/20", border: "border-indigo-500/30" },
              ].map((game, index) => (
                <motion.div
                  key={game.name}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex-shrink-0 cursor-pointer group"
                  onClick={() => navigate("/games")}
                >
                  <div className={`w-24 h-28 rounded-2xl bg-gradient-to-br ${game.color} border ${game.border}
                    flex flex-col items-center justify-center gap-2 group-hover:scale-105 transition-all duration-300
                    group-hover:shadow-md`}>
                    <span className="text-3xl">{game.icon}</span>
                    <span className="text-[10px] font-semibold text-foreground">{game.name}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>
        </AnimatedSection>

        <AdBanner pageLocation="home" position="inline" className="px-5 mb-6" />

        {/* Footer */}
        <AppFooter />
        <div className="text-center py-3 pb-24">
          <p className="text-[10px] text-muted-foreground/50 tracking-wide">
            created by thurakaungkhant
          </p>
        </div>
      </MobileLayout>
      </AnimatedPage>
    </>
  );
};

export default Home;
