import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ShoppingBag, 
  Gamepad2, 
  Zap, 
  Crown, 
  Shield, 
  Gift, 
  Star,
  ChevronRight,
  Sparkles,
  Users,
  ShoppingCart,
  Package
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import BottomNav from "@/components/BottomNav";
import { cn } from "@/lib/utils";
import MobileLayout from "@/components/MobileLayout";
import OnboardingFlow from "@/components/OnboardingFlow";
import { useUserPremiumStatus } from "@/hooks/useUserPremiumStatus";
import WalletDisplay from "@/components/WalletDisplay";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Feature cards data
const FEATURES = [
  {
    icon: Zap,
    title: "Instant Delivery",
    description: "Get your items within minutes",
    color: "text-yellow-500",
    bgColor: "bg-yellow-500/10",
  },
  {
    icon: Shield,
    title: "Secure Payment",
    description: "100% safe & encrypted",
    color: "text-green-500",
    bgColor: "bg-green-500/10",
  },
  {
    icon: Gift,
    title: "Best Prices",
    description: "Guaranteed lowest rates",
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
  },
];

// Game categories preview
const GAME_PREVIEWS = [
  { name: "Mobile Legends", image: "/images/games/mobile-legends.png" },
  { name: "PUBG", image: "/images/games/pubg-mobile.png" },
  { name: "Free Fire", image: "/images/games/free-fire.png" },
  { name: "Genshin", image: "/images/games/genshin-impact.png" },
];

const Home = () => {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [physicalProducts, setPhysicalProducts] = useState<any[]>([]);
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

  // Load physical products (non-game categories)
  useEffect(() => {
    const loadProducts = async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .not('category', 'ilike', '%diamond%')
        .not('category', 'ilike', '%game%')
        .not('category', 'ilike', '%mobile legends%')
        .not('category', 'ilike', '%pubg%')
        .not('category', 'ilike', '%free fire%')
        .limit(8);
      
      if (!error && data) {
        setPhysicalProducts(data);
      }
      setLoading(false);
    };
    loadProducts();
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
        {/* Hero Section - Gaming Neon Style */}
        <section className="hero-gaming relative overflow-hidden min-h-[60vh] flex flex-col">
          {/* Grid pattern background */}
          <div className="absolute inset-0 bg-grid-gaming opacity-50" />
          
          {/* Animated glow orbs */}
          <div className="absolute top-20 right-10 w-64 h-64 bg-primary/20 rounded-full blur-[100px] animate-pulse" />
          <div className="absolute bottom-20 left-10 w-48 h-48 bg-accent/20 rounded-full blur-[80px] animate-pulse" style={{ animationDelay: '1s' }} />
          
          {/* Hero Content */}
          <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-6 text-center">
            {/* Logo/Brand */}
            <div className="mb-6 animate-fade-in">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-4">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-primary">Myanmar's #1 Gaming Store</span>
              </div>
            </div>
            
            {/* Main heading */}
            <h1 className="text-4xl sm:text-5xl font-display font-black text-foreground mb-4 animate-slide-up">
              <span className="block">Kaung</span>
              <span className="block text-neon text-primary">Computer</span>
            </h1>
            
            <p className="text-lg text-muted-foreground max-w-md mb-8 animate-slide-up" style={{ animationDelay: '100ms' }}>
              Top-up your favorite games instantly. Fast, secure, and at the best prices.
            </p>
            
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm animate-slide-up" style={{ animationDelay: '200ms' }}>
              <Button 
                onClick={() => navigate("/game")}
                className="btn-neon flex-1 h-14 text-lg gap-2 font-bold"
                size="lg"
              >
                <ShoppingBag className="h-5 w-5" />
                Browse Shop
              </Button>
              <Button 
                onClick={() => navigate("/account")}
                variant="outline"
                className="flex-1 h-14 text-lg gap-2 font-bold border-primary/30 hover:bg-primary/10"
                size="lg"
              >
                <Gamepad2 className="h-5 w-5" />
                My Account
              </Button>
            </div>
          </div>
          
          {/* Scroll indicator */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
            <div className="w-6 h-10 rounded-full border-2 border-muted-foreground/30 flex items-start justify-center p-2">
              <div className="w-1 h-2 bg-muted-foreground/50 rounded-full" />
            </div>
          </div>
        </section>

        {/* Wallet Display */}
        {user && (
          <section className="px-6 pt-6">
            <WalletDisplay />
          </section>
        )}

        {/* Physical Products Section */}
        <section className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-display font-bold">Physical Products</h2>
            </div>
          </div>
          
          {physicalProducts.length > 0 ? (
            <div className="grid grid-cols-2 gap-4">
              {physicalProducts.map((product, index) => (
                <Card 
                  key={product.id}
                  className="overflow-hidden border-border/50 hover:border-primary/30 transition-all animate-scale-in cursor-pointer"
                  style={{ animationDelay: `${index * 50}ms` }}
                  onClick={() => navigate(`/product/${product.id}`)}
                >
                  <div className="aspect-square bg-muted overflow-hidden">
                    <img 
                      src={product.image_url} 
                      alt={product.name}
                      className="w-full h-full object-cover hover:scale-105 transition-transform"
                    />
                  </div>
                  <CardContent className="p-3 space-y-2">
                    <h3 className="font-medium text-sm line-clamp-2">{product.name}</h3>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-primary font-bold">{product.price.toLocaleString()} Ks</p>
                        {product.original_price && product.original_price > product.price && (
                          <p className="text-xs text-muted-foreground line-through">
                            {product.original_price.toLocaleString()} Ks
                          </p>
                        )}
                      </div>
                      {product.original_price && product.original_price > product.price && (
                        <Badge variant="destructive" className="text-xs">
                          -{Math.round((1 - product.price / product.original_price) * 100)}%
                        </Badge>
                      )}
                    </div>
                    <Button size="sm" className="w-full gap-1" variant="outline">
                      <ShoppingCart className="h-3 w-3" />
                      Add to Cart
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-8 text-center border-dashed">
              <Package className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">No physical products available yet</p>
              <Button 
                variant="link" 
                onClick={() => navigate("/game")}
                className="mt-2 gap-1"
              >
                Browse Game Items <ChevronRight className="h-4 w-4" />
              </Button>
            </Card>
          )}
        </section>

        {/* Games Preview Section */}
        <section className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Gamepad2 className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-display font-bold">Game Top-ups</h2>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="gap-1 text-primary"
              onClick={() => navigate("/game")}
            >
              View All <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="grid grid-cols-4 gap-3">
            {GAME_PREVIEWS.map((game, index) => (
              <button
                key={game.name}
                onClick={() => navigate("/game")}
                className={cn(
                  "card-neon p-3 flex flex-col items-center gap-2 animate-scale-in",
                  "hover:scale-105 transition-transform duration-300"
                )}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden bg-muted">
                  <img 
                    src={game.image} 
                    alt={game.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <span className="text-[10px] sm:text-xs font-medium text-center leading-tight">
                  {game.name}
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* Features Section */}
        <section className="p-6 space-y-6">
          <h2 className="text-xl font-display font-bold text-center">Why Choose Us?</h2>
          
          <div className="grid gap-4">
            {FEATURES.map((feature, index) => (
              <Card 
                key={feature.title}
                className={cn(
                  "card-neon animate-slide-up"
                )}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <CardContent className="flex items-center gap-4 p-4">
                  <div className={cn("p-3 rounded-xl", feature.bgColor)}>
                    <feature.icon className={cn("h-6 w-6", feature.color)} />
                  </div>
                  <div>
                    <h3 className="font-bold">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Premium Membership Showcase */}
        <section className="p-6">
          <Card className="relative overflow-hidden border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-card to-orange-500/10">
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
                Unlock exclusive benefits, earn more points, and get access to premium-only deals!
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
                className="card-neon text-center p-4 animate-scale-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <stat.icon className="h-5 w-5 mx-auto mb-2 text-primary" />
                <p className="text-xl font-display font-bold text-neon text-primary">{stat.value}</p>
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
