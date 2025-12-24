import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Heart, Minus, Plus, ArrowLeft, ShoppingCart, Sparkles, Star, Crown, Lock, Share2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { usePremiumMembership } from "@/hooks/usePremiumMembership";
import CheckoutDialog from "@/components/CheckoutDialog";
import ReviewSection from "@/components/ReviewSection";
import ImageViewer from "@/components/ImageViewer";
import { cn } from "@/lib/utils";

interface Product {
  id: number;
  name: string;
  price: number;
  image_url: string;
  description: string | null;
  points_value: number;
  image_url_2?: string;
  image_url_3?: string;
  image_url_4?: string;
  is_premium?: boolean;
}

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isFavourite, setIsFavourite] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string>("");
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const { isPremium, loading: premiumLoading } = usePremiumMembership();

  // Check if product is premium and user doesn't have subscription
  const isLocked = product?.is_premium && !isPremium;

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
      setSelectedImage(data.image_url);
    }
    setLoading(false);
  };

  const getProductImages = () => {
    if (!product) return [];
    const images = [product.image_url];
    if (product.image_url_2) images.push(product.image_url_2);
    if (product.image_url_3) images.push(product.image_url_3);
    if (product.image_url_4) images.push(product.image_url_4);
    return images.slice(0, 4);
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
    toast({
      title: isFavourite ? "Removed from favourites" : "Added to favourites! ❤️",
      description: isFavourite ? "Product removed from your favourites" : "You can find it in your favourites",
    });
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

    if (isLocked) {
      toast({
        title: "Premium Required",
        description: "This product is only available for premium members",
        variant: "destructive",
      });
      return;
    }

    setCheckoutOpen(true);
  };

  const handleCheckoutSuccess = () => {
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

    if (isLocked) {
      toast({
        title: "Premium Required",
        description: "This product is only available for premium members",
        variant: "destructive",
      });
      return;
    }

    if (!product) return;

    const { data: existing } = await supabase
      .from("cart_items")
      .select("id, quantity")
      .eq("user_id", user.id)
      .eq("product_id", product.id)
      .maybeSingle();

    if (existing) {
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
      title: "Added to Cart! 🛒",
      description: `${quantity} ${product.name} added to your cart`,
    });

    navigate("/cart");
  };

  if (loading || !product) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground font-medium animate-pulse">Loading product...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30 pb-8">
      <header className="bg-gradient-primary text-primary-foreground p-4 sticky top-0 z-40 shadow-lg">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 rounded-full hover:bg-primary-foreground/10 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-display font-bold">Product Details</h1>
        </div>
      </header>

      <div className="max-w-screen-xl mx-auto p-4 space-y-6">
        <Card className="overflow-hidden shadow-xl border-0 animate-fade-in">
          {/* Main Image - Tap to zoom */}
          <div 
            className="aspect-square bg-muted relative group cursor-zoom-in"
            onClick={() => setImageViewerOpen(true)}
          >
            <img
              src={selectedImage || product.image_url}
              alt={product.name}
              className="w-full h-full object-contain transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-foreground/10 to-transparent pointer-events-none" />
            <div className="absolute bottom-3 right-3 bg-background/80 backdrop-blur-sm px-2 py-1 rounded-full text-xs text-muted-foreground">
              Tap to zoom
            </div>
          </div>
          
          {/* Thumbnail Gallery */}
          {getProductImages().length > 1 && (
            <div className="p-3 flex gap-2 overflow-x-auto">
              {getProductImages().map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImage(img)}
                  className={cn(
                    "w-16 h-16 rounded-lg overflow-hidden border-2 transition-all flex-shrink-0",
                    selectedImage === img 
                      ? "border-primary shadow-lg" 
                      : "border-transparent hover:border-primary/50"
                  )}
                >
                  <img
                    src={img}
                    alt={`${product.name} ${idx + 1}`}
                    className="w-full h-full object-contain bg-muted"
                  />
                </button>
              ))}
            </div>
          )}
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <CardTitle className="text-2xl font-display">{product.name}</CardTitle>
                <CardDescription className="text-2xl font-bold text-primary mt-2">
                  {product.price.toLocaleString()} MMK
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    const shareUrl = `${window.location.origin}/product/${product.id}`;
                    if (navigator.share) {
                      navigator.share({
                        title: product.name,
                        text: `Check out ${product.name} on Kaung Computer!`,
                        url: shareUrl,
                      });
                    } else {
                      navigator.clipboard.writeText(shareUrl);
                      toast({
                        title: "Link copied!",
                        description: "Product link copied to clipboard",
                      });
                    }
                  }}
                  className="shrink-0 rounded-full h-12 w-12 transition-all duration-300 hover:bg-muted"
                >
                  <Share2 className="h-5 w-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleFavourite}
                  className={`shrink-0 rounded-full h-12 w-12 transition-all duration-300 ${
                    isFavourite ? "bg-primary/10 hover:bg-primary/20" : "hover:bg-muted"
                  }`}
                >
                  <Heart
                    className={`h-6 w-6 transition-all duration-300 ${
                      isFavourite ? "fill-primary text-primary scale-110" : ""
                    }`}
                  />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {product.description && (
              <div className="animate-fade-in" style={{ animationDelay: '100ms' }}>
                <h3 className="font-display font-semibold mb-2">Description</h3>
                <p className="text-muted-foreground leading-relaxed">{product.description}</p>
              </div>
            )}

            <div 
              className="p-4 bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl border border-primary/20 animate-fade-in"
              style={{ animationDelay: '150ms' }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <p className="font-display font-semibold text-primary">
                  Earn {product.points_value} points per item!
                </p>
              </div>
              <p className="text-sm text-muted-foreground">
                Total: <span className="font-bold text-primary">{product.points_value * quantity} points</span> for {quantity} item(s)
              </p>
            </div>

            <div className="animate-fade-in" style={{ animationDelay: '200ms' }}>
              <h3 className="font-display font-semibold mb-3">Quantity</h3>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 bg-muted/50 rounded-full p-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 rounded-full hover:bg-background"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="text-xl font-bold w-12 text-center">{quantity}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 rounded-full hover:bg-background"
                    onClick={() => setQuantity(quantity + 1)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex gap-3 pt-4">
            <Button 
              variant="outline" 
              size="lg" 
              className="flex-1 h-12 hover:bg-muted transition-all duration-300" 
              onClick={handleAddToCart}
            >
              <ShoppingCart className="mr-2 h-5 w-5" />
              Add to Cart
            </Button>
            <Button 
              className="flex-1 h-12 shadow-lg hover:shadow-xl transition-all duration-300" 
              size="lg" 
              onClick={handleBuyNow}
            >
              Buy Now
            </Button>
          </CardFooter>
        </Card>

        {/* Product Reviews Section */}
        <Tabs defaultValue="reviews" className="w-full animate-fade-in" style={{ animationDelay: '250ms' }}>
          <TabsList className="grid w-full grid-cols-1 bg-muted/50 p-1 rounded-xl">
            <TabsTrigger 
              value="reviews"
              className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-md flex items-center gap-2"
            >
              <Star className="h-4 w-4" />
              Reviews & Ratings
            </TabsTrigger>
          </TabsList>
          <TabsContent value="reviews" className="mt-4">
            <ReviewSection productId={product.id} />
          </TabsContent>
        </Tabs>

        {user && product && (
          <CheckoutDialog
            open={checkoutOpen}
            onClose={() => setCheckoutOpen(false)}
            cartItems={[{
              id: 'temp-' + product.id,
              quantity: quantity,
              products: product,
            }]}
            userId={user.id}
            onSuccess={handleCheckoutSuccess}
          />
        )}

        {/* Image Viewer for pinch-to-zoom */}
        <ImageViewer
          src={selectedImage || product.image_url}
          alt={product.name}
          open={imageViewerOpen}
          onOpenChange={setImageViewerOpen}
        />
      </div>
    </div>
  );
};

export default ProductDetail;