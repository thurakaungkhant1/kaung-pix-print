import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { ArrowLeft, ShoppingCart, Package, Loader2, Filter } from "lucide-react";
import MobileLayout from "@/components/MobileLayout";
import BottomNav from "@/components/BottomNav";
import CartHeader from "@/components/CartHeader";
import { useCart } from "@/hooks/useCart";
import { cn } from "@/lib/utils";

interface PhysicalCategory {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  display_order: number;
  is_active: boolean;
}

interface Product {
  id: number;
  name: string;
  price: number;
  original_price: number | null;
  image_url: string;
  description: string | null;
  category: string;
  physical_category_id: string | null;
  stock_quantity: number | null;
  status: string | null;
}

// Define which categories are considered "game" categories to exclude
const GAME_KEYWORDS = ["diamond", "game", "mobile legends", "pubg", "free fire", "genshin", "top-up", "topup"];

const PhysicalProducts = () => {
  const [categories, setCategories] = useState<PhysicalCategory[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { addToCart, isAdding } = useCart({ userId: user?.id });

  useEffect(() => {
    loadData();
    const categoryParam = searchParams.get("category");
    if (categoryParam) {
      setSelectedCategory(categoryParam);
    }
  }, [searchParams]);

  const loadData = async () => {
    setLoading(true);
    
    // Load physical categories
    const { data: categoriesData } = await supabase
      .from("physical_categories")
      .select("*")
      .eq("is_active", true)
      .order("display_order");
    
    if (categoriesData) {
      setCategories(categoriesData);
    }

    // Load physical products (excluding game categories)
    let query = supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });
    
    // Exclude game categories
    GAME_KEYWORDS.forEach(keyword => {
      query = query.not("category", "ilike", `%${keyword}%`);
    });

    const { data: productsData } = await query;
    
    if (productsData) {
      setProducts(productsData);
    }
    
    setLoading(false);
  };

  const filteredProducts = selectedCategory
    ? products.filter(p => p.physical_category_id === selectedCategory)
    : products;

  const getDiscountPercent = (original: number, current: number) => {
    return Math.round((1 - current / original) * 100);
  };

  if (loading) {
    return (
      <MobileLayout>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center space-y-4">
            <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground">Loading products...</p>
          </div>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout>
      {/* Header */}
      <header className="bg-gradient-primary text-primary-foreground p-4 sticky top-0 z-40 shadow-lg">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 rounded-full hover:bg-primary-foreground/10 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-display font-bold">Physical Products</h1>
            <p className="text-sm text-primary-foreground/70">{filteredProducts.length} products</p>
          </div>
          <CartHeader />
        </div>
      </header>

      {/* Category Filter */}
      <div className="bg-card border-b sticky top-[72px] z-30">
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex p-3 gap-2">
            <Button
              variant={selectedCategory === null ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(null)}
              className="rounded-full"
            >
              All
            </Button>
            {categories.map((category) => (
              <Button
                key={category.id}
                variant={selectedCategory === category.id ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category.id)}
                className="rounded-full"
              >
                {category.name}
              </Button>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>

      {/* Products Grid */}
      <div className="p-4">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-16">
            <Package className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No products found</h3>
            <p className="text-muted-foreground mb-4">
              {selectedCategory 
                ? "No products in this category yet" 
                : "No physical products available"}
            </p>
            {selectedCategory && (
              <Button variant="outline" onClick={() => setSelectedCategory(null)}>
                View All Products
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filteredProducts.map((product, index) => (
              <Card 
                key={product.id}
                className={cn(
                  "overflow-hidden border-border/50 hover:border-primary/30",
                  "transition-all animate-scale-in cursor-pointer",
                  product.status === "out_of_stock" && "opacity-60"
                )}
                style={{ animationDelay: `${index * 30}ms` }}
                onClick={() => navigate(`/product/${product.id}`)}
              >
                <div className="aspect-square bg-muted overflow-hidden relative">
                  <img 
                    src={product.image_url} 
                    alt={product.name}
                    className="w-full h-full object-cover hover:scale-105 transition-transform"
                  />
                  {product.original_price && product.original_price > product.price && (
                    <Badge 
                      variant="destructive" 
                      className="absolute top-2 right-2 text-xs"
                    >
                      -{getDiscountPercent(product.original_price, product.price)}%
                    </Badge>
                  )}
                  {product.status === "out_of_stock" && (
                    <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                      <Badge variant="secondary">Out of Stock</Badge>
                    </div>
                  )}
                </div>
                <CardContent className="p-3 space-y-2">
                  <h3 className="font-medium text-sm line-clamp-2">{product.name}</h3>
                  <div className="flex items-baseline gap-2">
                    <p className="text-primary font-bold">
                      {product.price.toLocaleString()} Ks
                    </p>
                    {product.original_price && product.original_price > product.price && (
                      <p className="text-xs text-muted-foreground line-through">
                        {product.original_price.toLocaleString()} Ks
                      </p>
                    )}
                  </div>
                  <Button 
                    size="sm" 
                    className="w-full gap-1" 
                    variant="outline"
                    disabled={isAdding === product.id || product.status === "out_of_stock"}
                    onClick={(e) => {
                      e.stopPropagation();
                      addToCart(product.id);
                    }}
                  >
                    {isAdding === product.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <ShoppingCart className="h-3 w-3" />
                    )}
                    {product.status === "out_of_stock" ? "Out of Stock" : "Add to Cart"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </MobileLayout>
  );
};

export default PhysicalProducts;
