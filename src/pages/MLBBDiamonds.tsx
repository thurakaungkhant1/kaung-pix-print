import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Diamond, ArrowLeft, History } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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

const MLBBDiamonds = () => {
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
  const navigate = useNavigate();

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
      navigate("/auth/login");
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
      <div className="min-h-screen bg-background pb-20">
        <div className="max-w-screen-xl mx-auto p-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-64 bg-muted animate-pulse rounded-xl" />
            ))}
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="bg-gradient-primary text-primary-foreground p-4 sticky top-0 z-40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/")}
              className="hover:bg-primary-foreground/10"
            >
              <ArrowLeft className="h-6 w-6" />
            </Button>
            <h1 className="text-2xl font-bold">💎</h1>
          </div>
        </div>
      </header>

      <div className="max-w-screen-xl mx-auto p-4">
        <Tabs defaultValue="packages" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="packages">
              <Diamond className="h-4 w-4 mr-2" />
              Packages
            </TabsTrigger>
            <TabsTrigger value="orders">
              <History className="h-4 w-4 mr-2" />
              My Orders
            </TabsTrigger>
          </TabsList>

          <TabsContent value="packages">
            <div className="mb-6 p-4 bg-accent/10 border border-accent rounded-lg">
              <h2 className="text-lg font-bold text-accent mb-2 flex items-center gap-2">
                <Diamond className="h-5 w-5" />
                Special MLBB Diamond Offers!
              </h2>
              <p className="text-sm text-muted-foreground">
                Diamond ဝယ်ယူသူများအနေဖြင့် စိန်ဝယ်ပြီးပါက Admin ကို ဆက်သွယ်ပေးပါ၊ ဝယ်ယူအားပေးလို့ ကျေးဇူးပါခင်ဗျာ။
              </p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                created by Thura Kaung Khant
              </p>
            </div>

            {products.length === 0 ? (
              <div className="text-center py-12">
                <Diamond className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No diamond packages available yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {products.map((product) => (
                  <Card
                    key={product.id}
                    className="overflow-hidden hover:shadow-lg transition-shadow"
                  >
                    <CardContent className="p-4">
                      <div className="flex gap-4">
                        <div className="h-24 w-24 flex-shrink-0 bg-muted rounded">
                          <img
                            src={product.image_url}
                            alt={product.name}
                            className="w-full h-full object-cover rounded"
                          />
                        </div>
                        <div className="flex-1 flex flex-col justify-between">
                          <div>
                            <h3 className="font-semibold text-base mb-1">
                              {product.name}
                            </h3>
                            {product.description && (
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {product.description}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center justify-between mt-2">
                            <p className="text-primary font-bold text-xl">
                              {product.price.toLocaleString()} Ks
                            </p>
                            <Button
                              onClick={() => handleBuyClick(product)}
                              size="sm"
                            >
                              Buy Now
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="orders">
            {orders.length === 0 ? (
              <div className="text-center py-12">
                <History className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No orders yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => (
                  <Card key={order.id}>
                    <CardContent className="p-4">
                      <div className="flex gap-4">
                        <img
                          src={order.products.image_url}
                          alt={order.products.name}
                          className="h-20 w-20 rounded object-cover"
                        />
                        <div className="flex-1">
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="font-semibold">{order.products.name}</h3>
                            {getStatusBadge(order.status)}
                          </div>
                          <div className="text-sm text-muted-foreground space-y-1">
                            <p>Game ID: {order.game_id} ({order.server_id})</p>
                            <p>Game Name: {order.game_name}</p>
                            <p>Price: {order.price.toLocaleString()} Ks</p>
                            <p>Date: {new Date(order.created_at).toLocaleDateString()}</p>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Purchase {selectedProduct?.name}</DialogTitle>
            <DialogDescription>
              Enter your Mobile Legends account details to receive diamonds
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="gameId">Player ID *</Label>
                <Input
                  id="gameId"
                  placeholder="123456789"
                  value={gameId}
                  onChange={(e) => setGameId(e.target.value)}
                  aria-label="Player ID"
                  aria-required="true"
                />
              </div>
              <div>
                <Label htmlFor="serverId">Server ID *</Label>
                <Input
                  id="serverId"
                  placeholder="1234"
                  value={serverId}
                  onChange={(e) => setServerId(e.target.value)}
                  aria-label="Server ID"
                  aria-required="true"
                />
              </div>
            </div>
            
            {selectedProduct && (
              <div className="p-3 bg-muted rounded">
                <div className="flex justify-between mb-2">
                  <span>Package:</span>
                  <span className="font-medium">{selectedProduct.name}</span>
                </div>
                <div className="flex justify-between text-lg font-bold">
                  <span>Total:</span>
                  <span className="text-primary">{selectedProduct.price.toLocaleString()} Ks</span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPurchaseDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handlePurchase}
              disabled={purchasing || !gameId || !serverId}
            >
              {purchasing ? "Processing..." : "Confirm Purchase"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
};

export default MLBBDiamonds;
