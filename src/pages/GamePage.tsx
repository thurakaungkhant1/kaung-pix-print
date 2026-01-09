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
  Gift,
  CreditCard,
  Wallet,
  Plus,
  Percent
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import BottomNav from "@/components/BottomNav";
import MobileLayout from "@/components/MobileLayout";
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
  { id: "PUBG UC", name: "PUBG", icon: Gamepad2, color: "text-yellow-500", image: "/images/games/pubg-mobile.png" },
  { id: "Free Fire", name: "Free Fire", icon: Zap, color: "text-orange-500", image: "/images/games/free-fire.png" },
  { id: "Genshin", name: "Genshin", icon: Sparkles, color: "text-purple-500", image: "/images/games/genshin-impact.png" },
  { id: "Gift Cards", name: "Gift Cards", icon: Gift, color: "text-green-500", image: "/images/services/gift-card.png" },
];

// Mobile service categories with images
const MOBILE_CATEGORIES = [
  { id: "Phone Top-up", name: "Phone Top-up", icon: Smartphone, color: "text-primary", image: "/images/services/phone-topup.png" },
  { id: "Data Plans", name: "Data Plans", icon: Wifi, color: "text-blue-500", image: "/images/services/data-plan.png" },
];

interface MobileOperator {
  id: string;
  name: string;
  code: string;
  logo_url: string | null;
}

const GamePage = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [mobileOperators, setMobileOperators] = useState<MobileOperator[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPurchaseDialog, setShowPurchaseDialog] = useState(false);
  const [showTopUpDialog, setShowTopUpDialog] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [gameId, setGameId] = useState("");
  const [serverId, setServerId] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [selectedOperator, setSelectedOperator] = useState("");
  const [selectedMobileOperator, setSelectedMobileOperator] = useState<string | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [activeCategory, setActiveCategory] = useState("games");
  const [selectedGameCategory, setSelectedGameCategory] = useState<string | null>(null);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const { user } = useAuth();
  const { toast } = useToast();
  


  useEffect(() => {
    loadProducts();
    loadMobileOperators();
    if (user) {
      loadOrders();
      loadWalletBalance();
    }
  }, [user]);

  const loadMobileOperators = async () => {
    const { data, error } = await supabase
      .from("mobile_operators")
      .select("id, name, code, logo_url")
      .eq("is_active", true)
      .order("display_order", { ascending: true });

    if (!error && data) {
      setMobileOperators(data);
    }
  };

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
      // If operator is selected, show mobile products (will auto-select operator in dialog)
      return products.filter(p => isMobileProduct(p.category));
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
    // Auto-select operator if one is already selected in Mobile tab
    setSelectedOperator(selectedMobileOperator || "");
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
      // Phone Top-up and Data Plans require operator selection
      if (!selectedOperator) {
        toast({
          title: "Error",
          description: "Please select your mobile operator",
          variant: "destructive",
        });
        return;
      }
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
        game_name: isMobileProduct(selectedProduct.category) 
          ? `${selectedProduct.category} (${selectedOperator})`
          : selectedProduct.category,
        phone_number: isMobileProduct(selectedProduct.category) ? phoneNumber : "",
        status: "pending",
        payment_method: "wallet",
        delivery_address: "",
      }).select().single();

      if (orderError) throw orderError;

      // Create wallet transaction
      await supabase.from('wallet_transactions').insert({
        user_id: user.id,
        amount: -selectedProduct.price,
        transaction_type: 'purchase',
        reference_id: orderData.id,
        description: `Purchase: ${selectedProduct.name}`,
        balance_after: newBalance
      });

      setWalletBalance(newBalance);
      toast({
        title: "Order placed!",
        description: "Your order has been placed. We'll process it shortly.",
      });
      setShowPurchaseDialog(false);
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
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
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
        <BottomNav />
      </MobileLayout>
    );
  }

  const filteredProducts = getFilteredProducts();

  return (
    <MobileLayout>
      {/* Hero Header - Gaming Neon Style */}
      <header className="hero-gaming relative overflow-hidden">
        {/* Grid pattern */}
        <div className="absolute inset-0 bg-grid-gaming opacity-30" />
        
        {/* Neon glow effects */}
        <div className="absolute top-4 right-4 w-40 h-40 bg-primary/30 rounded-full blur-[80px] animate-pulse" />
        <div className="absolute -bottom-8 -left-8 w-48 h-48 bg-accent/20 rounded-full blur-[60px]" />
        
        <div className="relative z-10 p-4 pt-6 pb-6">
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="p-2.5 rounded-xl bg-primary/20 backdrop-blur-sm border border-primary/30 shadow-glow">
              <ShoppingBag className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-2xl font-display font-extrabold text-foreground tracking-tight text-neon">
              Top-up & Shop
            </h1>
          </div>
          <p className="text-center text-sm text-muted-foreground">
            Game Top-ups & Mobile Services
          </p>
        </div>
      </header>

      <div className="max-w-screen-xl mx-auto p-4 pb-24">
        <Tabs defaultValue="games" className="w-full" onValueChange={(v) => {
          setActiveCategory(v);
          setSelectedGameCategory(null);
        }}>
          <TabsList className="grid w-full grid-cols-3 mb-6 h-12 bg-card/50 border border-border/50">
            <TabsTrigger value="games" className="gap-2 text-sm font-medium data-[state=active]:bg-primary/20 data-[state=active]:text-primary data-[state=active]:shadow-glow">
              <Gamepad2 className="h-4 w-4" />
              Games
            </TabsTrigger>
            <TabsTrigger value="mobile" className="gap-2 text-sm font-medium data-[state=active]:bg-primary/20 data-[state=active]:text-primary data-[state=active]:shadow-glow">
              <Smartphone className="h-4 w-4" />
              Mobile
            </TabsTrigger>
            <TabsTrigger value="orders" className="gap-2 text-sm font-medium data-[state=active]:bg-primary/20 data-[state=active]:text-primary data-[state=active]:shadow-glow">
              <History className="h-4 w-4" />
              Orders
            </TabsTrigger>
          </TabsList>

          <TabsContent value="games" className="space-y-6">
            {/* Game Categories */}
            <div className="grid grid-cols-5 gap-2">
              {GAME_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedGameCategory(
                    selectedGameCategory === cat.id ? null : cat.id
                  )}
                  className={cn(
                    "card-neon flex flex-col items-center gap-1.5 p-2.5 rounded-xl transition-all duration-300",
                    selectedGameCategory === cat.id 
                      ? "bg-primary/15 border-primary/50 shadow-glow" 
                      : "hover:bg-primary/5"
                  )}
                >
                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-muted ring-2 ring-transparent transition-all group-hover:ring-primary/30">
                    <img 
                      src={cat.image} 
                      alt={cat.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span className={cn(
                    "text-[10px] font-medium text-center leading-tight transition-colors",
                    selectedGameCategory === cat.id ? "text-primary" : ""
                  )}>
                    {cat.name.split(" ")[0]}
                  </span>
                </button>
              ))}
            </div>

            {/* Promo Banner */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 border border-primary/20 p-4">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl" />
              <div className="relative flex items-start gap-3">
                <div className="p-2 rounded-xl bg-primary/20">
                  <Zap className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-foreground mb-1">
                    Quick Buy - Instant Delivery!
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Fast & secure top-up for all your favorite games
                  </p>
                </div>
              </div>
            </div>

            {/* Products Grid */}
            {filteredProducts.length === 0 ? (
              <div className="text-center py-16">
                <div className="relative inline-block mb-6">
                  <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl animate-pulse" />
                  <Gamepad2 className="relative h-16 w-16 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground font-medium">No products available</p>
                <p className="text-sm text-muted-foreground/70 mt-1">Check back soon</p>
              </div>
            ) : (
              <div key={selectedGameCategory} className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {filteredProducts.map((product, index) => (
                  <Card
                    key={product.id}
                    className={cn(
                      "card-neon overflow-hidden cursor-pointer transition-all duration-300",
                      "hover:shadow-glow hover:scale-[1.02] active:scale-[0.98]",
                      "animate-stagger-in"
                    )}
                    style={{ animationDelay: `${index * 80}ms` }}
                    onClick={() => handleBuyClick(product)}
                  >
                    <div className="aspect-square bg-muted/50 overflow-hidden">
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-full h-full object-cover transition-transform duration-300 hover:scale-110"
                        loading="lazy"
                      />
                    </div>
                    <CardContent className="p-3 space-y-2">
                      <h3 className="font-semibold text-sm line-clamp-2">{product.name}</h3>
                      <div className="flex items-center justify-between">
                        <p className="text-primary font-bold text-lg text-neon">
                          {product.price.toLocaleString()}
                          <span className="text-xs font-medium ml-1 text-muted-foreground">Ks</span>
                        </p>
                        <Button size="sm" className="btn-neon h-8 px-3 text-xs gap-1">
                          <Zap className="h-3 w-3" />
                          Buy
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="mobile" className="space-y-6">
            {/* Selected Operator Badge */}
            {selectedMobileOperator && (
              <div className="animate-fade-in">
                <Badge variant="secondary" className="badge-neon gap-2 px-3 py-1.5">
                  <Smartphone className="h-3.5 w-3.5" />
                  {selectedMobileOperator} selected
                </Badge>
              </div>
            )}

            {/* Mobile Operators */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-muted-foreground">Select Operator</h3>
                {selectedMobileOperator && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedMobileOperator(null)}
                    className="text-xs h-7"
                  >
                    Clear
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                {mobileOperators.map((op, index) => (
                  <Card
                    key={op.id}
                    onClick={() => setSelectedMobileOperator(selectedMobileOperator === op.name ? null : op.name)}
                    className={cn(
                      "card-neon overflow-hidden cursor-pointer transition-all duration-300 relative",
                      "hover:shadow-glow hover:scale-[1.02] active:scale-[0.98]",
                      "animate-scale-in",
                      selectedMobileOperator === op.name && "ring-2 ring-primary border-primary animate-selection-pulse"
                    )}
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    {/* Ripple overlay on selection */}
                    {selectedMobileOperator === op.name && (
                      <div className="absolute inset-0 bg-primary/10 pointer-events-none" />
                    )}
                    <CardContent className="p-4 relative">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-14 h-14 rounded-xl overflow-hidden bg-muted/30 ring-2 flex items-center justify-center flex-shrink-0 transition-all duration-300",
                          selectedMobileOperator === op.name ? "ring-primary scale-110" : "ring-primary/20"
                        )}>
                          {op.logo_url ? (
                            <img 
                              src={op.logo_url} 
                              alt={op.name}
                              className="w-full h-full object-contain p-1"
                            />
                          ) : (
                            <Smartphone className="h-7 w-7 text-primary" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold truncate">{op.name}</h3>
                          <p className="text-xs text-muted-foreground">{op.code}</p>
                        </div>
                        {selectedMobileOperator === op.name && (
                          <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center animate-scale-in">
                            <Zap className="h-3 w-3 text-primary-foreground" />
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Mobile Categories */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">Services</h3>
              <div className="grid grid-cols-2 gap-3">
                {MOBILE_CATEGORIES.map((cat) => (
                  <Card
                    key={cat.id}
                    className={cn(
                      "card-neon p-4 cursor-pointer transition-all duration-300",
                      "hover:shadow-glow"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl overflow-hidden bg-muted/50 ring-2 ring-primary/20">
                        <img 
                          src={cat.image} 
                          alt={cat.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm">{cat.name}</h3>
                        <p className="text-xs text-muted-foreground">Quick recharge</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            {/* Mobile Products */}
            {filteredProducts.length === 0 ? (
              <div className="text-center py-16">
                <div className="relative inline-block mb-6">
                  <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl animate-pulse" />
                  <Smartphone className="relative h-16 w-16 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground font-medium">No mobile services available</p>
                <p className="text-sm text-muted-foreground/70 mt-1">Coming soon</p>
              </div>
            ) : (
              <div 
                key={selectedMobileOperator || 'all'} 
                className="grid grid-cols-2 sm:grid-cols-3 gap-3 animate-fade-in"
              >
                {filteredProducts.map((product, index) => (
                  <Card
                    key={product.id}
                    className={cn(
                      "card-neon overflow-hidden cursor-pointer transition-all duration-300",
                      "hover:shadow-glow hover:scale-[1.02] active:scale-[0.98]",
                      "animate-stagger-in"
                    )}
                    style={{ animationDelay: `${index * 80}ms` }}
                    onClick={() => handleBuyClick(product)}
                  >
                    <div className="aspect-square bg-muted/50 overflow-hidden">
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-full h-full object-cover transition-transform duration-300 hover:scale-110"
                        loading="lazy"
                      />
                    </div>
                    <CardContent className="p-3 space-y-2">
                      <h3 className="font-semibold text-sm line-clamp-2">{product.name}</h3>
                      <div className="flex items-center justify-between">
                        <p className="text-primary font-bold text-lg text-neon">
                          {product.price.toLocaleString()}
                          <span className="text-xs font-medium ml-1 text-muted-foreground">Ks</span>
                        </p>
                        <Button size="sm" className="btn-neon h-8 px-3 text-xs gap-1">
                          <Zap className="h-3 w-3" />
                          Buy
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
                  const isMobile = MOBILE_CATEGORIES.some(cat => cat.id === order.products.category);
                  
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
                  <Label htmlFor="gameId">Player ID *</Label>
                  <Input
                    id="gameId"
                    placeholder="123456789"
                    value={gameId}
                    onChange={(e) => setGameId(e.target.value)}
                  />
                </div>
                {requiresServerId(selectedProduct.category) && (
                  <div className="space-y-2">
                    <Label htmlFor="serverId">Server ID *</Label>
                    <Input
                      id="serverId"
                      placeholder="1234"
                      value={serverId}
                      onChange={(e) => setServerId(e.target.value)}
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {/* Operator Selection for Phone Top-up and Data Plans */}
                <div className="space-y-2">
                  <Label>Select Operator *</Label>
                  <div className="grid grid-cols-4 gap-2">
                    {mobileOperators.map((op) => (
                      <button
                        key={op.id}
                        type="button"
                        onClick={() => setSelectedOperator(op.name)}
                        className={cn(
                          "p-3 rounded-xl border-2 text-center transition-all duration-200",
                          "text-xs font-semibold",
                          selectedOperator === op.name
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border hover:border-primary/50 hover:bg-muted"
                        )}
                      >
                        {op.logo_url ? (
                          <img src={op.logo_url} alt={op.name} className="w-6 h-6 mx-auto mb-1 object-contain" />
                        ) : (
                          <Smartphone className="w-4 h-4 mx-auto mb-1 text-primary" />
                        )}
                        {op.name}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phoneNumber">Phone Number *</Label>
                  <Input
                    id="phoneNumber"
                    placeholder="09xxxxxxxxx"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                  />
                </div>
              </div>
            )}
            
            {selectedProduct && (
              <div className="p-4 bg-muted rounded-xl space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Product</span>
                  <span className="font-medium">{selectedProduct.name}</span>
                </div>
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

      <BottomNav />
    </MobileLayout>
  );
};

export default GamePage;
