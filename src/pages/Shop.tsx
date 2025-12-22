import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import BottomNav from "@/components/BottomNav";
import PointsDisplay from "@/components/PointsDisplay";
import {
  ArrowLeft,
  Search,
  Crown,
  Coins,
  Banknote,
  ShoppingBag,
  Sparkles,
  Loader2,
  Phone,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ShopCategory {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
}

interface ShopItem {
  id: string;
  name: string;
  description: string | null;
  category_id: string | null;
  price_mmk: number;
  price_points: number;
  image_url: string | null;
  is_premium: boolean | null;
  is_active: boolean;
  stock_quantity: number | null;
}

const Shop = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [categories, setCategories] = useState<ShopCategory[]>([]);
  const [items, setItems] = useState<ShopItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [userPoints, setUserPoints] = useState(0);
  
  // Purchase dialog state
  const [purchaseDialogOpen, setPurchaseDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ShopItem | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"points" | "mmk">("points");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    
    const [categoriesRes, itemsRes] = await Promise.all([
      supabase
        .from("shop_categories")
        .select("*")
        .eq("is_active", true)
        .order("display_order"),
      supabase
        .from("shop_items")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false }),
    ]);

    if (categoriesRes.data) setCategories(categoriesRes.data);
    if (itemsRes.data) setItems(itemsRes.data);

    // Load user points
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("points, phone_number")
        .eq("id", user.id)
        .single();
      
      if (profile) {
        setUserPoints(profile.points);
        setPhoneNumber(profile.phone_number || "");
      }
    }

    setLoading(false);
  };

  const filteredItems = items.filter((item) => {
    const matchesCategory = selectedCategory === "all" || item.category_id === selectedCategory;
    const matchesSearch = 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handlePurchase = (item: ShopItem) => {
    setSelectedItem(item);
    setPaymentMethod("points");
    setPurchaseDialogOpen(true);
  };

  const confirmPurchase = async () => {
    if (!selectedItem || !user) return;

    if (paymentMethod === "points" && userPoints < selectedItem.price_points) {
      toast({
        title: "Insufficient Points",
        description: "You don't have enough points for this purchase",
        variant: "destructive",
      });
      return;
    }

    if (!phoneNumber.trim()) {
      toast({
        title: "Phone Required",
        description: "Please enter your phone number",
        variant: "destructive",
      });
      return;
    }

    setPurchasing(true);

    try {
      if (paymentMethod === "points") {
        // Deduct points
        const { error: pointsError } = await supabase
          .from("profiles")
          .update({ points: userPoints - selectedItem.price_points })
          .eq("id", user.id);

        if (pointsError) throw pointsError;

        // Record transaction
        await supabase.from("point_transactions").insert({
          user_id: user.id,
          amount: -selectedItem.price_points,
          transaction_type: "shop_purchase",
          description: `Purchased ${selectedItem.name}`,
        });

        toast({
          title: "Purchase Successful! 🎉",
          description: `You purchased ${selectedItem.name} for ${selectedItem.price_points} points`,
        });

        setUserPoints((prev) => prev - selectedItem.price_points);
      } else {
        // MMK purchase - would typically integrate with payment gateway
        toast({
          title: "Order Placed! 📦",
          description: `Your order for ${selectedItem.name} has been placed. We'll contact you at ${phoneNumber}`,
        });
      }

      setPurchaseDialogOpen(false);
      setSelectedItem(null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to complete purchase",
        variant: "destructive",
      });
    } finally {
      setPurchasing(false);
    }
  };

  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId) return "Uncategorized";
    return categories.find((c) => c.id === categoryId)?.name || "Unknown";
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground font-medium animate-pulse">Loading shop...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30 pb-24">
      {/* Header */}
      <header className="bg-gradient-primary text-primary-foreground p-4 sticky top-0 z-40 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 rounded-full hover:bg-primary-foreground/10 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-6 w-6" />
              <h1 className="text-xl font-display font-bold">Premium Shop</h1>
            </div>
          </div>
          <PointsDisplay />
        </div>
      </header>

      <div className="p-4 space-y-4">
        {/* Points Balance Card */}
        <Card className="bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Your Points</p>
                <p className="text-3xl font-bold text-primary">{userPoints.toLocaleString()}</p>
              </div>
              <div className="p-3 rounded-xl bg-primary/20">
                <Coins className="h-8 w-8 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Category Tabs */}
        <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
          <TabsList className="w-full flex overflow-x-auto h-auto p-1 bg-muted/50">
            <TabsTrigger value="all" className="flex-shrink-0">
              All
            </TabsTrigger>
            {categories.map((category) => (
              <TabsTrigger key={category.id} value={category.id} className="flex-shrink-0">
                {category.name}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Items Grid */}
        {filteredItems.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingBag className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No items found</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {filteredItems.map((item) => (
              <Card
                key={item.id}
                className={cn(
                  "overflow-hidden transition-all hover:shadow-lg",
                  item.is_premium && "border-primary/50 bg-gradient-to-b from-primary/5 to-transparent"
                )}
              >
                {/* Image */}
                <div className="aspect-square bg-muted relative">
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ShoppingBag className="h-12 w-12 text-muted-foreground/30" />
                    </div>
                  )}
                  {item.is_premium && (
                    <Badge className="absolute top-2 right-2 bg-gradient-to-r from-amber-500 to-orange-500">
                      <Crown className="h-3 w-3 mr-1" />
                      Premium
                    </Badge>
                  )}
                  {item.stock_quantity !== null && item.stock_quantity <= 5 && item.stock_quantity > 0 && (
                    <Badge variant="destructive" className="absolute top-2 left-2">
                      Only {item.stock_quantity} left
                    </Badge>
                  )}
                  {item.stock_quantity === 0 && (
                    <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                      <Badge variant="secondary">Out of Stock</Badge>
                    </div>
                  )}
                </div>

                <CardHeader className="p-3 pb-1">
                  <CardTitle className="text-sm line-clamp-2">{item.name}</CardTitle>
                  {item.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
                  )}
                </CardHeader>

                <CardContent className="p-3 pt-0 space-y-2">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1 text-primary font-bold">
                      <Coins className="h-4 w-4" />
                      <span>{item.price_points.toLocaleString()} pts</span>
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground text-sm">
                      <Banknote className="h-3 w-3" />
                      <span>{item.price_mmk.toLocaleString()} MMK</span>
                    </div>
                  </div>
                </CardContent>

                <CardFooter className="p-3 pt-0">
                  <Button
                    className="w-full"
                    size="sm"
                    onClick={() => handlePurchase(item)}
                    disabled={item.stock_quantity === 0}
                  >
                    <Sparkles className="h-4 w-4 mr-1" />
                    Purchase
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Purchase Dialog */}
      <Dialog open={purchaseDialogOpen} onOpenChange={setPurchaseDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Purchase</DialogTitle>
            <DialogDescription>
              {selectedItem?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Item Preview */}
            <div className="flex gap-4 p-3 bg-muted/50 rounded-lg">
              {selectedItem?.image_url ? (
                <img
                  src={selectedItem.image_url}
                  alt={selectedItem.name}
                  className="w-20 h-20 rounded-lg object-cover"
                />
              ) : (
                <div className="w-20 h-20 rounded-lg bg-muted flex items-center justify-center">
                  <ShoppingBag className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1">
                <h4 className="font-semibold">{selectedItem?.name}</h4>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {selectedItem?.description}
                </p>
              </div>
            </div>

            {/* Payment Method */}
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <RadioGroup value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as "points" | "mmk")}>
                <div className="flex items-center space-x-2 p-3 border rounded-lg">
                  <RadioGroupItem value="points" id="points" />
                  <Label htmlFor="points" className="flex-1 cursor-pointer">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Coins className="h-4 w-4 text-primary" />
                        <span>Pay with Points</span>
                      </div>
                      <span className="font-bold text-primary">
                        {selectedItem?.price_points.toLocaleString()} pts
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Your balance: {userPoints.toLocaleString()} pts
                      {userPoints < (selectedItem?.price_points || 0) && (
                        <span className="text-destructive ml-2">(Insufficient)</span>
                      )}
                    </p>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-3 border rounded-lg">
                  <RadioGroupItem value="mmk" id="mmk" />
                  <Label htmlFor="mmk" className="flex-1 cursor-pointer">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Banknote className="h-4 w-4 text-green-500" />
                        <span>Pay with MMK</span>
                      </div>
                      <span className="font-bold text-green-500">
                        {selectedItem?.price_mmk.toLocaleString()} MMK
                      </span>
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Phone Number */}
            <div className="space-y-2">
              <Label htmlFor="phone">Contact Phone Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="phone"
                  placeholder="09xxxxxxxxx"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setPurchaseDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={confirmPurchase}
              disabled={
                purchasing ||
                (paymentMethod === "points" && userPoints < (selectedItem?.price_points || 0))
              }
            >
              {purchasing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              Confirm Purchase
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
};

export default Shop;
