import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Heart, ShoppingCart, Gem } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import BottomNav from "@/components/BottomNav";
import CartHeader from "@/components/CartHeader";
import { Button } from "@/components/ui/button";

interface Product {
  id: number;
  name: string;
  price: number;
  image_url: string;
  description: string | null;
  category: string;
}

interface CategoryGroup {
  category: string;
  products: Product[];
}

const Home = () => {
  const [categoryGroups, setCategoryGroups] = useState<CategoryGroup[]>([]);
  const [favourites, setFavourites] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadProducts();
    if (user) loadFavourites();
  }, [user]);

  const loadProducts = async () => {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      // Group products by category
      const grouped = data.reduce((acc: { [key: string]: Product[] }, product) => {
        const category = product.category || "General";
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(product);
        return acc;
      }, {});

      // Convert to array format
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

  const toggleFavourite = async (productId: number) => {
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
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="max-w-screen-xl mx-auto p-4">
          <div className="grid grid-cols-2 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-64 bg-muted animate-pulse rounded-xl" />
            ))}
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="bg-gradient-primary text-primary-foreground p-4 sticky top-0 z-40">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <Button
              onClick={() => navigate("/mlbb-diamonds")}
              className="bg-accent hover:bg-accent/90 text-accent-foreground font-bold px-3 py-1 rounded-full flex items-center gap-1.5 text-xs shadow-lg"
            >
              <Gem className="h-4 w-4" />
              <span className="hidden sm:inline">Buy ML Diamonds</span>
              <span className="sm:hidden">MLBB</span>
            </Button>
          </div>
          <h1 className="text-2xl font-bold">Kaung Computer</h1>
          <div className="flex-1 flex justify-end">
            <CartHeader />
          </div>
        </div>
      </header>

      <div className="max-w-screen-xl mx-auto p-4 space-y-8">
        {categoryGroups.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingCart className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No products available yet</p>
          </div>
        ) : (
          categoryGroups.slice(0, 3).map((group) => (
            <div key={group.category} className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">{group.category}</h2>
                <button
                  onClick={() => navigate(`/category/${encodeURIComponent(group.category)}`)}
                  className="text-primary text-sm font-medium hover:underline"
                >
                  View All
                </button>
              </div>
              
              <div className="overflow-x-auto scrollbar-hide">
                <div className="flex gap-4 pb-2">
                  {group.products.slice(0, 6).map((product) => (
                    <Card
                      key={product.id}
                      className="flex-shrink-0 w-40 overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
                      onClick={() => navigate(`/product/${product.id}`)}
                    >
                      <div className="relative aspect-square bg-muted">
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavourite(product.id);
                          }}
                          className="absolute top-2 right-2 p-1.5 bg-background/80 rounded-full hover:bg-background transition-colors"
                        >
                          <Heart
                            className={`h-3.5 w-3.5 ${
                              favourites.has(product.id)
                                ? "fill-primary text-primary"
                                : "text-muted-foreground"
                            }`}
                          />
                        </button>
                      </div>
                      <CardContent className="p-2">
                        <h3 className="font-semibold text-xs truncate">{product.name}</h3>
                        <p className="text-primary font-bold text-sm">${product.price.toFixed(2)}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default Home;
