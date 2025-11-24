import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Heart, Minus, Plus, ArrowLeft, ShoppingCart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import CheckoutDialog from "@/components/CheckoutDialog";
import ReviewSection from "@/components/ReviewSection";

interface Product {
  id: number;
  name: string;
  price: number;
  image_url: string;
  description: string | null;
  points_value: number;
}

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isFavourite, setIsFavourite] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    loadProduct();
    if (user) checkFavourite();
  }, [id, user]);

  const loadProduct = async () => {
    if (!id) return;
    
    const productId = parseInt(id);
    if (isNaN(productId)) return;

    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("id", productId)
      .single();

    if (!error && data) {
      setProduct(data);
    }
  };

  const checkFavourite = async () => {
    if (!user || !id) return;

    const productId = parseInt(id);
    if (isNaN(productId)) return;

    const { data } = await supabase
      .from("favourite_products")
      .select("id")
      .eq("user_id", user.id)
      .eq("product_id", productId)
      .maybeSingle();

    setIsFavourite(!!data);
  };

  const toggleFavourite = async () => {
    if (!user || !id) return;

    const productId = parseInt(id);
    if (isNaN(productId)) return;

    if (!user) {
      toast({
        title: "Login required",
        description: "Please login to add favourites",
        variant: "destructive",
      });
      return;
    }

    if (isFavourite) {
      await supabase
        .from("favourite_products")
        .delete()
        .eq("user_id", user.id)
        .eq("product_id", productId);
    } else {
      await supabase
        .from("favourite_products")
        .insert({ user_id: user.id, product_id: productId });
    }

    setIsFavourite(!isFavourite);
  };

  const handleBuyNow = () => {
    if (!user) {
      toast({
        title: "Login required",
        description: "Please login to place an order",
        variant: "destructive",
      });
      navigate("/auth/login");
      return;
    }

    setCheckoutOpen(true);
  };

  const handleCheckoutSuccess = () => {
    // Reload product to ensure fresh data
    loadProduct();
  };

  const handleAddToCart = async () => {
    if (!user) {
      toast({
        title: "Login required",
        description: "Please login to add items to cart",
        variant: "destructive",
      });
      navigate("/auth/login");
      return;
    }

    if (!product) return;

    // Check if item already in cart
    const { data: existing } = await supabase
      .from("cart_items")
      .select("id, quantity")
      .eq("user_id", user.id)
      .eq("product_id", product.id)
      .maybeSingle();

    if (existing) {
      // Update quantity
      const { error } = await supabase
        .from("cart_items")
        .update({ quantity: existing.quantity + quantity })
        .eq("id", existing.id);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to update cart",
          variant: "destructive",
        });
        return;
      }
    } else {
      // Add new item
      const { error } = await supabase
        .from("cart_items")
        .insert({
          user_id: user.id,
          product_id: product.id,
          quantity,
        });

      if (error) {
        toast({
          title: "Error",
          description: "Failed to add to cart",
          variant: "destructive",
        });
        return;
      }
    }

    toast({
      title: "Added to Cart",
      description: `${quantity} ${product.name} added to your cart`,
    });

    setQuantity(1);
  };

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-8">
      <header className="bg-gradient-primary text-primary-foreground p-4 sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)}>
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h1 className="text-xl font-bold">Product Details</h1>
        </div>
      </header>

      <div className="max-w-screen-xl mx-auto p-4 space-y-6">
        <Card className="overflow-hidden">
          <div className="aspect-square bg-muted">
            <img
              src={product.image_url}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          </div>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-2xl">{product.name}</CardTitle>
                <CardDescription className="text-xl font-bold text-primary mt-2">
                  ${product.price.toFixed(2)}
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleFavourite}
                className="shrink-0"
              >
                <Heart
                  className={`h-6 w-6 ${
                    isFavourite ? "fill-primary text-primary" : ""
                  }`}
                />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {product.description && (
              <div>
                <h3 className="font-semibold mb-2">Description</h3>
                <p className="text-muted-foreground">{product.description}</p>
              </div>
            )}

            <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
              <p className="text-sm font-semibold text-green-800 dark:text-green-200">
                🎁 Earn {product.points_value} points per item!
              </p>
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                Total: {product.points_value * quantity} points for {quantity} item(s)
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Quantity</h3>
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="text-xl font-bold w-12 text-center">{quantity}</span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setQuantity(quantity + 1)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex gap-2">
            <Button variant="outline" size="lg" className="flex-1" onClick={handleAddToCart}>
              <ShoppingCart className="mr-2 h-4 w-4" />
              Add to Cart
            </Button>
            <Button className="flex-1" size="lg" onClick={handleBuyNow}>
              Buy Now
            </Button>
          </CardFooter>
        </Card>

        {/* Product Reviews Section */}
        <Tabs defaultValue="reviews" className="w-full">
          <TabsList className="grid w-full grid-cols-1">
            <TabsTrigger value="reviews">Reviews & Ratings</TabsTrigger>
          </TabsList>
          <TabsContent value="reviews" className="mt-4">
            <ReviewSection productId={product.id} />
          </TabsContent>
        </Tabs>

        {user && product && (
          <CheckoutDialog
            open={checkoutOpen}
            onClose={() => setCheckoutOpen(false)}
            product={product}
            quantity={quantity}
            userId={user.id}
            onSuccess={handleCheckoutSuccess}
          />
        )}
      </div>
    </div>
  );
};

export default ProductDetail;
