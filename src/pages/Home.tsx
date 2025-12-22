import { useEffect, useState, memo, useCallback, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, ShoppingCart, Gem, Search, ChevronRight, Crown, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import BottomNav from "@/components/BottomNav";
import CartHeader from "@/components/CartHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import MobileLayout from "@/components/MobileLayout";
import OnboardingFlow from "@/components/OnboardingFlow";
import { useUserPremiumStatus } from "@/hooks/useUserPremiumStatus";

interface Product {
  id: number;
  name: string;
  price: number;
  image_url: string;
  description: string | null;
  category: string;
  is_premium: boolean;
}

interface CategoryGroup {
  category: string;
  products: Product[];
}

// Memoized Product Card for performance
const ProductCard = memo(({ 
  product, 
  isFavourite, 
  onToggleFavourite, 
  onClick,
  animationDelay 
}: { 
  product: Product; 
  isFavourite: boolean; 
  onToggleFavourite: () => void;
  onClick: () => void;
  animationDelay: string;
}) => (
  <Card
    className={cn(
      "product-card flex-shrink-0 w-36 cursor-pointer",
      "animate-scale-in"
    )}
    style={{ animationDelay }}
    onClick={onClick}
  >
    <div className="relative aspect-square bg-muted overflow-hidden rounded-t-xl">
      <img
        src={product.image_url}
        alt={product.name}
        className="w-full h-full object-contain p-2"
        loading="lazy"
      />
      
      {/* Favourite button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleFavourite();
        }}
        className={cn(
          "absolute top-2 right-2 p-1.5 rounded-full",
          "glass border-0 transition-all duration-300",
          "hover:scale-110 active:scale-95",
          isFavourite 
            ? "bg-red-500 text-white shadow-lg shadow-red-500/30" 
            : "bg-background/80 text-muted-foreground hover:bg-background"
        )}
      >
        <Heart
          className={cn(
            "h-3.5 w-3.5 transition-all duration-300",
            isFavourite && "fill-current text-white"
          )}
        />
      </button>
      
      {/* Gradient overlay */}
      <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-card/80 to-transparent pointer-events-none" />
    </div>
    
    <CardContent className="p-2 space-y-0.5">
      <h3 className="font-semibold text-xs truncate">{product.name}</h3>
      <p className="text-primary font-bold text-sm">
        {product.price.toLocaleString()} 
        <span className="text-[10px] font-medium ml-0.5 text-muted-foreground">MMK</span>
      </p>
    </CardContent>
  </Card>
));

ProductCard.displayName = "ProductCard";

const Home = () => {
  const [categoryGroups, setCategoryGroups] = useState<CategoryGroup[]>([]);
  const [favourites, setFavourites] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showOnboarding, setShowOnboarding] = useState(false);
  const { user } = useAuth();
  const { isPremium } = useUserPremiumStatus(user?.id);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Check if user has seen onboarding
  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem("hasSeenOnboarding");
    if (!hasSeenOnboarding) {
      setShowOnboarding(true);
    }
  }, []);

  const handleOnboardingComplete = useCallback(() => {
    localStorage.setItem("hasSeenOnboarding", "true");
    setShowOnboarding(false);
  }, []);

  useEffect(() => {
    loadProducts();
    if (user) loadFavourites();
  }, [user]);

  const loadProducts = async () => {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .neq("category", "MLBB Diamonds")
      .order("created_at", { ascending: false });

    if (!error && data) {
      const grouped = data.reduce((acc: { [key: string]: Product[] }, product) => {
        const category = product.category || "General";
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(product);
        return acc;
      }, {});

      const groups: CategoryGroup[] = Object.entries(grouped).map(([category, products]) => ({
        category,
        products,
      }));

      setCategoryGroups(groups);
    }
    setLoading(false);
  };

  const loadFavourites = async () => {
    if (!user) return;

    const { data } = await supabase
      .from("favourite_products")
      .select("product_id")
      .eq("user_id", user.id);

    if (data) {
      setFavourites(new Set(data.map((f) => f.product_id)));
    }
  };

  const toggleFavourite = useCallback(async (productId: number) => {
    if (!user) {
      toast({
        title: "Login required",
        description: "Please login to add favourites",
        variant: "destructive",
      });
      return;
    }

    const isFav = favourites.has(productId);

    if (isFav) {
      await supabase
        .from("favourite_products")
        .delete()
        .eq("user_id", user.id)
        .eq("product_id", productId);

      setFavourites((prev) => {
        const newSet = new Set(prev);
        newSet.delete(productId);
        return newSet;
      });
    } else {
      await supabase
        .from("favourite_products")
        .insert({ user_id: user.id, product_id: productId });

      setFavourites((prev) => new Set(prev).add(productId));
    }
  }, [user, favourites, toast]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <div className="max-w-screen-xl mx-auto p-4">
          <div className="grid grid-cols-2 gap-4">
            {[...Array(6)].map((_, i) => (
              <div 
                key={i} 
                className="h-56 rounded-2xl animate-shimmer" 
                style={{ animationDelay: `${i * 100}ms` }}
              />
            ))}
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <>
      {/* Onboarding Flow for new users */}
      <OnboardingFlow isOpen={showOnboarding} onComplete={handleOnboardingComplete} />
      
      <MobileLayout>
      {/* Hero Header */}
      <header className="relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-hero" />
        <div className="absolute inset-0 bg-gradient-glow opacity-60" />
        
        {/* Decorative elements */}
        <div className="absolute top-4 right-4 w-32 h-32 bg-primary-foreground/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-8 -left-8 w-40 h-40 bg-primary-foreground/5 rounded-full blur-3xl" />
        
        <div className="relative z-10 p-4 pt-6 pb-5">
          {/* Top row */}
          <div className="flex items-center justify-between mb-3">
            <Button
              onClick={() => navigate("/mlbb-diamonds")}
              size="sm"
              className={cn(
                "relative overflow-hidden bg-accent hover:bg-accent/90 text-accent-foreground",
                "font-bold p-2.5 rounded-full",
                "shadow-accent transition-all duration-300 hover:shadow-lg hover:scale-102",
                "active:scale-98"
              )}
            >
              <Gem className="h-5 w-5" />
            </Button>
            
            <h1 className="text-2xl font-display font-extrabold text-primary-foreground tracking-tight drop-shadow-lg">
              Kaung Computer
            </h1>
            
            <CartHeader />
          </div>
          
          {/* Search bar */}
          <div className="relative group">
            <div className="absolute inset-0 bg-primary-foreground/10 rounded-2xl blur group-focus-within:blur-lg transition-all duration-300" />
            <div className="relative flex items-center">
              <Search className="absolute left-4 h-5 w-5 text-primary-foreground/50 transition-colors group-focus-within:text-primary-foreground/80" />
              <Input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={cn(
                  "w-full pl-11 pr-4 py-3 h-12 rounded-2xl",
                  "bg-primary-foreground/10 border-primary-foreground/20",
                  "text-primary-foreground placeholder:text-primary-foreground/50",
                  "focus:bg-primary-foreground/15 focus:border-primary-foreground/30",
                  "transition-all duration-300"
                )}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-screen-xl mx-auto p-4 space-y-8">
        {categoryGroups.length === 0 ? (
          <div className="text-center py-16 animate-fade-in">
            <div className="relative inline-block mb-6">
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl animate-pulse-soft" />
              <ShoppingCart className="relative h-20 w-20 text-muted-foreground" />
            </div>
            <p className="text-lg text-muted-foreground font-medium">No products available yet</p>
            <p className="text-sm text-muted-foreground/70 mt-1">Check back soon for new arrivals</p>
          </div>
        ) : (
          categoryGroups.slice(0, 3).map((group, groupIndex) => {
            const filteredProducts = group.products.filter((product) =>
              product.name.toLowerCase().includes(searchQuery.toLowerCase())
            );
            
            if (filteredProducts.length === 0 && searchQuery) return null;
            
            return (
              <section 
                key={group.category} 
                className="animate-slide-up"
                style={{ animationDelay: `${groupIndex * 100}ms` }}
              >
                {/* Section header */}
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-display font-bold tracking-tight">{group.category}</h2>
                  <button
                    onClick={() => navigate(`/category/${encodeURIComponent(group.category)}`)}
                    className="flex items-center gap-1 text-sm font-medium text-primary hover:text-primary/80 transition-colors group"
                  >
                    <span>View All</span>
                    <ChevronRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>
                
                {/* Products carousel */}
                <div className="overflow-x-auto scrollbar-hide -mx-4 px-4">
                  <div className="flex gap-3 pb-2">
                    {filteredProducts.slice(0, 6).map((product, productIndex) => {
                      const isLocked = product.is_premium && !isPremium;
                      
                      return (
                        <Card
                          key={product.id}
                          className={cn(
                            "product-card flex-shrink-0 w-36 cursor-pointer relative",
                            "animate-scale-in"
                          )}
                          style={{ animationDelay: `${productIndex * 50}ms` }}
                          onClick={() => navigate(`/product/${product.id}`)}
                        >
                          <div className="relative aspect-square bg-muted overflow-hidden rounded-t-xl">
                            <img
                              src={product.image_url}
                              alt={product.name}
                              className={cn(
                                "w-full h-full object-contain p-2 transition-all duration-300",
                                isLocked && "blur-[2px] opacity-70"
                              )}
                            />
                            
                            {/* Premium Lock Overlay */}
                            {isLocked && (
                              <div className="absolute inset-0 flex items-center justify-center bg-background/40 backdrop-blur-[1px]">
                                <div className="flex flex-col items-center gap-1 text-center p-2">
                                  <div className="p-2 rounded-full bg-amber-500/20 backdrop-blur-sm">
                                    <Lock className="h-5 w-5 text-amber-500" />
                                  </div>
                                  <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400">
                                    Premium Only
                                  </span>
                                </div>
                              </div>
                            )}
                            
                            {/* Premium/Free Badge */}
                            {product.is_premium ? (
                              <Badge className="absolute top-2 left-2 bg-amber-500 hover:bg-amber-600 text-white text-[9px] px-1.5 py-0.5">
                                <Crown className="h-2.5 w-2.5 mr-0.5" />
                                Premium
                              </Badge>
                            ) : (
                              <Badge className="absolute top-2 left-2 bg-green-500 hover:bg-green-600 text-white text-[9px] px-1.5 py-0.5">
                                Free
                              </Badge>
                            )}
                            
                            {/* Favourite button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleFavourite(product.id);
                              }}
                              className={cn(
                                "absolute top-2 right-2 p-1.5 rounded-full z-10",
                                "glass border-0 transition-all duration-300",
                                "hover:scale-110 active:scale-95",
                                favourites.has(product.id) 
                                  ? "bg-red-500 text-white shadow-lg shadow-red-500/30" 
                                  : "bg-background/80 text-muted-foreground hover:bg-background"
                              )}
                            >
                              <Heart
                                className={cn(
                                  "h-3.5 w-3.5 transition-all duration-300",
                                  favourites.has(product.id) && "fill-current text-white"
                                )}
                              />
                            </button>
                            
                            {/* Gradient overlay */}
                            <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-card/80 to-transparent pointer-events-none" />
                          </div>
                          
                          <CardContent className="p-2 space-y-0.5">
                            <h3 className="font-semibold text-xs truncate">{product.name}</h3>
                            <p className="text-primary font-bold text-sm">
                              {product.price.toLocaleString()} 
                              <span className="text-[10px] font-medium ml-0.5 text-muted-foreground">MMK</span>
                            </p>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              </section>
            );
          })
        )}
      </div>

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