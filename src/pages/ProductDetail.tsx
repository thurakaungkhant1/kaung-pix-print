import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Heart, Minus, Plus, ArrowLeft, Sparkles, Star, Crown, Lock, Share2, Wallet, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePremiumMembership } from "@/hooks/usePremiumMembership";
import ReviewSection from "@/components/ReviewSection";
import ImageViewer from "@/components/ImageViewer";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string>("");
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [showInsufficientBalanceDialog, setShowInsufficientBalanceDialog] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const { isPremium, loading: premiumLoading } = usePremiumMembership();

  // Check if product is premium and user doesn't have subscription
  const isLocked = product?.is_premium && !isPremium;

  useEffect(() => {
    loadProduct();
    if (user) {
      checkFavourite();
      loadWalletBalance();
    }
  }, [id, user]);

  const loadWalletBalance = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('profiles')
      .select('wallet_balance')
      .eq('id', user.id)
      .single();
    setWalletBalance(data?.wallet_balance || 0);
  };

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

  const handleBuyNow = async () => {
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

    if (!product) return;

    const totalPrice = product.price * quantity;

    // Check wallet balance
    if (walletBalance < totalPrice) {
      setShowInsufficientBalanceDialog(true);
      return;
    }

    setPurchasing(true);

    try {
      const newBalance = walletBalance - totalPrice;

      // Deduct from wallet
      const { error: balanceError } = await supabase
        .from('profiles')
        .update({ wallet_balance: newBalance })
        .eq('id', user.id);

      if (balanceError) throw balanceError;

      // Create order
      const { data: orderData, error: orderError } = await supabase.from("orders").insert({
        user_id: user.id,
        product_id: product.id,
        quantity: quantity,
        price: totalPrice,
        phone_number: "",
        delivery_address: "",
        payment_method: "wallet",
        status: "pending",
      }).select().single();

      if (orderError) throw orderError;

      // Create wallet transaction
      await supabase.from('wallet_transactions').insert({
        user_id: user.id,
        amount: -totalPrice,
        transaction_type: 'purchase',
        reference_id: orderData.id,
        description: `Purchase: ${product.name} x${quantity}`,
        balance_after: newBalance
      });

      setWalletBalance(newBalance);
      toast({
        title: "Purchase Successful! 🎉",
        description: `Order placed for ${product.name}. You earned ${product.points_value * quantity} points!`,
      });
      loadProduct();
    } catch (error: any) {
      toast({
        title: "Purchase failed",
        description: error.message,
        variant: "destructive",
      });
    }

    setPurchasing(false);
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
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20 pb-8">
      {/* Enhanced Header */}
      <header className="bg-gradient-to-r from-primary via-primary to-primary/90 text-primary-foreground p-4 sticky top-0 z-40 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate(-1)}
              className="p-2.5 rounded-full bg-primary-foreground/10 hover:bg-primary-foreground/20 transition-all duration-300 hover:scale-105 active:scale-95"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-xl font-display font-bold tracking-tight">Product Details</h1>
          </div>
          <div className="flex items-center gap-2">
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
              className="h-10 w-10 rounded-full bg-primary-foreground/10 hover:bg-primary-foreground/20 transition-all"
            >
              <Share2 className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-screen-xl mx-auto space-y-6">
        {/* Hero Image Section - Larger & More Immersive */}
        <div className="relative">
          <div 
            className="aspect-[4/3] bg-gradient-to-b from-muted to-muted/50 relative group cursor-zoom-in overflow-hidden"
            onClick={() => setImageViewerOpen(true)}
          >
            <img
              src={selectedImage || product.image_url}
              alt={product.name}
              className="w-full h-full object-contain transition-all duration-700 group-hover:scale-110"
            />
            {/* Gradient overlays for depth */}
            <div className="absolute inset-0 bg-gradient-to-t from-background/20 via-transparent to-transparent pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-b from-background/10 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />
            
            {/* Zoom indicator */}
            <div className="absolute bottom-4 right-4 bg-background/90 backdrop-blur-md px-3 py-2 rounded-full text-sm text-muted-foreground flex items-center gap-2 shadow-lg opacity-80 group-hover:opacity-100 transition-all">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
              </svg>
              Tap to zoom
            </div>
            
            {/* Favorite button - Floating */}
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                toggleFavourite();
              }}
              className={cn(
                "absolute top-4 right-4 h-12 w-12 rounded-full shadow-lg backdrop-blur-md transition-all duration-300",
                isFavourite 
                  ? "bg-primary/90 hover:bg-primary text-primary-foreground scale-110" 
                  : "bg-background/90 hover:bg-background text-foreground hover:scale-110"
              )}
            >
              <Heart
                className={cn(
                  "h-6 w-6 transition-all duration-300",
                  isFavourite && "fill-current animate-pulse"
                )}
              />
            </Button>
          </div>
          
          {/* Thumbnail Gallery - Enhanced */}
          {getProductImages().length > 1 && (
            <div className="p-4 flex gap-3 overflow-x-auto scrollbar-hide bg-gradient-to-t from-background to-transparent">
              {getProductImages().map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImage(img)}
                  className={cn(
                    "w-20 h-20 rounded-2xl overflow-hidden border-2 transition-all duration-300 flex-shrink-0 shadow-md hover:shadow-lg",
                    selectedImage === img 
                      ? "border-primary ring-2 ring-primary/30 scale-105" 
                      : "border-transparent hover:border-primary/40 hover:scale-105"
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
        </div>
        {/* Product Info Card - Enhanced */}
        <Card className="mx-4 rounded-3xl border-0 shadow-2xl overflow-hidden animate-slide-up">
          <CardHeader className="pb-4 bg-gradient-to-b from-muted/30 to-transparent">
            <CardTitle className="text-2xl sm:text-3xl font-display font-bold tracking-tight">{product.name}</CardTitle>
            <div className="flex items-baseline gap-3 mt-3">
              <CardDescription className="text-3xl sm:text-4xl font-display font-black text-primary">
                {product.price.toLocaleString()}
              </CardDescription>
              <span className="text-lg text-muted-foreground font-medium">MMK</span>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6 pt-2">
            {product.description && (
              <div className="animate-fade-in" style={{ animationDelay: '100ms' }}>
                <h3 className="font-display font-semibold text-lg mb-3 flex items-center gap-2">
                  <span className="h-1 w-1 rounded-full bg-primary" />
                  Description
                </h3>
                <p className="text-muted-foreground leading-relaxed text-base">{product.description}</p>
              </div>
            )}

            {/* Points Reward - Enhanced */}
            <div 
              className="p-5 bg-gradient-to-br from-primary/15 via-primary/10 to-accent/5 rounded-2xl border border-primary/20 animate-fade-in shadow-inner"
              style={{ animationDelay: '150ms' }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-xl bg-primary/20">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>
                <p className="font-display font-bold text-lg text-primary">
                  Earn {product.points_value} points per item!
                </p>
              </div>
              <p className="text-muted-foreground">
                Total reward: <span className="font-bold text-primary text-lg">{product.points_value * quantity} points</span> for {quantity} item(s)
              </p>
            </div>

            {/* Quantity Selector - Enhanced */}
            <div className="animate-fade-in" style={{ animationDelay: '200ms' }}>
              <h3 className="font-display font-semibold text-lg mb-4 flex items-center gap-2">
                <span className="h-1 w-1 rounded-full bg-primary" />
                Quantity
              </h3>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1 bg-muted/50 rounded-2xl p-1.5 shadow-inner">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-12 w-12 rounded-xl hover:bg-background hover:shadow-md transition-all active:scale-95"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  >
                    <Minus className="h-5 w-5" />
                  </Button>
                  <span className="text-2xl font-bold w-14 text-center font-display">{quantity}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-12 w-12 rounded-xl hover:bg-background hover:shadow-md transition-all active:scale-95"
                    onClick={() => setQuantity(quantity + 1)}
                  >
                    <Plus className="h-5 w-5" />
                  </Button>
                </div>
                <div className="text-muted-foreground">
                  <span className="text-sm">Total:</span>
                  <p className="font-bold text-foreground text-lg">{(product.price * quantity).toLocaleString()} MMK</p>
                </div>
              </div>
            </div>
          </CardContent>
          
          {/* Purchase Section - Enhanced CTA */}
          <CardFooter className="flex flex-col gap-4 p-6 bg-gradient-to-t from-muted/30 to-transparent">
            {/* Wallet Balance Display */}
            <div className="w-full p-4 bg-muted/60 rounded-2xl flex items-center justify-between backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary/10">
                  <Wallet className="h-5 w-5 text-primary" />
                </div>
                <span className="text-muted-foreground font-medium">Your Balance</span>
              </div>
              <span className={cn(
                "font-bold text-lg",
                walletBalance >= (product?.price || 0) * quantity ? "text-primary" : "text-destructive"
              )}>
                {walletBalance.toLocaleString()} MMK
              </span>
            </div>
            
            {/* Buy Now Button - Premium CTA */}
            <Button 
              className={cn(
                "w-full h-14 text-lg font-bold rounded-2xl transition-all duration-300",
                "bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary",
                "shadow-xl hover:shadow-2xl hover:shadow-primary/25",
                "active:scale-[0.98]"
              )}
              size="lg" 
              onClick={handleBuyNow}
              disabled={purchasing}
            >
              {purchasing ? (
                <span className="flex items-center gap-3">
                  <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Processing...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Buy Now — {((product?.price || 0) * quantity).toLocaleString()} MMK
                </span>
              )}
            </Button>
          </CardFooter>
        </Card>

        {/* Product Reviews Section - Enhanced */}
        <div className="px-4">
          <Tabs defaultValue="reviews" className="w-full animate-fade-in" style={{ animationDelay: '250ms' }}>
            <TabsList className="grid w-full grid-cols-1 bg-muted/50 p-1.5 rounded-2xl shadow-inner">
              <TabsTrigger 
                value="reviews"
                className="rounded-xl h-12 data-[state=active]:bg-background data-[state=active]:shadow-lg flex items-center gap-2 transition-all"
              >
                <Star className="h-4 w-4" />
                Reviews & Ratings
              </TabsTrigger>
            </TabsList>
            <TabsContent value="reviews" className="mt-5">
              <ReviewSection productId={product.id} />
            </TabsContent>
          </Tabs>
        </div>

        {/* Image Viewer for pinch-to-zoom */}
        <ImageViewer
          src={selectedImage || product.image_url}
          alt={product.name}
          open={imageViewerOpen}
          onOpenChange={setImageViewerOpen}
        />

        {/* Insufficient Balance Dialog */}
        <AlertDialog open={showInsufficientBalanceDialog} onOpenChange={setShowInsufficientBalanceDialog}>
          <AlertDialogContent className="max-w-sm">
            <AlertDialogHeader>
              <div className="flex justify-center mb-4">
                <div className="p-4 rounded-full bg-destructive/10">
                  <AlertTriangle className="h-8 w-8 text-destructive" />
                </div>
              </div>
              <AlertDialogTitle className="text-center">{t("insufficientBalance")}</AlertDialogTitle>
              <AlertDialogDescription className="text-center">
                {t("depositFirst")}
                <div className="mt-3 p-3 bg-muted rounded-lg">
                  <p className="text-sm">
                    <span className="text-muted-foreground">Required: </span>
                    <span className="font-bold text-foreground">{((product?.price || 0) * quantity).toLocaleString()} Ks</span>
                  </p>
                  <p className="text-sm">
                    <span className="text-muted-foreground">Your Balance: </span>
                    <span className="font-bold text-destructive">{walletBalance.toLocaleString()} Ks</span>
                  </p>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
              <AlertDialogAction 
                onClick={() => navigate("/top-up")}
                className="w-full"
              >
                <Wallet className="h-4 w-4 mr-2" />
                {t("deposit")}
              </AlertDialogAction>
              <AlertDialogCancel className="w-full">{t("cancel")}</AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};

export default ProductDetail;