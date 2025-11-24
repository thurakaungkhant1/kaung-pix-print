import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Diamond, ArrowLeft, History, Copy, CheckCircle2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { z } from "zod";
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
  const [gameName, setGameName] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState("");
  const [isVerified, setIsVerified] = useState(false);
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
    setGameName("");
    setIsVerified(false);
    setVerificationError("");
  };

  const verifyGameAccount = async () => {
    // Clear previous errors and verification state
    setVerificationError("");
    setGameName("");
    setIsVerified(false);

    // Validate inputs
    const playerIdSchema = z.string()
      .trim()
      .min(3, "Player ID must be at least 3 characters")
      .max(20, "Player ID must be less than 20 characters")
      .regex(/^[a-zA-Z0-9]+$/, "Player ID must contain only letters and numbers");
    
    const serverIdSchema = z.string()
      .trim()
      .min(1, "Server ID is required")
      .regex(/^[0-9]+$/, "Server ID must be numeric");

    try {
      playerIdSchema.parse(gameId);
      serverIdSchema.parse(serverId);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessage = error.issues[0].message;
        setVerificationError(errorMessage);
        toast({
          title: "Validation error",
          description: errorMessage,
          variant: "destructive",
        });
        return;
      }
    }

    setVerifying(true);

    try {
      const { data, error } = await supabase.functions.invoke('verify-mlbb-player', {
        body: {
          player_id: gameId.trim(),
          server_id: serverId.trim(),
        },
      });

      if (error) {
        throw error;
      }

      if (data.error) {
        throw new Error(data.error);
      }

      if (data.found) {
        setGameName(data.player_name);
        setIsVerified(true);
        toast({
          title: "Account verified ✓",
          description: `Player found: ${data.player_name}`,
        });
      } else {
        setVerificationError(`No player found for ID ${gameId}`);
        toast({
          title: "Player not found",
          description: `No player found for ID ${gameId}. Please check your Player ID and Server ID.`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Verification error:", error);
      setVerificationError("Verification failed. Please try again later.");
      toast({
        title: "Verification failed",
        description: error instanceof Error ? error.message : "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setVerifying(false);
    }
  };

  const copyPlayerName = () => {
    if (gameName) {
      navigator.clipboard.writeText(gameName);
      toast({
        title: "Copied!",
        description: "Player name copied to clipboard",
      });
    }
  };

  const handlePurchase = async () => {
    if (!selectedProduct || !user || !gameName || !isVerified) {
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
              <Diamond className="h-6 w-6" />
              <h1 className="text-xl sm:text-2xl font-bold">MLBB Diamonds</h1>
            </div>
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
                Top up your Mobile Legends account with the best diamond packages at competitive prices.
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
                <Label htmlFor="gameId">Player ID *</Label>
                <Input
                  id="gameId"
                  placeholder="123456789"
                  value={gameId}
                  onChange={(e) => {
                    setGameId(e.target.value);
                    setIsVerified(false);
                    setVerificationError("");
                  }}
                  disabled={verifying}
                  aria-label="Player ID"
                  aria-required="true"
                  className={verificationError ? "border-destructive" : ""}
                />
              </div>
              <div>
                <Label htmlFor="serverId">Server ID *</Label>
                <Input
                  id="serverId"
                  placeholder="1234"
                  value={serverId}
                  onChange={(e) => {
                    setServerId(e.target.value);
                    setIsVerified(false);
                    setVerificationError("");
                  }}
                  disabled={verifying}
                  aria-label="Server ID"
                  aria-required="true"
                  className={verificationError ? "border-destructive" : ""}
                />
              </div>
            </div>
            
            {verificationError && (
              <div className="p-3 bg-destructive/10 border border-destructive rounded">
                <p className="text-sm text-destructive" role="alert">{verificationError}</p>
              </div>
            )}

            <Button
              onClick={verifyGameAccount}
              disabled={verifying || !gameId || !serverId || isVerified}
              variant={isVerified ? "secondary" : "outline"}
              className="w-full"
              aria-label="Verify game account"
            >
              {verifying ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : isVerified ? (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Verified
                </>
              ) : (
                "Verify Account"
              )}
            </Button>

            {isVerified && gameName && (
              <div className="p-4 bg-accent/10 border border-accent rounded-lg">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle2 className="h-4 w-4 text-accent" />
                      <p className="text-sm font-medium text-accent">Verified ✓</p>
                    </div>
                    <p className="text-xs text-muted-foreground mb-1">Player Name:</p>
                    <p className="text-lg font-bold">{gameName}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={copyPlayerName}
                    aria-label="Copy player name"
                    className="flex-shrink-0"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
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
              disabled={purchasing || !isVerified || !gameName}
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
