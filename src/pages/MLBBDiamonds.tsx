import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Heart, Gem, ArrowLeft, History } from "lucide-react";
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
  const [favourites, setFavourites] = useState<Set<number>>(new Set());
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPurchaseDialog, setShowPurchaseDialog] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [gameId, setGameId] = useState("");
  const [serverId, setServerId] = useState("");
  const [gameName, setGameName] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadProducts();
    if (user) {
      loadFavourites();
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

  const loadFavourites = async () => {
    if (!user) return;

    const { data } = await supabase
      .from("favourite_products")
      .select("product_id")
      .eq("user_id", user.id);

    if (data) {
      setFavourites(new Set(data.map((f) => f.product_id)));
    }
  };

  const toggleFavourite = async (productId: number) => {
    if (!user) {
      toast({
        title: "Login required",
        description: "Please login to add favourites",
        variant: "destructive",
      });
      return;
    }

    const isFav = favourites.has(productId);

    if (isFav) {
      await supabase
        .from("favourite_products")
        .delete()
        .eq("user_id", user.id)
        .eq("product_id", productId);

      setFavourites((prev) => {
        const newSet = new Set(prev);
        newSet.delete(productId);
        return newSet;
      });
    } else {
      await supabase
        .from("favourite_products")
        .insert({ user_id: user.id, product_id: productId });

      setFavourites((prev) => new Set(prev).add(productId));
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
    setGameName("");
  };

  const verifyGameAccount = async () => {
    if (!gameId || !serverId) {
      toast({
        title: "Missing information",
        description: "Please enter both Game ID and Server ID",
        variant: "destructive",
      });
      return;
    }

    setVerifying(true);
    // Simulate API call to verify game account
    // In production, this would call Mobile Legends API
    await new Promise((resolve) => setTimeout(resolve, 1500));
    
    // Mock verification - in production, this would be real data from API
    const mockGameName = `Player${gameId.slice(-4)}`;
    setGameName(mockGameName);
    setVerifying(false);
    
    toast({
      title: "Account verified",
      description: `Found account: ${mockGameName}`,
    });
  };

  const handlePurchase = async () => {
    if (!selectedProduct || !user || !gameName) {
      toast({
        title: "Error",
        description: "Please verify your game account first",
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
      game_name: gameName,
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
            <div className="flex items-center gap-2">
              <Gem className="h-6 w-6" />
              <h1 className="text-xl sm:text-2xl font-bold">MLBB Diamonds</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-screen-xl mx-auto p-4">
        <Tabs defaultValue="packages" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="packages">
              <Gem className="h-4 w-4 mr-2" />
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
                <Gem className="h-5 w-5" />
                Special MLBB Diamond Offers!
              </h2>
              <p className="text-sm text-muted-foreground">
                Top up your Mobile Legends account with the best diamond packages at competitive prices.
              </p>
            </div>

            {products.length === 0 ? (
              <div className="text-center py-12">
                <Gem className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
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
                        <div className="relative h-24 w-24 flex-shrink-0 bg-muted rounded">
                          <img
                            src={product.image_url}
                            alt={product.name}
                            className="w-full h-full object-cover rounded"
                          />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFavourite(product.id);
                            }}
                            className="absolute -top-1 -right-1 p-1.5 bg-background rounded-full hover:bg-background/90 transition-colors shadow-md"
                          >
                            <Heart
                              className={`h-3.5 w-3.5 ${
                                favourites.has(product.id)
                                  ? "fill-primary text-primary"
                                  : "text-muted-foreground"
                              }`}
                            />
                          </button>
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
                              ${product.price.toFixed(2)}
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
                            <p>Price: ${order.price.toFixed(2)}</p>
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
                <Label htmlFor="gameId">Game ID *</Label>
                <Input
                  id="gameId"
                  placeholder="123456789"
                  value={gameId}
                  onChange={(e) => setGameId(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="serverId">Server ID *</Label>
                <Input
                  id="serverId"
                  placeholder="1234"
                  value={serverId}
                  onChange={(e) => setServerId(e.target.value)}
                />
              </div>
            </div>
            <Button
              onClick={verifyGameAccount}
              disabled={verifying || !gameId || !serverId}
              variant="outline"
              className="w-full"
            >
              {verifying ? "Verifying..." : "Verify Account"}
            </Button>
            {gameName && (
              <div className="p-3 bg-accent/10 border border-accent rounded">
                <p className="text-sm font-medium">Account Found:</p>
                <p className="text-lg font-bold text-accent">{gameName}</p>
              </div>
            )}
            {selectedProduct && (
              <div className="p-3 bg-muted rounded">
                <div className="flex justify-between mb-2">
                  <span>Package:</span>
                  <span className="font-medium">{selectedProduct.name}</span>
                </div>
                <div className="flex justify-between text-lg font-bold">
                  <span>Total:</span>
                  <span className="text-primary">${selectedProduct.price.toFixed(2)}</span>
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
              disabled={purchasing || !gameName}
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
