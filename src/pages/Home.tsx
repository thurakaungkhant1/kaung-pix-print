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
  Shield
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import MobileLayout from "@/components/MobileLayout";
import OnboardingFlow from "@/components/OnboardingFlow";
import WalletDisplay from "@/components/WalletDisplay";
import { supabase } from "@/integrations/supabase/client";
import { SkeletonCard, SkeletonHorizontalList } from "@/components/ui/skeleton-card";
import AdBanner from "@/components/AdBanner";

interface Photo {
  id: number;
  client_name: string;
  preview_image: string | null;
  category: string | null;
}

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
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [banners, setBanners] = useState<PromotionalBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const bannerContainerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();
  const navigate = useNavigate();

  // Auto-scroll banners with progress bar (pauses on hover/touch)
  useEffect(() => {
    if (banners.length <= 1) return;

    // Clear any existing interval
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }

    if (isPaused) {
      return;
    }

    // Reset progress when banner changes
    setProgress(0);
    
    // Progress bar animation - update every 40ms for smooth animation
    const progressStep = 100 / (4000 / 40); // 4 seconds total
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
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [banners.length, isPaused, currentBannerIndex]);

  // Scroll to current banner
  useEffect(() => {
    if (bannerContainerRef.current && banners.length > 1) {
      const container = bannerContainerRef.current;
      const bannerWidth = container.scrollWidth / banners.length;
      container.scrollTo({
        left: bannerWidth * currentBannerIndex,
        behavior: 'smooth'
      });
    }
  }, [currentBannerIndex, banners.length]);

  // Swipe gesture handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
    setIsPaused(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    const swipeThreshold = 50;
    const diff = touchStartX.current - touchEndX.current;

    if (Math.abs(diff) > swipeThreshold) {
      if (diff > 0) {
        // Swiped left - go to next
        setCurrentBannerIndex((prev) => (prev + 1) % banners.length);
      } else {
        // Swiped right - go to previous
        setCurrentBannerIndex((prev) => (prev - 1 + banners.length) % banners.length);
      }
    }
    
    // Resume auto-scroll after a delay
    setTimeout(() => setIsPaused(false), 3000);
  };

  // Check if user has seen onboarding
  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem("hasSeenOnboarding");
    if (!hasSeenOnboarding) {
      setShowOnboarding(true);
    }
  }, []);

  // Load physical products, photos, and banners
  useEffect(() => {
    const loadData = async () => {
      // Load physical products
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
      
      if (productsData) {
        setPhysicalProducts(productsData);
      }

      // Load photos
      const { data: photosData } = await supabase
        .from('photos')
        .select('id, client_name, preview_image, category')
        .order('created_at', { ascending: false })
        .limit(6);

      if (photosData) {
        setPhotos(photosData);
      }

      // Load promotional banners
      const { data: bannersData } = await supabase
        .from('promotional_banners')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (bannersData) {
        setBanners(bannersData);
      }

      setLoading(false);
    };
    loadData();
  }, []);

  const handleOnboardingComplete = useCallback(() => {
    localStorage.setItem("hasSeenOnboarding", "true");
    setShowOnboarding(false);
  }, []);

  const getGradientClass = (from: string, via: string | null, to: string) => {
    if (via) {
      return `bg-gradient-to-br from-${from} via-${via} to-${to}`;
    }
    return `bg-gradient-to-br from-${from} to-${to}`;
  };

  return (
    <>
      {/* Onboarding Flow for new users */}
      <OnboardingFlow isOpen={showOnboarding} onComplete={handleOnboardingComplete} />
      
      <MobileLayout className="max-w-screen-xl mx-auto">
        {/* Wallet Display */}
        {user && (
          <section className="px-6 pt-6">
            <WalletDisplay />
          </section>
        )}

        {/* Promotional Banner Section - Dynamic */}
        {banners.length > 0 && (
          <section className="px-6 pt-6">
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
                    className={cn(
                      "flex-shrink-0 w-[85%] overflow-hidden rounded-2xl border-0 cursor-pointer hover:shadow-xl transition-all group",
                      getGradientClass(banner.gradient_from, banner.gradient_via, banner.gradient_to)
                    )}
                    style={{
                      background: `linear-gradient(to bottom right, var(--tw-gradient-from), ${banner.gradient_via ? 'var(--tw-gradient-via),' : ''} var(--tw-gradient-to))`,
                      ['--tw-gradient-from' as any]: getBannerColor(banner.gradient_from),
                      ['--tw-gradient-via' as any]: banner.gradient_via ? getBannerColor(banner.gradient_via) : undefined,
                      ['--tw-gradient-to' as any]: getBannerColor(banner.gradient_to),
                    }}
                    onClick={() => navigate(banner.link_url)}
                  >
                    <CardContent className="p-5 relative">
                      {/* Decorative elements */}
                      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
                      <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full blur-xl" />
                      
                      <div className="relative z-10 flex items-center justify-between">
                        <div className="space-y-2">
                          {banner.badge_text && (
                            <div className="flex items-center gap-2">
                              <IconComponent className="h-5 w-5 text-yellow-200 animate-pulse" />
                              <Badge className="bg-white/20 text-white border-0 backdrop-blur-sm">
                                {banner.badge_text}
                              </Badge>
                            </div>
                          )}
                          <h3 className="text-2xl font-display font-black text-white">
                            {banner.title}
                          </h3>
                          {banner.description && (
                            <p className="text-white/80 text-sm">
                              {banner.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2 pt-2">
                            <span className="text-white font-semibold text-sm group-hover:underline">
                              {banner.link_text}
                            </span>
                            <ArrowRight className="h-4 w-4 text-white group-hover:translate-x-1 transition-transform" />
                          </div>
                        </div>
                        <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-sm">
                          <IconComponent className="h-10 w-10 text-white" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            
            {/* Progress indicator with dots */}
            {banners.length > 1 && (
              <div className="flex justify-center gap-2 pt-3">
                {banners.map((_, index) => (
                  <button 
                    key={index}
                    onClick={() => {
                      setCurrentBannerIndex(index);
                      setProgress(0);
                    }}
                    className="relative h-1.5 rounded-full overflow-hidden transition-all"
                    style={{ width: index === currentBannerIndex ? '32px' : '8px' }}
                  >
                    {/* Background */}
                    <div className={cn(
                      "absolute inset-0 rounded-full",
                      index === currentBannerIndex ? "bg-primary/30" : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                    )} />
                    {/* Progress fill - only show on current banner */}
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

        {/* Physical Products Section */}
        <section className="py-6 space-y-4">
          <div className="flex items-center justify-between px-6">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-display font-bold">Products</h2>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="gap-1 text-primary"
              onClick={() => navigate("/physical-products")}
            >
              View All <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          
          {loading ? (
            <div className="px-6">
              <SkeletonHorizontalList count={4} />
            </div>
          ) : physicalProducts.length > 0 ? (
            <div className="flex gap-4 overflow-x-auto px-6 pb-4 scrollbar-hide">
              {physicalProducts.map((product, index) => (
                <Card 
                  key={product.id}
                  className="flex-shrink-0 w-40 overflow-hidden border-border/50 hover:border-primary/30 transition-all animate-scale-in cursor-pointer rounded-2xl hover-lift card-shine group"
                  style={{ animationDelay: `${index * 50}ms` }}
                  onClick={() => navigate(`/product/${product.id}`)}
                >
                  <div className="aspect-square bg-muted overflow-hidden rounded-t-2xl relative">
                    <img 
                      src={product.image_url} 
                      alt={product.name}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <CardContent className="p-3 space-y-1">
                    <h3 className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors">{product.name}</h3>
                    <p className="text-primary font-bold text-sm">{product.price.toLocaleString()} Ks</p>
                  </CardContent>
                </Card>
              ))}
              {/* View All Card */}
              <Card 
                className="flex-shrink-0 w-40 overflow-hidden border-dashed cursor-pointer hover:border-primary/50 transition-all rounded-2xl hover-lift"
                onClick={() => navigate("/physical-products")}
              >
                <div className="aspect-[3/4] flex flex-col items-center justify-center text-muted-foreground">
                  <ChevronRight className="h-8 w-8 mb-2" />
                  <span className="text-sm font-medium">View All</span>
                </div>
              </Card>
            </div>
          ) : (
            <div className="px-6">
              <Card className="p-8 text-center border-dashed rounded-2xl">
                <Package className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">No products available yet</p>
              </Card>
            </div>
          )}
        </section>

        {/* Photo Gallery Section */}
        <section className="py-6 space-y-4">
          <div className="flex items-center justify-between px-6">
            <div className="flex items-center gap-2">
              <Camera className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-display font-bold">Photo Gallery</h2>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="gap-1 text-primary"
              onClick={() => navigate("/photo")}
            >
              View All <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          
          {loading ? (
             <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 px-6">
              {[...Array(6)].map((_, i) => (
                <SkeletonCard key={i} variant="photo" style={{ animationDelay: `${i * 50}ms` }} />
              ))}
            </div>
          ) : photos.length > 0 ? (
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 px-6">
              {photos.map((photo, index) => (
                <Card 
                  key={photo.id}
                  className="overflow-hidden border-border/50 hover:border-primary/30 transition-all animate-scale-in cursor-pointer rounded-2xl hover-lift card-shine group"
                  style={{ animationDelay: `${index * 50}ms` }}
                  onClick={() => navigate("/photo")}
                >
                  <div className="aspect-square bg-muted overflow-hidden relative">
                    <div className="absolute inset-0 bg-gradient-to-t from-background/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity z-10" />
                    {photo.preview_image ? (
                      <img
                        src={photo.preview_image} 
                        alt={photo.client_name}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Camera className="h-8 w-8 text-muted-foreground/50" />
                      </div>
                    )}
                    {/* Overlay gradient */}
                    <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute bottom-2 left-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="text-white text-xs font-medium truncate">{photo.client_name}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="px-6">
              <Card className="p-8 text-center border-dashed rounded-2xl">
                <Camera className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">No photos available yet</p>
              </Card>
            </div>
          )}

          {/* Browse Gallery Card */}
          <div className="px-6">
            <Card 
              className="p-4 cursor-pointer hover:border-primary/50 transition-all rounded-2xl bg-gradient-to-r from-primary/5 to-accent/5"
              onClick={() => navigate("/photo")}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-primary/10">
                    <Camera className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Browse Full Gallery</h3>
                    <p className="text-sm text-muted-foreground">View all photos & categories</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </Card>
          </div>
        </section>




        {/* Stats Section */}
        <section className="p-6 pb-28">
          <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
            {[
              { value: "10K+", label: "Happy Users", icon: Users },
              { value: "50K+", label: "Orders", icon: ShoppingBag },
              { value: "24/7", label: "Support", icon: Shield },
            ].map((stat, index) => (
              <Card 
                key={stat.label}
                className="text-center p-4 animate-scale-in rounded-2xl"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <stat.icon className="h-5 w-5 mx-auto mb-2 text-primary" />
                <p className="text-xl font-display font-bold text-primary">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </Card>
            ))}
          </div>
        </section>

        {/* Ad Banner */}
        <AdBanner pageLocation="home" position="inline" className="px-6 mb-6" />

        {/* Footer credit */}
        <div className="text-center py-6 pb-28">
          <p className="text-xs text-muted-foreground/60">
            created by thurakaungkhant
          </p>
        </div>

        
      </MobileLayout>
    </>
  );
};

export default Home;
