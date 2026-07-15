import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Diamond, 
  Gamepad2, 
  History, 
  Sparkles, 
  Smartphone, 
  Wifi, 
  Phone, 
  ShoppingBag,
  Zap,
  Gift,
  CreditCard,
  Wallet,
  Plus,
  Percent,
  Loader2,
  Copy,
  CheckCircle2,
  AlertCircle,
  Search
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import MobileLayout from "@/components/MobileLayout";
import AnimatedPage from "@/components/animations/AnimatedPage";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import WalletDisplay from "@/components/WalletDisplay";
import TopUpDialog from "@/components/TopUpDialog";


import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

interface Product {
  id: number;
  name: string;
  price: number;
  original_price?: number | null;
  image_url: string;
  description: string | null;
  category: string;
  points_value: number;
  diamond_tier?: string | null;
}


interface Order {
  id: string;
  created_at: string;
  status: string;
  product_id: number;
  quantity: number;
  price: number;
  game_id: string | null;
  server_id: string | null;
  game_name: string | null;
  phone_number: string;
  products: {
    name: string;
    image_url: string;
    category: string;
  };
}

// Game categories with icons and images
const GAME_CATEGORIES = [
  { id: "MLBB Diamonds", name: "Mobile Legends", icon: Diamond, color: "text-blue-500", image: "/images/games/mobile-legends.png" },
  { id: "PUBG UC", name: "PUBG Mobile", icon: Gamepad2, color: "text-yellow-500", image: "/images/games/pubg-mobile.png" },
];

const MOBILE_CATEGORIES = [
  { id: "Phone Top-up", name: "Phone Top-up", icon: Smartphone },
  { id: "Data Plans", name: "Data Plans", icon: Wifi },
  { id: "Voice Plans", name: "Voice Plans", icon: Phone },
];

const MOBILE_OPERATORS = ["MPT", "Ooredoo", "Mytel", "Atom"] as const;

const matchesOperator = (productName: string, operator: string) => {
  const n = productName.toLowerCase().trim();
  const o = operator.toLowerCase();
  return n.startsWith(o + " ") || n.startsWith(o + "-") || n === o;
};


const GamePage = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPurchaseDialog, setShowPurchaseDialog] = useState(false);
  const [showTopUpDialog, setShowTopUpDialog] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [gameId, setGameId] = useState("");
  const [serverId, setServerId] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [purchasing, setPurchasing] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>(() => localStorage.getItem("shopActiveTab") || "games");
  const [selectedGameCategory, setSelectedGameCategory] = useState<string | null>(() => localStorage.getItem("shopGameCat"));
  const [selectedMobileService, setSelectedMobileService] = useState<string | null>(() => localStorage.getItem("shopMobileCat"));
  const [selectedOperator, setSelectedOperator] = useState<string | null>(() => localStorage.getItem("shopMobileOperator"));
  const [selectedDiamondTier, setSelectedDiamondTier] = useState<string | null>(null);
  const [nameCheckLoading, setNameCheckLoading] = useState(false);
  const [nameCheckResult, setNameCheckResult] = useState<{ ok: boolean; name?: string; message?: string } | null>(null);
  const [nameCheckError, setNameCheckError] = useState<{ id?: string; server?: string }>({});

  const handleCheckGameName = async () => {
    const errs: { id?: string; server?: string } = {};
    if (!gameId.trim()) errs.id = "User ID required";
    if (!serverId.trim()) errs.server = "Zone ID required";
    setNameCheckError(errs);
    if (Object.keys(errs).length) return;
    setNameCheckLoading(true);
    setNameCheckResult(null);
    try {
      const projectRef = "ojoenxchuzqonpixomkl";
      const res = await fetch(
        `https://${projectRef}.supabase.co/functions/v1/ml-nickname?id=${encodeURIComponent(gameId.trim())}&zone=${encodeURIComponent(serverId.trim())}`,
      );
      const data = await res.json();
      if (data?.success && data?.name) {
        setNameCheckResult({ ok: true, name: data.name });
      } else {
        setNameCheckResult({ ok: false, message: data?.message || "Player not found" });
      }
    } catch {
      setNameCheckResult({ ok: false, message: "Cannot retrieve game name" });
    } finally {
      setNameCheckLoading(false);
    }
  };

  const handleCopyName = async () => {
    if (!nameCheckResult?.name) return;
    try {
      await navigator.clipboard.writeText(nameCheckResult.name);
      toast({ title: "Copied", description: "Player name copied to clipboard" });
    } catch {}
  };

  const [filterLoading, setFilterLoading] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const { user } = useAuth();
  const { toast } = useToast();
  


  useEffect(() => {
    loadProducts();
    if (user) {
      loadOrders();
      loadWalletBalance();
    }
  }, [user]);

  // Reset diamond tier when switching games (must be before any early return)
  useEffect(() => { setSelectedDiamondTier(null); }, [selectedGameCategory]);


  // Persist filter selections
  useEffect(() => { localStorage.setItem("shopActiveTab", activeCategory); }, [activeCategory]);
  useEffect(() => {
    if (selectedGameCategory) localStorage.setItem("shopGameCat", selectedGameCategory);
    else localStorage.removeItem("shopGameCat");
  }, [selectedGameCategory]);
  useEffect(() => {
    if (selectedMobileService) localStorage.setItem("shopMobileCat", selectedMobileService);
    else localStorage.removeItem("shopMobileCat");
  }, [selectedMobileService]);
  useEffect(() => {
    if (selectedOperator) localStorage.setItem("shopMobileOperator", selectedOperator);
    else localStorage.removeItem("shopMobileOperator");
  }, [selectedOperator]);

  // Brief shimmer when switching mobile/game filters for snappier feedback
  useEffect(() => {
    setFilterLoading(true);
    const t = setTimeout(() => setFilterLoading(false), 280);
    return () => clearTimeout(t);
  }, [selectedGameCategory, selectedMobileService, selectedOperator, activeCategory]);

  const loadWalletBalance = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('profiles')
      .select('wallet_balance')
      .eq('id', user.id)
      .single();
    setWalletBalance(data?.wallet_balance || 0);
  };

  const loadProducts = async () => {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("price", { ascending: true });

    if (!error && data) {
      setProducts(data);
    }
    setLoading(false);
  };

  const loadOrders = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("orders")
      .select(`
        *,
        products (
          name,
          image_url,
          category
        )
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    if (!error && data) {
      setOrders(data as Order[]);
    }
  };

  const isGameProduct = (category: string) => {
    return GAME_CATEGORIES.some(cat => cat.id === category);
  };

  const isMobileProduct = (category: string) => {
    return MOBILE_CATEGORIES.some(cat => cat.id === category);
  };

  // Only MLBB requires Server ID
  const requiresServerId = (category: string) => {
    return category === "MLBB Diamonds";
  };

  const getFilteredProducts = () => {
    if (activeCategory === "games") {
      if (selectedGameCategory) {
        return products.filter(p => p.category === selectedGameCategory);
      }
      return products.filter(p => isGameProduct(p.category));
    } else if (activeCategory === "mobile") {
      let list = products.filter(p => isMobileProduct(p.category));
      if (selectedMobileService) {
        list = list.filter(p => p.category === selectedMobileService);
      }
      if (selectedOperator) {
        list = list.filter(p => matchesOperator(p.name, selectedOperator));
      }
      return list;
    }
    return products;
  };

  const handleBuyClick = (product: Product) => {
    if (!user) {
      toast({
        title: "Login required",
        description: "Please login to make a purchase",
        variant: "destructive",
      });
      return;
    }
    setSelectedProduct(product);
    setShowPurchaseDialog(true);
    setGameId("");
    setServerId("");
    setPhoneNumber("");
  };

  const handleQuickBuy = async () => {
    if (!selectedProduct || !user) return;

    // Validate based on product type
    if (isGameProduct(selectedProduct.category)) {
      // All games require Player ID
      if (!gameId) {
        toast({
          title: "Error",
          description: "Please enter your Player ID",
          variant: "destructive",
        });
        return;
      }
      // Only MLBB requires Server ID
      if (requiresServerId(selectedProduct.category) && !serverId) {
        toast({
          title: "Error",
          description: "Please enter your Server ID",
          variant: "destructive",
        });
        return;
      }
    } else if (isMobileProduct(selectedProduct.category)) {
      // Phone Top-up and Data Plans require phone number
      if (!phoneNumber) {
        toast({
          title: "Error",
          description: "Please enter your phone number",
          variant: "destructive",
        });
        return;
      }
    }

    // Check wallet balance
    if (walletBalance < selectedProduct.price) {
      toast({
        title: "Insufficient Balance",
        description: "Please top up your wallet to make this purchase",
        variant: "destructive",
      });
      return;
    }

    setPurchasing(true);

    try {
      const newBalance = walletBalance - selectedProduct.price;

      // Deduct from wallet
      const { error: balanceError } = await supabase
        .from('profiles')
        .update({ wallet_balance: newBalance })
        .eq('id', user.id);

      if (balanceError) throw balanceError;

      // Create order
      const { data: orderData, error: orderError } = await supabase.from("orders").insert({
        user_id: user.id,
        product_id: selectedProduct.id,
        quantity: 1,
        price: selectedProduct.price,
        game_id: isGameProduct(selectedProduct.category) ? gameId : null,
        server_id: requiresServerId(selectedProduct.category) ? serverId : null,
        game_name: selectedProduct.category,
        phone_number: isMobileProduct(selectedProduct.category) ? phoneNumber : "",
        status: "pending",
        payment_method: "wallet",
        delivery_address: "",
      }).select().single();

      if (orderError) throw orderError;

      // Create wallet transaction
      await supabase.functions.invoke('record-wallet-purchase', {
        body: {
          order_id: orderData.id,
          description: `Purchase: ${selectedProduct.name}`,
        },
      });

      setWalletBalance(newBalance);
      setShowPurchaseDialog(false);
      setShowSuccessDialog(true);
      loadOrders();
    } catch (error: any) {
      toast({
        title: "Purchase failed",
        description: error.message,
        variant: "destructive",
      });
    }

    setPurchasing(false);
  };

  const getDiscountPercent = (product: Product) => {
    if (product.original_price && product.original_price > product.price) {
      return Math.round((1 - product.price / product.original_price) * 100);
    }
    return 0;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "secondary",
      approved: "default",
      finished: "default",
      rejected: "destructive",
    };
    return <Badge variant={variants[status] || "outline"}>{status}</Badge>;
  };

  if (loading) {
    return (
      <MobileLayout>
        <div className="min-h-screen bg-background pb-24">
          <div className="max-w-screen-xl mx-auto p-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {[...Array(6)].map((_, i) => (
                <div 
                  key={i} 
                  className="h-48 bg-muted animate-pulse rounded-xl" 
                  style={{ animationDelay: `${i * 100}ms` }}
                />
              ))}
            </div>
          </div>
        </div>


      </MobileLayout>
    );
  }

  const filteredProducts = getFilteredProducts();

  // For new layout: track inline player credentials
  const selectedGame = GAME_CATEGORIES.find(g => g.id === selectedGameCategory) || GAME_CATEGORIES[0];
  const gameProducts = products
    .filter(p => p.category === selectedGame.id)
    .sort((a, b) => a.price - b.price);
  const needsServer = requiresServerId(selectedGame.id);




  // Tier classification for diamond/UC packages
  const DIAMOND_TIERS = [
    { key: "special", name: "Special Offers", emoji: "🎁", chipIcon: Gift,     gradient: "from-pink-500/15 via-rose-500/10 to-pink-500/5",     ring: "ring-pink-500/30",     text: "text-pink-600 dark:text-pink-400" },
    { key: "starter", name: "Starter Packs",  emoji: "✨", chipIcon: Sparkles, gradient: "from-sky-500/15 via-cyan-500/10 to-sky-500/5",       ring: "ring-sky-500/30",      text: "text-sky-600 dark:text-sky-400" },
    { key: "popular", name: "Popular Packs",  emoji: "💎", chipIcon: Diamond,  gradient: "from-violet-500/15 via-indigo-500/10 to-violet-500/5", ring: "ring-violet-500/30", text: "text-violet-600 dark:text-violet-400" },
    { key: "pro",     name: "Pro Packs",      emoji: "🔥", chipIcon: Zap,      gradient: "from-amber-500/15 via-orange-500/10 to-amber-500/5", ring: "ring-amber-500/30",    text: "text-amber-600 dark:text-amber-400" },
    { key: "mega",    name: "Mega Packs",     emoji: "👑", chipIcon: Percent,  gradient: "from-yellow-400/20 via-amber-500/10 to-yellow-400/5", ring: "ring-yellow-500/30",  text: "text-yellow-600 dark:text-yellow-400" },
  ] as const;

  const tierOf = (p: Product): string => {
    // Admin-controlled tier takes precedence
    if (p.diamond_tier && DIAMOND_TIERS.some(t => t.key === p.diamond_tier)) {
      return p.diamond_tier as string;
    }
    const name = p.name.trim();
    if (/pass|bonus|\+|special|weekly|monthly|wp|tp/i.test(name)) return "special";
    const n = parseInt(name.replace(/\D/g, ""), 10);
    if (!n) return "special";
    const isMLBB = selectedGame.id === "MLBB Diamonds";
    if (isMLBB) {
      if (n <= 100) return "starter";
      if (n <= 500) return "popular";
      if (n <= 2000) return "pro";
      return "mega";
    }
    if (n <= 180) return "starter";
    if (n <= 600) return "popular";
    if (n <= 1800) return "pro";
    return "mega";
  };


  const groupedDiamonds = DIAMOND_TIERS
    .map(tier => ({ ...tier, items: gameProducts.filter(p => tierOf(p) === tier.key) }))
    .filter(g => g.items.length > 0);

  const visibleGroups = selectedDiamondTier
    ? groupedDiamonds.filter(g => g.key === selectedDiamondTier)
    : groupedDiamonds;


  const handleSelectPackage = (product: Product) => {
    if (!user) {
      toast({ title: "Login required", description: "Please login to make a purchase", variant: "destructive" });
      return;
    }
    if (!gameId) {
      toast({ title: "Player ID required", description: "Please enter your Player ID", variant: "destructive" });
      return;
    }
    if (needsServer && !serverId) {
      toast({ title: "Server ID required", description: "Please enter your Server ID", variant: "destructive" });
      return;
    }
    setSelectedProduct(product);
    setShowPurchaseDialog(true);
  };

  return (
    <AnimatedPage>
    <MobileLayout>
      {/* Premium Header */}
      <header className="sticky top-0 z-40 bg-background/85 backdrop-blur-xl border-b border-border/40">
        <div className="flex items-center justify-between px-4 h-14">
          <button
            onClick={() => window.history.back()}
            className="h-10 w-10 -ml-2 inline-flex items-center justify-center rounded-full hover:bg-muted transition-colors"
            aria-label="Back"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          </button>
          <h1 className="text-lg font-display font-bold tracking-tight">Game Shop</h1>
          <div className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full bg-card border border-border shadow-sm">
            <CreditCard className="h-4 w-4 text-primary" />
            <span className="text-sm font-bold tabular-nums">{walletBalance.toLocaleString()}</span>
            <span className="text-[10px] font-semibold text-muted-foreground">MMK</span>
          </div>
        </div>
      </header>

      <div className="max-w-screen-md mx-auto p-4 pb-28 space-y-5">
        <Tabs value={activeCategory} className="w-full" onValueChange={(v) => setActiveCategory(v)}>
          <TabsList className="grid w-full grid-cols-3 mb-2 h-11 bg-card/60 border border-border/50">
            <TabsTrigger value="games" className="gap-2 text-xs font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Gamepad2 className="h-3.5 w-3.5" /> Games
            </TabsTrigger>
            <TabsTrigger value="mobile" className="gap-2 text-xs font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Smartphone className="h-3.5 w-3.5" /> Mobile
            </TabsTrigger>
            <TabsTrigger value="orders" className="gap-2 text-xs font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <History className="h-3.5 w-3.5" /> Orders
            </TabsTrigger>
          </TabsList>

          <TabsContent value="games" className="space-y-5 mt-3">
            {/* Select Game */}
            <section>
              <h2 className="text-center text-sm font-semibold text-muted-foreground mb-3">Select Game</h2>
              <div className="grid grid-cols-2 gap-3">
                {GAME_CATEGORIES.map((cat) => {
                  const active = selectedGame.id === cat.id;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedGameCategory(cat.id)}
                      className={cn(
                        "relative rounded-2xl bg-card border-2 p-4 flex flex-col items-center gap-2 transition-all",
                        active
                          ? "border-primary shadow-[0_0_0_4px_hsl(var(--primary)/0.12)]"
                          : "border-border/60 hover:border-primary/40"
                      )}
                    >
                      <div className="w-16 h-16 rounded-xl overflow-hidden bg-muted">
                        <img src={cat.image} alt={cat.name} className="w-full h-full object-cover" />
                      </div>
                      <span className={cn("text-sm font-semibold", active ? "text-primary" : "text-foreground")}>
                        {cat.name.split(" ")[0]}
                      </span>
                      <span className={cn(
                        "inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-[10px] font-bold",
                        active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      )}>
                        <Zap className="h-2.5 w-2.5" /> Instant
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Player Credentials */}
            <section className="relative overflow-hidden rounded-2xl bg-card/80 backdrop-blur-md border border-border/50 p-4 space-y-4 shadow-lg shadow-primary/5">
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shadow-glow">
                  <Gamepad2 className="h-[18px] w-[18px] text-primary" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-sm">Player Credentials</h3>
                  <p className="text-[10px] text-muted-foreground">Enter your game account details</p>
                </div>
              </div>
              <div className={cn("grid gap-3", needsServer ? "grid-cols-2" : "grid-cols-1")}>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 mb-1">
                  <div className="h-5 w-5 rounded-md bg-primary/15 flex items-center justify-center">
                    <svg viewBox="0 0 24 24" className="h-3 w-3 text-primary" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-3.3 2.7-6 6-6h4c3.3 0 6 2.7 6 6"/></svg>
                  </div>
                  <Label className="text-xs font-semibold text-foreground/90">Player ID</Label>
                </div>
                <div className="relative group/input">
                  <Input
                    placeholder="12345678"
                    value={gameId}
                    onChange={(e) => setGameId(e.target.value)}
                    className="h-12 pl-10 pr-4 rounded-xl bg-background/60 border-border/60 focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/20 transition-all duration-300 text-base font-semibold tracking-wide placeholder:font-normal"
                  />
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <Gamepad2 className="h-4 w-4 text-muted-foreground group-focus-within/input:text-primary transition-colors duration-300" />
                  </div>
                </div>
              </div>
              {needsServer && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="h-5 w-5 rounded-md bg-accent/15 flex items-center justify-center">
                      <svg viewBox="0 0 24 24" className="h-3 w-3 text-accent" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/></svg>
                    </div>
                    <Label className="text-xs font-semibold text-foreground/90">Server ID</Label>
                  </div>
                  <div className="relative group/input">
                    <Input
                      placeholder="1234"
                      value={serverId}
                      onChange={(e) => setServerId(e.target.value)}
                      className="h-12 pl-10 pr-4 rounded-xl bg-background/60 border-border/60 focus-visible:border-accent/50 focus-visible:ring-2 focus-visible:ring-accent/20 transition-all duration-300 text-base font-semibold tracking-wide placeholder:font-normal"
                    />
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                      <svg viewBox="0 0 24 24" className="h-4 w-4 text-muted-foreground group-focus-within/input:text-accent transition-colors duration-300" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 2v4m0 12v4M2 12h4m12 0h4"/></svg>
                    </div>
                  </div>
                </div>
              )}
              </div>

              {needsServer && (
                <div className="space-y-3 mt-3">
                  {/* Inline validation errors */}
                  {(nameCheckError.id || nameCheckError.server) && (
                    <div className="flex flex-col gap-1">
                      {nameCheckError.id && (
                        <p className="text-[11px] text-destructive flex items-center gap-1"><AlertCircle className="h-3 w-3" />{nameCheckError.id}</p>
                      )}
                      {nameCheckError.server && (
                        <p className="text-[11px] text-destructive flex items-center gap-1"><AlertCircle className="h-3 w-3" />{nameCheckError.server}</p>
                      )}
                    </div>
                  )}

                  {/* Game Name Checker */}
                  <Button
                    type="button"
                    onClick={handleCheckGameName}
                    disabled={nameCheckLoading}
                    variant="outline"
                    className="w-full h-11 rounded-xl border-primary/30 hover:border-primary/60 hover:bg-primary/5 font-semibold"
                  >
                    {nameCheckLoading ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Checking...</>
                    ) : (
                      <><Search className="h-4 w-4" /> Game Name Checker</>
                    )}
                  </Button>

                  {/* Result Card */}
                  {nameCheckResult && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.25, ease: "easeOut" }}
                      className={cn(
                        "rounded-xl border p-3.5",
                        nameCheckResult.ok
                          ? "border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent"
                          : "border-destructive/30 bg-destructive/5"
                      )}
                    >
                      {nameCheckResult.ok ? (
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="shrink-0 h-9 w-9 rounded-lg bg-primary/15 flex items-center justify-center">
                              <CheckCircle2 className="h-4 w-4 text-primary" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Player Name</p>
                              <p className="text-sm font-bold truncate">{nameCheckResult.name}</p>
                            </div>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={handleCopyName}
                            className="shrink-0 h-8 px-2.5 rounded-lg"
                          >
                            <Copy className="h-3.5 w-3.5" /> Copy
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2.5">
                          <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
                          <p className="text-xs text-destructive font-medium">
                            {nameCheckResult.message || "Cannot retrieve game name"}
                          </p>
                        </div>
                      )}
                    </motion.div>
                  )}
                </div>
              )}

              <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/8 via-primary/3 to-transparent p-3.5 flex items-start gap-3">
                <div className="shrink-0 w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center mt-0.5">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Diamonds will be sent instantly to your in-game mailbox after payment confirmation.
                </p>
              </div>

            </section>

            {/* Select Diamonds */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shadow-glow">
                    <Diamond className="h-4 w-4 text-primary" />
                  </div>
                  <h3 className="text-sm font-semibold">Select {selectedGame.id === "PUBG UC" ? "UC" : "Diamonds"}</h3>
                </div>
                <span className="text-[11px] text-muted-foreground">{selectedGame.name}</span>
              </div>

              {/* Tier chip filter */}
              {groupedDiamonds.length > 0 && (
                <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 pb-3 mb-1">
                  <button
                    onClick={() => setSelectedDiamondTier(null)}
                    className={cn(
                      "shrink-0 inline-flex items-center gap-1.5 h-9 px-4 rounded-full text-xs font-semibold border transition-all",
                      !selectedDiamondTier
                        ? "bg-primary text-primary-foreground border-primary shadow-glow"
                        : "bg-card/60 text-muted-foreground border-border/50 hover:border-primary/40 hover:text-foreground"
                    )}
                  >
                    <Sparkles className="h-3.5 w-3.5" /> All
                    <span className="ml-0.5 opacity-70">·{gameProducts.length}</span>
                  </button>
                  {groupedDiamonds.map((g) => {
                    const Icon = g.chipIcon;
                    const active = selectedDiamondTier === g.key;
                    return (
                      <button
                        key={g.key}
                        onClick={() => setSelectedDiamondTier(active ? null : g.key)}
                        className={cn(
                          "shrink-0 inline-flex items-center gap-1.5 h-9 px-4 rounded-full text-xs font-semibold border transition-all",
                          active
                            ? "bg-primary text-primary-foreground border-primary shadow-glow"
                            : "bg-card/60 text-foreground/80 border-border/50 hover:border-primary/40"
                        )}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {g.name.replace(" Packs", "").replace(" Offers", "")}
                        <span className="ml-0.5 opacity-70">·{g.items.length}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {gameProducts.length === 0 ? (
                <div className="text-center py-10 rounded-2xl border border-dashed border-border/60">
                  <p className="text-sm text-muted-foreground">No packages available</p>
                </div>
              ) : (
                <div className="space-y-5">
                  {visibleGroups.map((group) => (
                    <motion.div
                      key={group.key}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25 }}
                      className="space-y-2.5"
                    >
                      {/* Category header */}
                      <div className={cn(
                        "relative overflow-hidden rounded-xl border border-border/50 bg-gradient-to-r px-3.5 py-2.5 flex items-center justify-between",
                        group.gradient
                      )}>
                        <div className="flex items-center gap-2">
                          <span className="text-lg leading-none" aria-hidden>{group.emoji}</span>
                          <div>
                            <div className={cn("text-[13px] font-bold tracking-tight", group.text)}>{group.name}</div>
                            <div className="text-[10px] text-muted-foreground">
                              {group.items.length} {group.items.length === 1 ? "pack" : "packs"} available
                            </div>
                          </div>
                        </div>
                        <span className={cn(
                          "inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-background/60 backdrop-blur text-[10px] font-bold ring-1",
                          group.ring, group.text
                        )}>
                          <Zap className="h-2.5 w-2.5" /> Instant
                        </span>
                      </div>

                      {/* Packages grid */}
                      <div className="grid grid-cols-2 gap-2.5">
                        {group.items.map((product) => {
                          const active = selectedProduct?.id === product.id && showPurchaseDialog;
                          const hasDiscount = product.original_price && product.original_price > product.price;
                          return (
                            <button
                              key={product.id}
                              onClick={() => handleSelectPackage(product)}
                              className={cn(
                                "group relative rounded-2xl border p-3 flex flex-col transition-all text-left overflow-hidden",
                                active
                                  ? "bg-primary text-primary-foreground border-primary shadow-lg scale-[0.99]"
                                  : "bg-card border-border/60 hover:border-primary/50 hover:shadow-md hover:-translate-y-0.5"
                              )}
                            >
                              {hasDiscount && !active && (
                                <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[9px] font-bold">
                                  SALE
                                </span>
                              )}
                              <div className={cn(
                                "h-9 w-9 rounded-xl flex items-center justify-center mb-2 bg-gradient-to-br",
                                active ? "bg-white/20" : group.gradient
                              )}>
                                <Diamond className={cn("h-4 w-4", active ? "text-primary-foreground" : group.text)} />
                              </div>
                              <p className={cn("font-bold text-sm leading-tight", active ? "text-primary-foreground" : "text-foreground")}>
                                {product.name}
                              </p>
                              {product.points_value > 0 && (
                                <p className={cn(
                                  "text-[10px] font-semibold mt-0.5",
                                  active ? "text-primary-foreground/90" : "text-emerald-600 dark:text-emerald-400"
                                )}>
                                  +{product.points_value} pts
                                </p>
                              )}
                              <div className="mt-2 pt-2 border-t border-current/10 flex items-baseline gap-1.5">
                                <p className={cn(
                                  "text-sm font-bold tabular-nums",
                                  active ? "text-primary-foreground" : "text-primary"
                                )}>
                                  {product.price.toLocaleString()}
                                </p>
                                <span className={cn("text-[10px] font-medium", active ? "text-primary-foreground/80" : "text-muted-foreground")}>
                                  MMK
                                </span>
                                {hasDiscount && (
                                  <span className={cn(
                                    "ml-auto text-[10px] line-through tabular-nums",
                                    active ? "text-primary-foreground/60" : "text-muted-foreground/70"
                                  )}>
                                    {product.original_price!.toLocaleString()}
                                  </span>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </section>

          </TabsContent>

          <TabsContent value="mobile" className="space-y-5">
            {/* Sticky category filter bar */}
            <div className="sticky top-0 z-30 -mx-4 px-4 py-2 bg-background/85 backdrop-blur-xl border-b border-border/40">
              <div className="flex gap-2 overflow-x-auto no-scrollbar">
                <button
                  onClick={() => setSelectedMobileService(null)}
                  className={cn(
                    "shrink-0 inline-flex items-center gap-1.5 h-9 px-4 rounded-full text-xs font-semibold border transition-all",
                    !selectedMobileService
                      ? "bg-primary text-primary-foreground border-primary shadow-glow"
                      : "bg-card/60 text-muted-foreground border-border/50 hover:border-primary/40 hover:text-foreground"
                  )}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  All
                </button>
                {MOBILE_CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  const active = selectedMobileService === cat.id;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedMobileService(active ? null : cat.id)}
                      className={cn(
                        "shrink-0 inline-flex items-center gap-1.5 h-9 px-4 rounded-full text-xs font-semibold border transition-all",
                        active
                          ? "bg-primary text-primary-foreground border-primary shadow-glow"
                          : "bg-card/60 text-muted-foreground border-border/50 hover:border-primary/40 hover:text-foreground"
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {cat.name}
                    </button>
                  );
                })}
              </div>

              {/* Operator filter row */}
              <div className="flex gap-2 overflow-x-auto no-scrollbar mt-2">
                <button
                  onClick={() => setSelectedOperator(null)}
                  className={cn(
                    "shrink-0 inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-[11px] font-semibold border transition-all",
                    !selectedOperator
                      ? "bg-accent text-accent-foreground border-accent"
                      : "bg-card/40 text-muted-foreground border-border/40 hover:border-accent/50 hover:text-foreground"
                  )}
                >
                  All Operators
                </button>
                {MOBILE_OPERATORS.map((op) => {
                  const active = selectedOperator === op;
                  return (
                    <button
                      key={op}
                      onClick={() => setSelectedOperator(active ? null : op)}
                      className={cn(
                        "shrink-0 inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-[11px] font-semibold border transition-all",
                        active
                          ? "bg-accent text-accent-foreground border-accent"
                          : "bg-card/40 text-muted-foreground border-border/40 hover:border-accent/50 hover:text-foreground"
                      )}
                    >
                      {op}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Mobile Promo */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/15 via-accent/10 to-primary/5 border border-primary/20 p-4">
              <div className="absolute -top-8 -right-8 w-32 h-32 bg-primary/20 rounded-full blur-3xl" />
              <div className="relative flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-primary/20 shadow-glow">
                  <Wifi className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-base font-display font-bold text-foreground">Mobile Top-up & Data</h2>
                  <p className="text-xs text-muted-foreground truncate">Recharge instantly • Auto delivery</p>
                </div>
                <Badge variant="secondary" className="text-[10px] gap-1">
                  <Zap className="h-3 w-3" /> Fast
                </Badge>
              </div>
            </div>

            {filterLoading ? (
              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="rounded-xl border border-border/40 bg-card/40 overflow-hidden">
                    <div className="aspect-square bg-muted animate-pulse" />
                    <div className="p-3 space-y-2">
                      <div className="h-3 w-3/4 bg-muted animate-pulse rounded" />
                      <div className="h-3 w-1/2 bg-muted animate-pulse rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-16 animate-fade-in">
                <div className="relative inline-block mb-5">
                  <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl animate-pulse" />
                  <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                    <Smartphone className="h-10 w-10 text-primary/70" />
                  </div>
                </div>
                <p className="font-display font-semibold text-foreground">
                  {selectedMobileService ? `No ${selectedMobileService} packages` : "No mobile services yet"}
                </p>
                <p className="text-xs text-muted-foreground/80 mt-1 mb-4 max-w-xs mx-auto">
                  {selectedMobileService
                    ? "ဒီ category အတွက် package တွေ မရှိသေးပါ။ တခြား filter တစ်ခု ရွေးကြည့်ပါ။"
                    : "Check back soon for new top-up packages."}
                </p>
                {selectedMobileService && (
                  <Button variant="outline" size="sm" onClick={() => setSelectedMobileService(null)} className="rounded-xl">
                    Show all packages
                  </Button>
                )}
              </div>
            ) : (
              <div key={selectedMobileService || "all"} className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {filteredProducts.map((product, index) => (
                  <Card
                    key={product.id}
                    className={cn(
                      "group relative card-neon overflow-hidden cursor-pointer transition-all duration-300",
                      "hover:shadow-glow hover:-translate-y-0.5 active:scale-[0.98] animate-stagger-in"
                    )}
                    style={{ animationDelay: `${index * 60}ms` }}
                    onClick={() => handleBuyClick(product)}
                  >
                    {getDiscountPercent(product) > 0 && (
                      <div className="absolute top-2 left-2 z-10 px-1.5 py-0.5 rounded-md bg-destructive text-destructive-foreground text-[10px] font-bold shadow-lg">
                        -{getDiscountPercent(product)}%
                      </div>
                    )}
                    <div className="absolute top-2 right-2 z-10 px-1.5 py-0.5 rounded-md bg-background/70 backdrop-blur text-[9px] font-semibold text-foreground border border-border/40">
                      {product.category === "Data Plans" ? "DATA" : product.category === "Voice Plans" ? "VOICE" : "TOP-UP"}
                    </div>
                    <div className="aspect-square bg-gradient-to-br from-muted/60 to-muted/20 overflow-hidden">
                      <img
                        src={product.image_url}
                        alt={product.name}
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                    </div>
                    <CardContent className="p-3 space-y-2">
                      <h3 className="font-semibold text-sm line-clamp-2 leading-tight min-h-[2.5rem]">{product.name}</h3>
                      <div className="flex items-end justify-between gap-1">
                        <div className="min-w-0">
                          {product.original_price && product.original_price > product.price && (
                            <p className="text-[10px] text-muted-foreground line-through leading-none">
                              {product.original_price.toLocaleString()} Ks
                            </p>
                          )}
                          <p className="text-primary font-display font-bold text-base text-neon leading-tight truncate">
                            {product.price.toLocaleString()}
                            <span className="text-[10px] font-medium ml-0.5 text-muted-foreground">Ks</span>
                          </p>
                        </div>
                        <Button size="sm" className="btn-neon h-8 w-8 p-0 shrink-0 rounded-lg">
                          <Zap className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="orders">
            {orders.length === 0 ? (
              <div className="text-center py-16">
                <div className="relative inline-block mb-6">
                  <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl animate-pulse" />
                  <History className="relative h-16 w-16 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground font-medium">No orders yet</p>
                <p className="text-sm text-muted-foreground/70 mt-1">Your purchase history will appear here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {orders.map((order) => {
                  const isMLBB = order.products.category === "MLBB Diamonds";
                  const isGame = GAME_CATEGORIES.some(cat => cat.id === order.products.category);
                  const isMobile = MOBILE_CATEGORIES.some(c => c.id === order.products.category);
                  
                  return (
                    <Card key={order.id} className="overflow-hidden">
                      <CardContent className="p-4">
                        <div className="flex gap-4">
                          <img
                            src={order.products.image_url}
                            alt={order.products.name}
                            className="h-20 w-20 rounded-lg object-cover flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start gap-2 mb-2">
                              <h3 className="font-semibold text-sm truncate">{order.products.name}</h3>
                              {getStatusBadge(order.status)}
                            </div>
                            <div className="text-xs text-muted-foreground space-y-1">
                              {isGame && order.game_id && (
                                <div className="flex items-center gap-1.5">
                                  <Gamepad2 className="h-3 w-3 text-primary" />
                                  {isMLBB ? (
                                    <span>ID: {order.game_id} • Server: {order.server_id}</span>
                                  ) : (
                                    <span>Player ID: {order.game_id}</span>
                                  )}
                                </div>
                              )}
                              {isMobile && order.phone_number && (
                                <div className="flex items-center gap-1.5">
                                  <Smartphone className="h-3 w-3 text-primary" />
                                  <span>
                                    Phone: {order.phone_number}
                                    {order.game_name?.includes("(") && (
                                      <span className="ml-1 text-primary font-medium">
                                        • {order.game_name.match(/\(([^)]+)\)/)?.[1]}
                                      </span>
                                    )}
                                  </span>
                                </div>
                              )}
                              <p className="font-medium text-foreground">{order.price.toLocaleString()} Ks</p>
                              <p>{new Date(order.created_at).toLocaleDateString()}</p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Quick Buy Dialog */}
      <Dialog open={showPurchaseDialog} onOpenChange={setShowPurchaseDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Quick Buy
            </DialogTitle>
            <DialogDescription>
              {selectedProduct && isGameProduct(selectedProduct.category)
                ? "Enter your game account details"
                : "Enter your phone number"
              }
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedProduct && isGameProduct(selectedProduct.category) ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="h-5 w-5 rounded-md bg-primary/15 flex items-center justify-center">
                      <svg viewBox="0 0 24 24" className="h-3 w-3 text-primary" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-3.3 2.7-6 6-6h4c3.3 0 6 2.7 6 6"/></svg>
                    </div>
                    <Label htmlFor="gameId" className="text-xs font-semibold">Player ID *</Label>
                  </div>
                  <div className="relative group/input">
                    <Input
                      id="gameId"
                      placeholder="123456789"
                      value={gameId}
                      onChange={(e) => setGameId(e.target.value)}
                      className="h-12 pl-10 pr-4 rounded-xl bg-background/60 border-border/60 focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/20 transition-all duration-300 text-base font-semibold tracking-wide"
                    />
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                      <Gamepad2 className="h-4 w-4 text-muted-foreground group-focus-within/input:text-primary transition-colors duration-300" />
                    </div>
                  </div>
                </div>
                {requiresServerId(selectedProduct.category) && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="h-5 w-5 rounded-md bg-accent/15 flex items-center justify-center">
                        <svg viewBox="0 0 24 24" className="h-3 w-3 text-accent" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/></svg>
                      </div>
                      <Label htmlFor="serverId" className="text-xs font-semibold">Server ID *</Label>
                    </div>
                    <div className="relative group/input">
                      <Input
                        id="serverId"
                        placeholder="1234"
                        value={serverId}
                        onChange={(e) => setServerId(e.target.value)}
                        className="h-12 pl-10 pr-4 rounded-xl bg-background/60 border-border/60 focus-visible:border-accent/50 focus-visible:ring-2 focus-visible:ring-accent/20 transition-all duration-300 text-base font-semibold tracking-wide"
                      />
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                        <svg viewBox="0 0 24 24" className="h-4 w-4 text-muted-foreground group-focus-within/input:text-accent transition-colors duration-300" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 2v4m0 12v4M2 12h4m12 0h4"/></svg>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="h-5 w-5 rounded-md bg-primary/15 flex items-center justify-center">
                      <Smartphone className="h-3 w-3 text-primary" />
                    </div>
                    <Label htmlFor="phoneNumber" className="text-xs font-semibold">Phone Number *</Label>
                  </div>
                  <div className="relative group/input">
                    <Input
                      id="phoneNumber"
                      placeholder="09xxxxxxxxx"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="h-12 pl-10 pr-4 rounded-xl bg-background/60 border-border/60 focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/20 transition-all duration-300 text-base font-semibold tracking-wide"
                    />
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                      <Smartphone className="h-4 w-4 text-muted-foreground group-focus-within/input:text-primary transition-colors duration-300" />
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {selectedProduct && (
              <div className="p-4 bg-muted rounded-xl space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Product</span>
                  <span className="font-medium">{selectedProduct.name}</span>
                </div>
                {selectedProduct.points_value > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Purchase Coins</span>
                    <span className="font-semibold text-amber-500">+{selectedProduct.points_value.toLocaleString()} coins</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className="text-primary">{selectedProduct.price.toLocaleString()} Ks</span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowPurchaseDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleQuickBuy}
              disabled={purchasing}
              className="gap-2"
            >
              <CreditCard className="h-4 w-4" />
              {purchasing ? "Processing..." : "Confirm Purchase"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Order Success Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <div className="mx-auto w-16 h-16 rounded-full bg-green-500/15 flex items-center justify-center mb-3">
              <Zap className="h-8 w-8 text-green-500" />
            </div>
            <DialogTitle className="text-center text-xl">သင်၏ ၀ယ်ယူမှု အောင်မြင်ပါသည်</DialogTitle>
            <DialogDescription className="text-center pt-2 text-base">
              ကျေးဇူးပြု၍ ခဏစောင့်ပေးပါခင်ဗျာ။
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button className="w-full" onClick={() => setShowSuccessDialog(false)}>
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MobileLayout>
    </AnimatedPage>
  );
};

export default GamePage;
