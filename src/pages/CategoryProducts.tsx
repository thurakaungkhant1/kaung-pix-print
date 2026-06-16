import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Heart, ArrowLeft, ShoppingCart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import CartHeader from "@/components/CartHeader";

interface Product {
  id: number;
  name: string;
  price: number;
  image_url: string;
  description: string | null;
  category: string;
}

const CategoryProducts = () => {
  const { category } = useParams<{ category: string }>();
  const [products, setProducts] = useState<Product[]>([]);
  const [favourites, setFavourites] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadProducts();
    if (user) loadFavourites();
  }, [category, user]);

  const loadProducts = async () => {
    if (!category) return;

    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("category", decodeURIComponent(category))
      .order("created_at", { ascending: false });

    if (!error && data) {
      setProducts(data);
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
           <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-64 bg-muted animate-pulse rounded-xl" />
            ))}
          </div>
        </div>


      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 max-w-screen-xl mx-auto">
      <header className="bg-gradient-primary text-primary-foreground p-4 sticky top-0 z-40">
        <div className="flex items-center justify-between">
          <button onClick={() => navigate("/")}>
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h1 className="text-xl font-bold">{category ? decodeURIComponent(category) : "Category"}</h1>
          <CartHeader />
        </div>
      </header>

      <div className="max-w-screen-xl mx-auto p-4">
        {products.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingCart className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No products in this category yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-2">
            {products.map((product) => (
              <Card
                key={product.id}
                className="overflow-hidden cursor-pointer hover:shadow-md transition-all duration-300 hover:scale-[1.03] group rounded-xl"
                onClick={() => navigate(`/product/${product.id}`)}
              >
                <div className="relative aspect-square bg-muted overflow-hidden">
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavourite(product.id);
                    }}
                    className="absolute top-1 right-1 p-1 bg-background/80 backdrop-blur-sm rounded-full hover:bg-background transition-colors"
                  >
                    <Heart
                      className={`h-3 w-3 transition-colors ${
                        favourites.has(product.id)
                          ? "fill-primary text-primary"
                          : "text-muted-foreground"
                      }`}
                    />
                  </button>
                </div>
                <CardContent className="p-1.5">
                  <h3 className="font-medium text-[11px] leading-tight line-clamp-2 min-h-[26px]">{product.name}</h3>
                  {product.category === "Digital Products" ? (
                    <p className="text-primary font-semibold text-[10px] mt-0.5">View details →</p>
                  ) : (
                    <p className="text-primary font-bold text-[11px] mt-0.5">{product.price.toLocaleString()} MMK</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      
    </div>
  );
};

export default CategoryProducts;
