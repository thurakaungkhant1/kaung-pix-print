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
  ShoppingBag,
  Zap,
  CreditCard,
  Wallet,
  ChevronRight,
  Signal,
  Globe,
  ArrowRight,
  TrendingUp
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import MobileLayout from "@/components/MobileLayout";
import AnimatedPage from "@/components/animations/AnimatedPage";
import AnimatedSection from "@/components/animations/AnimatedSection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import WalletDisplay from "@/components/WalletDisplay";
import TopUpDialog from "@/components/TopUpDialog";
import { motion } from "framer-motion";

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

const GAME_CATEGORIES = [
  { id: "MLBB Diamonds", name: "Mobile Legends", icon: Diamond, color: "from-blue-500 to-indigo-600", image: "/images/games/mobile-legends.png" },
  { id: "PUBG UC", name: "PUBG Mobile", icon: Gamepad2, color: "from-yellow-500 to-orange-600", image: "/images/games/pubg-mobile.png" },
];

const MOBILE_CATEGORIES = [
  { id: "Phone Top-up", name: "Phone Top-up", icon: Smartphone, color: "from-emerald-500 to-teal-600" },
  { id: "Data Plans", name: "Data Plans", icon: Wifi, color: "from-cyan-500 to-blue-600" },
];

const GamePage = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPurchaseDialog, setShowPurchaseDialog] = useState(false);
  const [showTopUpDialog, setShowTopUpDialog] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [gameId, setGameId] = useState("");
  const [serverId, setServerId] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [purchasing, setPurchasing] = useState(false);
  const [activeCategory, setActiveCategory] = useState("games");
  const [selectedGameCategory, setSelectedGameCategory] = useState<string | null>(null);
  const [selectedMobileService, setSelectedMobileService] = useState<string | null>(null);
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
      .select(`*, products (name, image_url, category)`)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    if (!error && data) {
      setOrders(data as Order[]);
    }
  };

  const isGameProduct = (category: string) => GAME_CATEGORIES.some(cat => cat.id === category);
  const isMobileProduct = (category: string) => MOBILE_CATEGORIES.some(cat => cat.id === category);
  const requiresServerId = (category: string) => category === "MLBB Diamonds";

  const getFilteredProducts = () => {
    if (activeCategory === "games") {
      if (selectedGameCategory) return products.filter(p => p.category === selectedGameCategory);
      return products.filter(p => isGameProduct(p.category));
    } else if (activeCategory === "mobile") {
      if (selectedMobileService) return products.filter(p => p.category === selectedMobileService);
      return products.filter(p => isMobileProduct(p.category));
    }
    return products;
  };

  const handleBuyClick = (product: Product) => {
    if (!user) {
      toast({ title: "Login required", description: "Please login to make a purchase", variant: "destructive" });
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

    if (isGameProduct(selectedProduct.category)) {
      if (!gameId) { toast({ title: "Error", description: "Please enter your Player ID", variant: "destructive" }); return; }
      if (requiresServerId(selectedProduct.category) && !serverId) { toast({ title: "Error", description: "Please enter your Server ID", variant: "destructive" }); return; }
    } else if (isMobileProduct(selectedProduct.category)) {
      if (!phoneNumber) { toast({ title: "Error", description: "Please enter your phone number", variant: "destructive" }); return; }
    }

    if (walletBalance < selectedProduct.price) {
      toast({ title: "Insufficient Balance", description: "Please top up your wallet", variant: "destructive" });
      return;
    }

    setPurchasing(true);
    try {
      const newBalance = walletBalance - selectedProduct.price;
      const { error: balanceError } = await supabase.from('profiles').update({ wallet_balance: newBalance }).eq('id', user.id);
      if (balanceError) throw balanceError;

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

      await supabase.from('wallet_transactions').insert({
        user_id: user.id,
        amount: -selectedProduct.price,
        transaction_type: 'purchase',
        reference_id: orderData.id,
        description: `Purchase: ${selectedProduct.name}`,
        balance_after: newBalance
      });

      setWalletBalance(newBalance);
      toast({ title: "Order placed!", description: "Your order has been placed. We'll process it shortly." });
      setShowPurchaseDialog(false);
      loadOrders();
    } catch (error: any) {
      toast({ title: "Purchase failed", description: error.message, variant: "destructive" });
    }
    setPurchasing(false);
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      pending: { variant: "secondary", label: "Pending" },
      approved: { variant: "default", label: "Approved" },
      finished: { variant: "default", label: "Completed" },
      rejected: { variant: "destructive", label: "Rejected" },
    };
    const c = config[status] || { variant: "outline" as const, label: status };
    return <Badge variant={c.variant} className="text-[10px]">{c.label}</Badge>;
  };

  if (loading) {
    return (
      <MobileLayout>
        <div className="min-h-screen bg-background pb-24">
          <div className="max-w-screen-xl mx-auto p-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-48 bg-muted animate-pulse rounded-xl" style={{ animationDelay: `${i * 100}ms` }} />
              ))}
            </div>
          </div>
        </div>
      </MobileLayout>
    );
  }

  const filteredProducts = getFilteredProducts();

  return (
    <AnimatedPage>
    <MobileLayout>
      {/* Hero Header */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero" />
        <div className="absolute inset-0 bg-gradient-glow opacity-60" />
        <div className="absolute -top-20 -right-20 w-60 h-60 bg-primary-foreground/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-primary-foreground/5 rounded-full blur-2xl" />
        
        <div className="relative z-10 p-5 pt-7 pb-6">
          <motion.div initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="h-3.5 w-3.5 text-primary-foreground/60" />
              <span className="text-[10px] font-semibold text-primary-foreground/50 uppercase tracking-widest">
                Digital Store
              </span>
            </div>
            <h1 className="text-2xl font-display font-black text-primary-foreground tracking-tight">
              Top-up & Services
            </h1>
            <p className="text-xs text-primary-foreground/50 mt-1">
              Instant game top-ups & mobile services
            </p>
          </motion.div>
        </div>
      </header>

      {/* Wallet */}
      {user && (
        <motion.section initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="px-5 -mt-3 relative z-20">
          <WalletDisplay />
        </motion.section>
      )}

      <div className="max-w-screen-xl mx-auto px-4 pt-5 pb-24">
        {/* Tab Navigation */}
        <Tabs defaultValue="games" className="w-full" onValueChange={(v) => {
          setActiveCategory(v);
          setSelectedGameCategory(null);
          setSelectedMobileService(null);
        }}>
          <TabsList className="grid w-full grid-cols-3 mb-5 h-11 bg-card border border-border/50 rounded-xl p-1">
            <TabsTrigger value="games" className="gap-1.5 text-xs font-semibold rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Gamepad2 className="h-3.5 w-3.5" />
              Games
            </TabsTrigger>
            <TabsTrigger value="mobile" className="gap-1.5 text-xs font-semibold rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Smartphone className="h-3.5 w-3.5" />
              Mobile
            </TabsTrigger>
            <TabsTrigger value="orders" className="gap-1.5 text-xs font-semibold rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <History className="h-3.5 w-3.5" />
              Orders
            </TabsTrigger>
          </TabsList>

          {/* ── Games Tab ── */}
          <TabsContent value="games" className="space-y-5 mt-0">
            <AnimatedSection>
              {/* Game Category Selector */}
              <div className="grid grid-cols-2 gap-3">
                {GAME_CATEGORIES.map((cat, index) => (
                  <motion.button
                    key={cat.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={() => setSelectedGameCategory(selectedGameCategory === cat.id ? null : cat.id)}
                    className={cn(
                      "relative overflow-hidden rounded-2xl border transition-all duration-300 group",
                      selectedGameCategory === cat.id
                        ? "border-primary shadow-md ring-2 ring-primary/20"
                        : "border-border/50 hover:border-primary/30 hover:shadow-sm"
                    )}
                  >
                    <div className={cn("absolute inset-0 opacity-10 bg-gradient-to-br", cat.color)} />
                    <div className="relative p-4 flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl overflow-hidden bg-muted flex-shrink-0 ring-2 ring-border/50">
                        <img src={cat.image} alt={cat.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="text-left">
                        <p className={cn(
                          "font-bold text-sm transition-colors",
                          selectedGameCategory === cat.id ? "text-primary" : "text-foreground"
                        )}>
                          {cat.name}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {products.filter(p => p.category === cat.id).length} packages
                        </p>
                      </div>
                    </div>
                    {selectedGameCategory === cat.id && (
                      <div className="absolute top-2 right-2">
                        <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                      </div>
                    )}
                  </motion.button>
                ))}
              </div>
            </AnimatedSection>

            {/* Info Banner */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/10"
            >
              <div className="p-2 rounded-lg bg-primary/10 flex-shrink-0">
                <Zap className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">Instant Delivery</p>
                <p className="text-[10px] text-muted-foreground">Top-up within minutes after approval</p>
              </div>
            </motion.div>

            {/* Products Grid */}
            {filteredProducts.length === 0 ? (
              <div className="text-center py-12">
                <Gamepad2 className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No products available</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Select a game category above</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {filteredProducts.map((product, index) => (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05, duration: 0.3 }}
                  >
                    <Card
                      className="overflow-hidden cursor-pointer border-border/50 hover:border-primary/30 hover:shadow-md transition-all duration-300 group"
                      onClick={() => handleBuyClick(product)}
                    >
                      <div className="aspect-square bg-muted/50 overflow-hidden relative">
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          loading="lazy"
                        />
                        {product.original_price && product.original_price > product.price && (
                          <Badge className="absolute top-2 left-2 bg-destructive text-destructive-foreground border-0 text-[9px] px-1.5 py-0.5">
                            -{Math.round((1 - product.price / product.original_price) * 100)}%
                          </Badge>
                        )}
                      </div>
                      <CardContent className="p-3 space-y-1.5">
                        <h3 className="font-semibold text-xs line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                          {product.name}
                        </h3>
                        {product.points_value > 0 && (
                          <div className="flex items-center gap-1 text-[10px] text-amber-600 font-medium">
                            <Sparkles className="h-2.5 w-2.5" />
                            +{product.points_value} coins
                          </div>
                        )}
                        <div className="flex items-center justify-between pt-1">
                          <p className="text-primary font-bold text-sm">
                            {product.price.toLocaleString()}
                            <span className="text-[10px] font-medium ml-0.5 text-muted-foreground">Ks</span>
                          </p>
                          <Button size="sm" className="h-7 px-2.5 text-[10px] gap-1 rounded-lg">
                            <Zap className="h-2.5 w-2.5" />
                            Buy
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── Mobile Services Tab ── */}
          <TabsContent value="mobile" className="space-y-5 mt-0">
            <AnimatedSection>
              <div className="grid grid-cols-2 gap-3">
                {MOBILE_CATEGORIES.map((cat, index) => {
                  const Icon = cat.icon;
                  const count = products.filter(p => p.category === cat.id).length;
                  return (
                    <motion.button
                      key={cat.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      onClick={() => setSelectedMobileService(selectedMobileService === cat.id ? null : cat.id)}
                      className={cn(
                        "relative overflow-hidden rounded-2xl border transition-all duration-300",
                        selectedMobileService === cat.id
                          ? "border-primary shadow-md ring-2 ring-primary/20"
                          : "border-border/50 hover:border-primary/30 hover:shadow-sm"
                      )}
                    >
                      <div className={cn("absolute inset-0 opacity-10 bg-gradient-to-br", cat.color)} />
                      <div className="relative p-4 flex flex-col items-center gap-2 text-center">
                        <div className={cn(
                          "p-3 rounded-xl",
                          selectedMobileService === cat.id ? "bg-primary/15" : "bg-muted"
                        )}>
                          <Icon className={cn(
                            "h-6 w-6",
                            selectedMobileService === cat.id ? "text-primary" : "text-muted-foreground"
                          )} />
                        </div>
                        <div>
                          <p className={cn(
                            "font-bold text-xs transition-colors",
                            selectedMobileService === cat.id ? "text-primary" : "text-foreground"
                          )}>
                            {cat.name}
                          </p>
                          <p className="text-[10px] text-muted-foreground">{count} packages</p>
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </AnimatedSection>

            {/* Mobile Products */}
            {filteredProducts.length === 0 ? (
              <div className="text-center py-12">
                <Smartphone className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No services available</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Select a service category above</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {filteredProducts.map((product, index) => (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05, duration: 0.3 }}
                  >
                    <Card
                      className="overflow-hidden cursor-pointer border-border/50 hover:border-primary/30 hover:shadow-md transition-all duration-300 group"
                      onClick={() => handleBuyClick(product)}
                    >
                      <div className="aspect-[4/3] bg-muted/50 overflow-hidden relative">
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          loading="lazy"
                        />
                      </div>
                      <CardContent className="p-3 space-y-1.5">
                        <h3 className="font-semibold text-xs line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                          {product.name}
                        </h3>
                        <div className="flex items-center justify-between pt-1">
                          <p className="text-primary font-bold text-sm">
                            {product.price.toLocaleString()}
                            <span className="text-[10px] font-medium ml-0.5 text-muted-foreground">Ks</span>
                          </p>
                          <Button size="sm" className="h-7 px-2.5 text-[10px] gap-1 rounded-lg">
                            Buy
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── Orders Tab ── */}
          <TabsContent value="orders" className="mt-0">
            {orders.length === 0 ? (
              <div className="text-center py-12">
                <History className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No orders yet</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Your purchase history will appear here</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {orders.map((order, index) => {
                  const isMLBB = order.products.category === "MLBB Diamonds";
                  const isGame = GAME_CATEGORIES.some(cat => cat.id === order.products.category);
                  const isMobile = MOBILE_CATEGORIES.some(cat => cat.id === order.products.category);
                  
                  return (
                    <motion.div
                      key={order.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Card className="overflow-hidden border-border/50">
                        <CardContent className="p-3">
                          <div className="flex gap-3">
                            <img
                              src={order.products.image_url}
                              alt={order.products.name}
                              className="h-14 w-14 rounded-xl object-cover flex-shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-start gap-2 mb-1">
                                <h3 className="font-semibold text-xs truncate">{order.products.name}</h3>
                                {getStatusBadge(order.status)}
                              </div>
                              <div className="text-[10px] text-muted-foreground space-y-0.5">
                                {isGame && order.game_id && (
                                  <div className="flex items-center gap-1">
                                    <Gamepad2 className="h-2.5 w-2.5 text-primary" />
                                    {isMLBB ? <span>ID: {order.game_id} • Server: {order.server_id}</span> : <span>Player ID: {order.game_id}</span>}
                                  </div>
                                )}
                                {isMobile && order.phone_number && (
                                  <div className="flex items-center gap-1">
                                    <Smartphone className="h-2.5 w-2.5 text-primary" />
                                    <span>Phone: {order.phone_number}</span>
                                  </div>
                                )}
                                <div className="flex items-center justify-between pt-0.5">
                                  <span className="font-semibold text-foreground text-xs">{order.price.toLocaleString()} Ks</span>
                                  <span>{new Date(order.created_at).toLocaleDateString()}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Quick Buy Dialog */}
      <Dialog open={showPurchaseDialog} onOpenChange={setShowPurchaseDialog}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Zap className="h-4 w-4 text-primary" />
              Quick Buy
            </DialogTitle>
            <DialogDescription className="text-xs">
              {selectedProduct && isGameProduct(selectedProduct.category)
                ? "Enter your game account details"
                : "Enter your phone number"
              }
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {selectedProduct && isGameProduct(selectedProduct.category) ? (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="gameId" className="text-xs">Player ID *</Label>
                  <Input id="gameId" placeholder="123456789" value={gameId} onChange={(e) => setGameId(e.target.value)} className="h-9" />
                </div>
                {requiresServerId(selectedProduct.category) && (
                  <div className="space-y-1.5">
                    <Label htmlFor="serverId" className="text-xs">Server ID *</Label>
                    <Input id="serverId" placeholder="1234" value={serverId} onChange={(e) => setServerId(e.target.value)} className="h-9" />
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label htmlFor="phoneNumber" className="text-xs">Phone Number *</Label>
                <Input id="phoneNumber" placeholder="09xxxxxxxxx" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} className="h-9" />
              </div>
            )}
            
            {selectedProduct && (
              <div className="p-3 bg-muted/50 rounded-xl space-y-1.5 border border-border/50">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Product</span>
                  <span className="font-medium">{selectedProduct.name}</span>
                </div>
                <div className="flex justify-between text-sm font-bold border-t border-border/50 pt-1.5">
                  <span>Total</span>
                  <span className="text-primary">{selectedProduct.price.toLocaleString()} Ks</span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowPurchaseDialog(false)}>Cancel</Button>
            <Button size="sm" onClick={handleQuickBuy} disabled={purchasing} className="gap-1.5">
              <CreditCard className="h-3.5 w-3.5" />
              {purchasing ? "Processing..." : "Confirm Purchase"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MobileLayout>
    </AnimatedPage>
  );
};

export default GamePage;
