import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Diamond, Gamepad2, History, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import BottomNav from "@/components/BottomNav";
import MobileLayout from "@/components/MobileLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

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
  products: {
    name: string;
    image_url: string;
  };
}

const GamePage = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPurchaseDialog, setShowPurchaseDialog] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [gameId, setGameId] = useState("");
  const [serverId, setServerId] = useState("");
  const [purchasing, setPurchasing] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    loadProducts();
    if (user) {
      loadOrders();
    }
  }, [user]);

  const loadProducts = async () => {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("category", "MLBB Diamonds")
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
          image_url
        )
      `)
      .eq("user_id", user.id)
      .not("game_id", "is", null)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setOrders(data as Order[]);
    }
  };

  const handleBuyClick = (product: Product) => {
    if (!user) {
      toast({
        title: "Login required",
        description: "Please login to purchase diamonds",
        variant: "destructive",
      });
      return;
    }
    setSelectedProduct(product);
    setShowPurchaseDialog(true);
    setGameId("");
    setServerId("");
  };

  const handlePurchase = async () => {
    if (!selectedProduct || !user || !gameId || !serverId) {
      toast({
        title: "Error",
        description: "Please enter your Player ID and Server ID",
        variant: "destructive",
      });
      return;
    }

    setPurchasing(true);

    const { error } = await supabase.from("orders").insert({
      user_id: user.id,
      product_id: selectedProduct.id,
      quantity: 1,
      price: selectedProduct.price,
      game_id: gameId,
      server_id: serverId,
      game_name: "",
      status: "pending",
      payment_method: "pending",
      delivery_address: "",
      phone_number: "",
    });

    if (error) {
      toast({
        title: "Purchase failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Order placed!",
        description: "Your diamond top-up order has been placed. We'll process it shortly.",
      });
      setShowPurchaseDialog(false);
      loadOrders();
    }

    setPurchasing(false);
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

  return (
    <MobileLayout>
      {/* Hero Header */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero" />
        <div className="absolute inset-0 bg-gradient-glow opacity-60" />
        
        <div className="absolute top-4 right-4 w-32 h-32 bg-primary-foreground/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-8 -left-8 w-40 h-40 bg-primary-foreground/5 rounded-full blur-3xl" />
        
        <div className="relative z-10 p-4 pt-6 pb-6">
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-primary-foreground/10 backdrop-blur-sm">
              <Gamepad2 className="h-6 w-6 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-display font-extrabold text-primary-foreground tracking-tight">
              Game Top-Up
            </h1>
          </div>
          <p className="text-center text-sm text-primary-foreground/70">
            Fast & Secure Diamond Top-Up
          </p>
        </div>
      </header>

      <div className="max-w-screen-xl mx-auto p-4 pb-24">
        <Tabs defaultValue="packages" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6 h-12">
            <TabsTrigger value="packages" className="gap-2 text-sm font-medium">
              <Diamond className="h-4 w-4" />
              Diamond Packages
            </TabsTrigger>
            <TabsTrigger value="orders" className="gap-2 text-sm font-medium">
              <History className="h-4 w-4" />
              My Orders
            </TabsTrigger>
          </TabsList>

          <TabsContent value="packages" className="space-y-6">
            {/* Promo Banner */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 border border-primary/20 p-4">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl" />
              <div className="relative flex items-start gap-3">
                <div className="p-2 rounded-xl bg-primary/20">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-foreground mb-1">
                    Mobile Legends Diamond Offers!
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Diamond ဝယ်ယူသူများအနေဖြင့် စိန်ဝယ်ပြီးပါက Admin ကို ဆက်သွယ်ပေးပါ
                  </p>
                </div>
              </div>
            </div>

            {/* Products Grid */}
            {products.length === 0 ? (
              <div className="text-center py-16">
                <div className="relative inline-block mb-6">
                  <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl animate-pulse" />
                  <Diamond className="relative h-16 w-16 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground font-medium">No diamond packages available</p>
                <p className="text-sm text-muted-foreground/70 mt-1">Check back soon</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {products.map((product, index) => (
                  <Card
                    key={product.id}
                    className={cn(
                      "overflow-hidden cursor-pointer transition-all duration-300",
                      "hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]",
                      "animate-scale-in"
                    )}
                    style={{ animationDelay: `${index * 50}ms` }}
                    onClick={() => handleBuyClick(product)}
                  >
                    <div className="aspect-square bg-muted overflow-hidden">
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                    <CardContent className="p-3 space-y-2">
                      <h3 className="font-semibold text-sm line-clamp-2">{product.name}</h3>
                      <div className="flex items-center justify-between">
                        <p className="text-primary font-bold text-lg">
                          {product.price.toLocaleString()}
                          <span className="text-xs font-medium ml-1 text-muted-foreground">Ks</span>
                        </p>
                        <Button size="sm" className="h-8 px-3 text-xs">
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
                {orders.map((order) => (
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
                          <div className="text-xs text-muted-foreground space-y-0.5">
                            <p>ID: {order.game_id} ({order.server_id})</p>
                            <p className="font-medium text-foreground">{order.price.toLocaleString()} Ks</p>
                            <p>{new Date(order.created_at).toLocaleDateString()}</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={showPurchaseDialog} onOpenChange={setShowPurchaseDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Diamond className="h-5 w-5 text-primary" />
              {selectedProduct?.name}
            </DialogTitle>
            <DialogDescription>
              Enter your Mobile Legends account details
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="gameId">Player ID *</Label>
                <Input
                  id="gameId"
                  placeholder="123456789"
                  value={gameId}
                  onChange={(e) => setGameId(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="serverId">Server ID *</Label>
                <Input
                  id="serverId"
                  placeholder="1234"
                  value={serverId}
                  onChange={(e) => setServerId(e.target.value)}
                />
              </div>
            </div>
            
            {selectedProduct && (
              <div className="p-4 bg-muted rounded-xl space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Package</span>
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
              onClick={handlePurchase}
              disabled={purchasing || !gameId || !serverId}
            >
              {purchasing ? "Processing..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </MobileLayout>
  );
};

export default GamePage;