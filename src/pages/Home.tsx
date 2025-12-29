import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ShoppingBag, 
  Crown, 
  Shield, 
  Star,
  ChevronRight,
  Sparkles,
  Users,
  Package,
  Camera,
  User,
  Percent,
  Clock,
  ArrowRight,
  Flame
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import BottomNav from "@/components/BottomNav";
import { cn } from "@/lib/utils";
import MobileLayout from "@/components/MobileLayout";
import OnboardingFlow from "@/components/OnboardingFlow";
import { useUserPremiumStatus } from "@/hooks/useUserPremiumStatus";
import WalletDisplay from "@/components/WalletDisplay";
import { supabase } from "@/integrations/supabase/client";
import ThemeToggle from "@/components/ThemeToggle";

interface Photo {
  id: number;
  client_name: string;
  preview_image: string | null;
  category: string | null;
}

const Home = () => {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [physicalProducts, setPhysicalProducts] = useState<any[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { isPremium } = useUserPremiumStatus(user?.id);
  const navigate = useNavigate();

  // Check if user has seen onboarding
  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem("hasSeenOnboarding");
    if (!hasSeenOnboarding) {
      setShowOnboarding(true);
    }
  }, []);

  // Load physical products and photos
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
      {/* Onboarding Flow for new users */}
      <OnboardingFlow isOpen={showOnboarding} onComplete={handleOnboardingComplete} />
      
      <MobileLayout>
        {/* Hero Section - Clean & Professional */}
        <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-accent/5 min-h-[50vh] flex flex-col">
          {/* Subtle pattern */}
          <div className="absolute inset-0 opacity-30">
            <div className="absolute top-10 right-10 w-40 h-40 bg-primary/10 rounded-full blur-[80px]" />
            <div className="absolute bottom-10 left-10 w-32 h-32 bg-accent/10 rounded-full blur-[60px]" />
          </div>
          
          {/* Theme Toggle in top right */}
          <div className="absolute top-4 right-4 z-20">
            <ThemeToggle variant="hero" />
          </div>
          
          {/* Hero Content */}
          <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-6 text-center">
            {/* Brand Badge */}
            <div className="mb-6 animate-fade-in">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-4">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-primary">Premium Quality Products</span>
              </div>
            </div>
            
            {/* Main heading */}
            <h1 className="text-4xl sm:text-5xl font-display font-black text-foreground mb-4 animate-slide-up">
              <span className="block">Kaung</span>
              <span className="block text-primary">Computer</span>
            </h1>
            
            <p className="text-lg text-muted-foreground max-w-md mb-8 animate-slide-up" style={{ animationDelay: '100ms' }}>
              Quality products & professional photography services at the best prices.
            </p>
            
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm animate-slide-up" style={{ animationDelay: '200ms' }}>
              <Button 
                onClick={() => navigate("/physical-products")}
                className="flex-1 h-14 text-lg gap-2 font-bold"
                size="lg"
              >
                <ShoppingBag className="h-5 w-5" />
                Shop Now
              </Button>
              <Button 
                onClick={() => navigate("/account")}
                variant="outline"
                className="flex-1 h-14 text-lg gap-2 font-bold border-primary/30 hover:bg-primary/10"
                size="lg"
              >
                <User className="h-5 w-5" />
                My Account
              </Button>
            </div>
          </div>
        </section>

        {/* Wallet Display */}
        {user && (
          <section className="px-6 pt-6">
            <WalletDisplay />
          </section>
        )}

        {/* Promotional Banner Section */}
        <section className="px-6 pt-6">
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
            {/* Flash Sale Banner */}
            <Card 
              className="flex-shrink-0 w-[85%] overflow-hidden rounded-2xl bg-gradient-to-br from-rose-500 via-pink-500 to-orange-400 border-0 cursor-pointer hover:shadow-xl transition-all group"
              onClick={() => navigate("/physical-products")}
            >
              <CardContent className="p-5 relative">
                {/* Decorative elements */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full blur-xl" />
                
                <div className="relative z-10 flex items-center justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Flame className="h-5 w-5 text-yellow-200 animate-pulse" />
                      <Badge className="bg-white/20 text-white border-0 backdrop-blur-sm">
                        Limited Time
                      </Badge>
                    </div>
                    <h3 className="text-2xl font-display font-black text-white">
                      Flash Sale
                    </h3>
                    <p className="text-white/80 text-sm">
                      Up to 30% off on selected items
                    </p>
                    <div className="flex items-center gap-2 pt-2">
                      <span className="text-white font-semibold text-sm group-hover:underline">
                        Shop Now
                      </span>
                      <ArrowRight className="h-4 w-4 text-white group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                  <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-sm">
                    <Percent className="h-10 w-10 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Premium Offer Banner */}
            <Card 
              className="flex-shrink-0 w-[85%] overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-600 border-0 cursor-pointer hover:shadow-xl transition-all group"
              onClick={() => navigate("/premium-shop")}
            >
              <CardContent className="p-5 relative">
                {/* Decorative elements */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full blur-xl" />
                
                <div className="relative z-10 flex items-center justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-yellow-300" />
                      <Badge className="bg-yellow-400/20 text-yellow-200 border-0 backdrop-blur-sm">
                        Special Offer
                      </Badge>
                    </div>
                    <h3 className="text-2xl font-display font-black text-white">
                      Go Premium
                    </h3>
                    <p className="text-white/80 text-sm">
                      Unlock exclusive benefits today
                    </p>
                    <div className="flex items-center gap-2 pt-2">
                      <span className="text-white font-semibold text-sm group-hover:underline">
                        Learn More
                      </span>
                      <ArrowRight className="h-4 w-4 text-white group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                  <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-sm">
                    <Crown className="h-10 w-10 text-yellow-300" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* New Arrivals Banner */}
            <Card 
              className="flex-shrink-0 w-[85%] overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 border-0 cursor-pointer hover:shadow-xl transition-all group"
              onClick={() => navigate("/physical-products")}
            >
              <CardContent className="p-5 relative">
                {/* Decorative elements */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full blur-xl" />
                
                <div className="relative z-10 flex items-center justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-white" />
                      <Badge className="bg-white/20 text-white border-0 backdrop-blur-sm">
                        New Arrivals
                      </Badge>
                    </div>
                    <h3 className="text-2xl font-display font-black text-white">
                      Fresh Stock
                    </h3>
                    <p className="text-white/80 text-sm">
                      Check out what's new this week
                    </p>
                    <div className="flex items-center gap-2 pt-2">
                      <span className="text-white font-semibold text-sm group-hover:underline">
                        Explore
                      </span>
                      <ArrowRight className="h-4 w-4 text-white group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                  <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-sm">
                    <Package className="h-10 w-10 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Scroll indicator dots */}
          <div className="flex justify-center gap-1.5 pt-2">
            <span className="w-6 h-1.5 rounded-full bg-primary" />
            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30" />
            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30" />
          </div>
        </section>

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
          
          {physicalProducts.length > 0 ? (
            <div className="flex gap-4 overflow-x-auto px-6 pb-4 scrollbar-hide">
              {physicalProducts.map((product, index) => (
                <Card 
                  key={product.id}
                  className="flex-shrink-0 w-40 overflow-hidden border-border/50 hover:border-primary/30 hover:shadow-lg transition-all animate-scale-in cursor-pointer rounded-2xl"
                  style={{ animationDelay: `${index * 50}ms` }}
                  onClick={() => navigate(`/product/${product.id}`)}
                >
                  <div className="aspect-square bg-muted overflow-hidden rounded-t-2xl">
                    <img 
                      src={product.image_url} 
                      alt={product.name}
                      className="w-full h-full object-cover hover:scale-105 transition-transform"
                    />
                  </div>
                  <CardContent className="p-3 space-y-1">
                    <h3 className="font-medium text-sm line-clamp-2">{product.name}</h3>
                    <p className="text-primary font-bold text-sm">{product.price.toLocaleString()} Ks</p>
                  </CardContent>
                </Card>
              ))}
              {/* View All Card */}
              <Card 
                className="flex-shrink-0 w-40 overflow-hidden border-dashed cursor-pointer hover:border-primary/50 transition-all rounded-2xl"
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
          
          {photos.length > 0 ? (
            <div className="grid grid-cols-3 gap-3 px-6">
              {photos.map((photo, index) => (
                <Card 
                  key={photo.id}
                  className="overflow-hidden border-border/50 hover:border-primary/30 hover:shadow-lg transition-all animate-scale-in cursor-pointer rounded-2xl group"
                  style={{ animationDelay: `${index * 50}ms` }}
                  onClick={() => navigate("/photo")}
                >
                  <div className="aspect-square bg-muted overflow-hidden relative">
                    {photo.preview_image ? (
                      <img 
                        src={photo.preview_image} 
                        alt={photo.client_name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
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


        {/* Premium Membership Showcase */}
        <section className="p-6">
          <Card className="relative overflow-hidden border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-card to-orange-500/10 rounded-2xl">
            {/* Glow effect */}
            <div className="absolute top-0 right-0 w-40 h-40 bg-amber-500/20 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-orange-500/20 rounded-full blur-2xl" />
            
            <CardContent className="relative p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-amber-500/20">
                  <Crown className="h-8 w-8 text-amber-500" />
                </div>
                <div>
                  <Badge className="bg-amber-500 text-white mb-1">Premium</Badge>
                  <h3 className="text-xl font-display font-bold">Premium Membership</h3>
                </div>
              </div>
              
              <p className="text-muted-foreground">
                Unlock exclusive benefits and get access to premium-only deals!
              </p>
              
              <ul className="space-y-2">
                {[
                  "Exclusive premium products",
                  "Earn points while chatting",
                  "Priority customer support",
                  "Special discounts & offers"
                ].map((benefit, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
              
              {isPremium ? (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-green-500/10 border border-green-500/30">
                  <Shield className="h-5 w-5 text-green-500" />
                  <span className="font-medium text-green-600 dark:text-green-400">You're a Premium Member!</span>
                </div>
              ) : (
                <Button 
                  onClick={() => navigate("/account")}
                  className="w-full h-12 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold gap-2"
                >
                  <Crown className="h-5 w-5" />
                  Become Premium
                </Button>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Stats Section */}
        <section className="p-6 pb-28">
          <div className="grid grid-cols-3 gap-4">
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

        {/* Footer credit */}
        <div className="text-center py-6 pb-28">
          <p className="text-xs text-muted-foreground/60">
            created by thurakaungkhant
          </p>
        </div>

        <BottomNav />
      </MobileLayout>
    </>
  );
};

export default Home;
