import { useEffect, useState } from "react";
import AnimatedPage from "@/components/animations/AnimatedPage";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Heart,
  Minus,
  Plus,
  ArrowLeft,
  Sparkles,
  Star,
  Share2,
  Wallet,
  AlertTriangle,
  Copy,
  Send,
  ChevronRight,
  Zap,
  ShieldCheck,
  Package,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePremiumMembership } from "@/hooks/usePremiumMembership";
import ReviewSection from "@/components/ReviewSection";
import ImageViewer from "@/components/ImageViewer";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  category?: string;
}

interface Plan {
  id: string;
  name: string;
  duration_label: string | null;
  price: number;
  is_active: boolean;
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
  const [showDigitalInfoDialog, setShowDigitalInfoDialog] = useState(false);
  const [draftMessage, setDraftMessage] = useState("");
  const [draftOrderId, setDraftOrderId] = useState<string | null>(null);
  const [sendingDraft, setSendingDraft] = useState(false);
  const [profile, setProfile] = useState<{ name: string; phone_number: string | null } | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const { isPremium, loading: premiumLoading } = usePremiumMembership();

  const isDigital = product?.category === "Digital Products";
  const selectedPlan = plans.find((p) => p.id === selectedPlanId) || null;
  const unitPrice = isDigital && selectedPlan ? Number(selectedPlan.price) : (product?.price || 0);

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
      .from("profiles")
      .select("wallet_balance, name, phone_number")
      .eq("id", user.id)
      .single();
    setWalletBalance(data?.wallet_balance || 0);
    if (data) setProfile({ name: (data as any).name || "", phone_number: (data as any).phone_number || null });
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
      if (data.category === "Digital Products") {
        const { data: planRows } = await supabase
          .from("digital_product_plans")
          .select("*")
          .eq("product_id", productId)
          .eq("is_active", true)
          .order("sort_order", { ascending: true });
        const list = (planRows || []) as Plan[];
        setPlans(list);
        if (list.length > 0) setSelectedPlanId(list[0].id);
      }
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
      title: isFavourite ? "Removed from favourites" : "Added to favourites",
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

    if (isDigital) {
      if (plans.length === 0) {
        toast({
          title: "No plans available",
          description: "Please contact admin — this product has no purchase plans yet.",
          variant: "destructive",
        });
        return;
      }
      if (!selectedPlan) {
        toast({ title: "Select a plan", variant: "destructive" });
        return;
      }
    }

    const totalPrice = unitPrice * quantity;

    if (walletBalance < totalPrice) {
      setShowInsufficientBalanceDialog(true);
      return;
    }

    setPurchasing(true);

    try {
      const newBalance = walletBalance - totalPrice;

      const { error: balanceError } = await supabase
        .from("public_profiles")
        .update({ wallet_balance: newBalance })
        .eq("id", user.id);

      if (balanceError) throw balanceError;

      const orderInsert: any = {
        user_id: user.id,
        product_id: product.id,
        quantity: quantity,
        price: totalPrice,
        phone_number: "",
        delivery_address: "",
        payment_method: "wallet",
        status: "pending",
      };
      if (isDigital && selectedPlan) {
        orderInsert.plan_id = selectedPlan.id;
        orderInsert.plan_name = selectedPlan.duration_label
          ? `${selectedPlan.name} (${selectedPlan.duration_label})`
          : selectedPlan.name;
      }
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .insert(orderInsert)
        .select()
        .single();

      if (orderError) throw orderError;

      await supabase.from("wallet_transactions").insert({
        user_id: user.id,
        amount: -totalPrice,
        transaction_type: "purchase",
        reference_id: orderData.id,
        description: `Purchase: ${product.name}${selectedPlan ? ` — ${selectedPlan.name}` : ""} x${quantity}`,
        balance_after: newBalance,
      });

      setWalletBalance(newBalance);
      toast({
        title: "Purchase Successful!",
        description: `Order placed for ${product.name}. You earned ${product.points_value * quantity} points!`,
      });
      loadProduct();

      if (product.category === "Digital Products") {
        await supabase.from("orders").update({ status: "awaiting_info" }).eq("id", orderData.id);
        const shortId = String(orderData.id).slice(0, 8).toUpperCase();
        const planLine = selectedPlan
          ? `• Plan: ${selectedPlan.name}${selectedPlan.duration_label ? ` (${selectedPlan.duration_label})` : ""} — ${Number(selectedPlan.price).toLocaleString()} MMK\n`
          : "";
        const prefill =
`မင်္ဂလာပါ Admin 👋

အောက်ပါ Digital Product ဝယ်ယူပြီးပါပြီ။ Activation အတွက် ကျေးဇူးပြုပါ။

• နာမည် (Name): ${profile?.name || "-"}
• ဖုန်း (Phone): ${profile?.phone_number || "-"}
• ပစ္စည်း (Product): ${product.name} × ${quantity}
${planLine}• Order ID: #${shortId}

Account info / Username / Email:
- 

ကျေးဇူးတင်ပါတယ်။`;
        setDraftMessage(prefill);
        setDraftOrderId(orderData.id);
        setShowDigitalInfoDialog(true);
      }
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

  const images = getProductImages();

  return (
    <AnimatedPage>
      <div className="min-h-screen bg-background pb-28">
        {/* ── Floating translucent top bar ── */}
        <div className="fixed top-0 left-0 right-0 z-50 px-4 pt-4 pb-2 flex items-center justify-between pointer-events-none">
          <button
            onClick={() => navigate(-1)}
            className="pointer-events-auto h-10 w-10 rounded-full bg-background/70 backdrop-blur-md border border-border/40 flex items-center justify-center shadow-sm hover:bg-background transition-colors active:scale-95"
          >
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>
          <div className="flex items-center gap-2 pointer-events-auto">
            <button
              onClick={() => {
                const shareUrl = `${window.location.origin}/product/${product.id}`;
                if (navigator.share) {
                  navigator.share({ title: product.name, text: `Check out ${product.name} on Kaung Computer!`, url: shareUrl });
                } else {
                  navigator.clipboard.writeText(shareUrl);
                  toast({ title: "Link copied!" });
                }
              }}
              className="h-10 w-10 rounded-full bg-background/70 backdrop-blur-md border border-border/40 flex items-center justify-center shadow-sm hover:bg-background transition-colors active:scale-95"
            >
              <Share2 className="h-4 w-4 text-foreground" />
            </button>
            <button
              onClick={toggleFavourite}
              className={cn(
                "h-10 w-10 rounded-full backdrop-blur-md border flex items-center justify-center shadow-sm transition-all active:scale-95",
                isFavourite
                  ? "bg-rose-500/90 border-rose-400/30 text-white"
                  : "bg-background/70 border-border/40 text-foreground hover:bg-background"
              )}
            >
              <Heart className={cn("h-4 w-4", isFavourite && "fill-current")} />
            </button>
          </div>
        </div>

        {/* ── Hero Image ── */}
        <div
          className="relative w-full aspect-square bg-muted cursor-zoom-in overflow-hidden"
          onClick={() => setImageViewerOpen(true)}
        >
          <img
            src={selectedImage || product.image_url}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
          />
          {images.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
              {images.map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-300",
                    selectedImage === images[i] ? "w-6 bg-white" : "w-1.5 bg-white/50"
                  )}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Thumbnail strip ── */}
        {images.length > 1 && (
          <div className="px-4 -mt-6 relative z-10 flex gap-2 overflow-x-auto scrollbar-hide">
            {images.map((img, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedImage(img)}
                className={cn(
                  "w-16 h-16 rounded-2xl overflow-hidden border-2 transition-all duration-200 flex-shrink-0 shadow-lg",
                  selectedImage === img
                    ? "border-primary ring-2 ring-primary/20 scale-105"
                    : "border-white/80 hover:border-primary/40"
                )}
              >
                <img src={img} alt="" className="w-full h-full object-cover bg-muted" />
              </button>
            ))}
          </div>
        )}

        {/* ── Content ── */}
        <div className="px-5 pt-6 space-y-6 max-w-screen-sm mx-auto">
          {/* Title & Price */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              {isDigital && (
                <Badge variant="secondary" className="rounded-lg bg-primary/10 text-primary border-0 text-xs font-semibold px-2.5 py-0.5">
                  <Zap className="h-3 w-3 mr-1" />
                  Digital
                </Badge>
              )}
              {product.is_premium && (
                <Badge className="rounded-lg bg-amber-500/10 text-amber-600 border-0 text-xs font-semibold px-2.5 py-0.5">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Premium
                </Badge>
              )}
            </div>
            <h1 className="text-2xl font-display font-bold tracking-tight leading-tight">
              {product.name}
            </h1>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-display font-black text-primary tracking-tight">
                {unitPrice.toLocaleString()}
              </span>
              <span className="text-sm text-muted-foreground font-medium">MMK</span>
            </div>
            {isDigital && selectedPlan && (
              <p className="text-xs text-muted-foreground">
                Selected: <span className="text-foreground font-medium">{selectedPlan.name}</span>
                {selectedPlan.duration_label ? ` · ${selectedPlan.duration_label}` : ""}
              </p>
            )}
          </div>

          {/* Divider */}
          <div className="h-px bg-border/60" />

          {/* Points Reward */}
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-primary/5 border border-primary/10">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                Earn {product.points_value} points per item
              </p>
              <p className="text-xs text-muted-foreground">
                {product.points_value * quantity} points total for {quantity} item(s)
              </p>
            </div>
          </div>

          {/* Description */}
          {product.description && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Description
              </h3>
              <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-line">
                {product.description}
              </p>
            </div>
          )}

          {/* Plans */}
          {isDigital && plans.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Choose a Plan
              </h3>
              <div className="grid grid-cols-1 gap-2">
                {plans.map((p) => {
                  const active = selectedPlanId === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedPlanId(p.id)}
                      className={cn(
                        "relative flex items-center justify-between p-4 rounded-2xl border transition-all duration-200 text-left",
                        active
                          ? "border-primary bg-primary/[0.04] shadow-sm"
                          : "border-border/60 bg-card hover:border-primary/30"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors",
                            active ? "border-primary" : "border-muted-foreground/30"
                          )}
                        >
                          {active && <div className="h-2.5 w-2.5 rounded-full bg-primary" />}
                        </div>
                        <div>
                          <p className="font-semibold text-sm">{p.name}</p>
                          {p.duration_label && (
                            <p className="text-xs text-muted-foreground">{p.duration_label}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={cn("font-bold text-base", active ? "text-primary" : "text-foreground")}>
                          {Number(p.price).toLocaleString()}
                        </p>
                        <p className="text-[10px] text-muted-foreground">MMK</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quantity */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Quantity
            </h3>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 bg-muted/60 rounded-2xl p-1.5">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="h-10 w-10 rounded-xl bg-card shadow-sm flex items-center justify-center hover:shadow transition-all active:scale-95 disabled:opacity-40"
                  disabled={quantity <= 1}
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="text-lg font-bold w-10 text-center tabular-nums">{quantity}</span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="h-10 w-10 rounded-xl bg-card shadow-sm flex items-center justify-center hover:shadow transition-all active:scale-95"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-xl font-bold text-foreground tabular-nums">
                  {(unitPrice * quantity).toLocaleString()} <span className="text-sm font-medium text-muted-foreground">MMK</span>
                </p>
              </div>
            </div>
          </div>

          {/* Trust badges */}
          <div className="grid grid-cols-3 gap-2">
            <div className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-muted/40 text-center">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <span className="text-[10px] font-medium text-muted-foreground leading-tight">Secure Payment</span>
            </div>
            <div className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-muted/40 text-center">
              <Package className="h-5 w-5 text-primary" />
              <span className="text-[10px] font-medium text-muted-foreground leading-tight">Instant Delivery</span>
            </div>
            <div className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-muted/40 text-center">
              <Zap className="h-5 w-5 text-primary" />
              <span className="text-[10px] font-medium text-muted-foreground leading-tight">24/7 Support</span>
            </div>
          </div>

          {/* Reviews */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Star className="h-4 w-4" />
              Reviews & Ratings
            </h3>
            <ReviewSection productId={product.id} />
          </div>
        </div>

        {/* ── Sticky Bottom Bar ── */}
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-background/90 backdrop-blur-xl border-t border-border/40 px-5 py-4">
          <div className="max-w-screen-sm mx-auto flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground truncate">
                <Wallet className="h-3 w-3 inline mr-1 -mt-0.5" />
                Balance: <span className={cn("font-semibold", walletBalance >= unitPrice * quantity ? "text-primary" : "text-destructive")}>
                  {walletBalance.toLocaleString()} MMK
                </span>
              </p>
              <p className="text-lg font-bold text-foreground truncate tabular-nums">
                {(unitPrice * quantity).toLocaleString()} <span className="text-sm font-medium text-muted-foreground">MMK</span>
              </p>
            </div>
            <Button
              onClick={handleBuyNow}
              disabled={purchasing || isLocked}
              className={cn(
                "h-12 px-8 rounded-2xl font-bold text-base shadow-lg transition-all active:scale-[0.97]",
                isLocked
                  ? "bg-muted text-muted-foreground shadow-none"
                  : "bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-primary/25"
              )}
            >
              {purchasing ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Processing
                </span>
              ) : isLocked ? (
                <span className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  Premium Only
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Buy Now
                  <ChevronRight className="h-4 w-4" />
                </span>
              )}
            </Button>
          </div>
        </div>

        {/* ── Dialogs ── */}
        <ImageViewer
          src={selectedImage || product.image_url}
          alt={product.name}
          open={imageViewerOpen}
          onOpenChange={setImageViewerOpen}
        />

        <AlertDialog open={showInsufficientBalanceDialog} onOpenChange={setShowInsufficientBalanceDialog}>
          <AlertDialogContent className="max-w-sm rounded-3xl">
            <AlertDialogHeader>
              <div className="flex justify-center mb-4">
                <div className="p-4 rounded-full bg-destructive/10">
                  <AlertTriangle className="h-8 w-8 text-destructive" />
                </div>
              </div>
              <AlertDialogTitle className="text-center">{t("insufficientBalance")}</AlertDialogTitle>
              <AlertDialogDescription className="text-center">
                {t("depositFirst")}
                <div className="mt-3 p-3 bg-muted rounded-2xl space-y-1">
                  <p className="text-sm flex justify-between">
                    <span className="text-muted-foreground">Required</span>
                    <span className="font-bold text-foreground">{(unitPrice * quantity).toLocaleString()} Ks</span>
                  </p>
                  <p className="text-sm flex justify-between">
                    <span className="text-muted-foreground">Your Balance</span>
                    <span className="font-bold text-destructive">{walletBalance.toLocaleString()} Ks</span>
                  </p>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
              <AlertDialogAction onClick={() => navigate("/top-up")} className="w-full rounded-xl h-11">
                <Wallet className="h-4 w-4 mr-2" />
                {t("deposit")}
              </AlertDialogAction>
              <AlertDialogCancel className="w-full rounded-xl h-11 mt-0">{t("cancel")}</AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Dialog open={showDigitalInfoDialog} onOpenChange={setShowDigitalInfoDialog}>
          <DialogContent className="max-w-md rounded-3xl">
            <DialogHeader>
              <div className="flex justify-center mb-2">
                <div className="p-3 rounded-full bg-primary/10">
                  <Sparkles className="h-7 w-7 text-primary" />
                </div>
              </div>
              <DialogTitle className="text-center">Admin ကို Message အတည်ပြုပါ</DialogTitle>
              <DialogDescription className="text-center text-xs">
                ပို့မည့်စာကို ဖတ်ပြီး လိုအပ်ရင် ပြင်နိုင်ပါတယ်။ Copy လည်း လုပ်နိုင်ပါတယ်။
              </DialogDescription>
            </DialogHeader>
            <Textarea value={draftMessage} onChange={(e) => setDraftMessage(e.target.value)} rows={12} className="text-xs font-mono rounded-xl" />
            <DialogFooter className="flex-col gap-2 sm:flex-col">
              <Button
                variant="outline"
                className="w-full rounded-xl h-11"
                onClick={() => {
                  navigator.clipboard.writeText(draftMessage);
                  toast({ title: "Copied!", description: "Message ကို copy လုပ်ပြီးပါပြီ" });
                }}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy Message
              </Button>
              <Button
                className="w-full rounded-xl h-11"
                disabled={sendingDraft || !draftMessage.trim()}
                onClick={async () => {
                  if (!user) return;
                  setSendingDraft(true);
                  const { error } = await (supabase as any).from("support_messages").insert({
                    user_id: user.id,
                    sender_role: "user",
                    body: draftMessage.trim(),
                    order_id: draftOrderId,
                  });
                  setSendingDraft(false);
                  if (error) {
                    toast({ title: "Send failed", description: error.message, variant: "destructive" });
                    return;
                  }
                  setShowDigitalInfoDialog(false);
                  navigate("/support");
                }}
              >
                <Send className="h-4 w-4 mr-2" />
                {sendingDraft ? "Sending…" : "Admin ထံ ပို့မယ်"}
              </Button>
              <Button variant="ghost" className="w-full rounded-xl h-11" onClick={() => setShowDigitalInfoDialog(false)}>
                နောက်မှ
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AnimatedPage>
  );
};

export default ProductDetail;
