import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Trash2, Plus, Minus, ShoppingBag, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import BottomNav from "@/components/BottomNav";
import PointsDisplay from "@/components/PointsDisplay";
import CheckoutDialog from "@/components/CheckoutDialog";

interface CartItem {
  id: string;
  quantity: number;
  product_id: number;
  products: {
    id: number;
    name: string;
    price: number;
    image_url: string;
    points_value: number;
  };
}

const Cart = () => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      loadCart();
    } else {
      navigate("/auth/login");
    }
  }, [user]);

  const loadCart = async () => {
    if (!user) return;

    const { data } = await supabase
      .from("cart_items")
      .select(`
        *,
        products (*)
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (data) {
      setCartItems(data as CartItem[]);
    }
    setLoading(false);
  };

  const updateQuantity = async (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return;

    const { error } = await supabase
      .from("cart_items")
      .update({ quantity: newQuantity })
      .eq("id", itemId);

    if (!error) {
      loadCart();
    }
  };

  const removeItem = async (itemId: string) => {
    const { error } = await supabase
      .from("cart_items")
      .delete()
      .eq("id", itemId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to remove item",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Item removed from cart",
      });
      loadCart();
    }
  };

  const totalPrice = cartItems.reduce(
    (sum, item) => sum + item.products.price * item.quantity,
    0
  );

  const totalPoints = cartItems.reduce(
    (sum, item) => sum + item.products.points_value * item.quantity,
    0
  );

  const handleCheckout = () => {
    if (cartItems.length === 0) return;
    setCheckoutOpen(true);
  };

  const handleCheckoutSuccess = async () => {
    const deletePromises = cartItems.map(item =>
      supabase.from("cart_items").delete().eq("id", item.id)
    );
    
    await Promise.all(deletePromises);
    
    setCheckoutOpen(false);
    toast({
      title: "Success",
      description: "All orders have been placed successfully!",
    });
    loadCart();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="flex items-center justify-center h-screen">
          <div className="text-center space-y-4">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-muted-foreground font-medium animate-pulse">Loading your cart...</p>
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30 pb-20">
      <header className="bg-gradient-primary text-primary-foreground p-4 sticky top-0 z-40 shadow-lg">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 rounded-full hover:bg-primary-foreground/10 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-display font-bold flex-1">Shopping Cart</h1>
          <PointsDisplay />
        </div>
      </header>

      <div className="max-w-screen-xl mx-auto p-4">
        {cartItems.length === 0 ? (
          <div className="text-center py-16 animate-fade-in">
            <div className="relative inline-block mb-6">
              <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full" />
              <ShoppingBag className="h-20 w-20 mx-auto text-muted-foreground relative" />
            </div>
            <h3 className="text-xl font-display font-semibold mb-2">Your cart is feeling lonely</h3>
            <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
              Looks like you haven't added anything yet. Let's find something amazing for you!
            </p>
            <Button 
              onClick={() => navigate("/")}
              size="lg"
              className="shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Start Shopping
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {cartItems.map((item, index) => (
              <Card 
                key={item.id} 
                className="overflow-hidden animate-fade-in hover:shadow-lg transition-all duration-300"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    <div className="relative group">
                      <img
                        src={item.products.image_url}
                        alt={item.products.name}
                        className="w-24 h-24 object-cover rounded-xl cursor-pointer transition-transform duration-300 group-hover:scale-105"
                        onClick={() => navigate(`/product/${item.products.id}`)}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-foreground/20 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3
                        className="font-display font-semibold cursor-pointer hover:text-primary transition-colors truncate"
                        onClick={() => navigate(`/product/${item.products.id}`)}
                      >
                        {item.products.name}
                      </h3>
                      <p className="text-primary font-bold mt-1">
                        {item.products.price.toLocaleString()} MMK
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Sparkles className="h-3 w-3" />
                        {item.products.points_value} points per item
                      </p>

                      <div className="flex items-center gap-4 mt-3">
                        <div className="flex items-center gap-2 bg-muted/50 rounded-full p-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-full hover:bg-background"
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            disabled={item.quantity <= 1}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-8 text-center font-bold">
                            {item.quantity}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-full hover:bg-background"
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-full"
                          onClick={() => removeItem(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg">
                        {(item.products.price * item.quantity).toLocaleString()} MMK
                      </p>
                      <p className="text-xs text-primary font-medium flex items-center justify-end gap-1">
                        <Sparkles className="h-3 w-3" />
                        +{item.products.points_value * item.quantity} pts
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Cart Summary */}
            <Card className="sticky bottom-20 shadow-xl border-primary/20 bg-card/95 backdrop-blur-sm">
              <CardContent className="p-4 space-y-4">
                <h3 className="font-display font-bold text-lg flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5 text-primary" />
                  Order Summary
                </h3>
                
                <div className="space-y-2 max-h-48 overflow-y-auto border rounded-xl p-3 bg-muted/30">
                  {cartItems.map((item) => (
                    <div key={item.id} className="space-y-1">
                      <div className="flex justify-between items-start text-sm">
                        <span className="font-medium flex-1 truncate">{item.products.name}</span>
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{item.products.price.toLocaleString()} MMK × {item.quantity}</span>
                        <span className="font-semibold text-foreground">
                          {(item.products.price * item.quantity).toLocaleString()} MMK
                        </span>
                      </div>
                      {item !== cartItems[cartItems.length - 1] && (
                        <div className="border-b border-dashed pt-1" />
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex justify-between text-sm bg-primary/10 p-3 rounded-xl border border-primary/20">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Points to Earn
                  </span>
                  <span className="font-bold text-primary">
                    +{totalPoints} pts
                  </span>
                </div>

                <div className="border-t pt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-display font-bold">Grand Total</span>
                    <span className="text-2xl font-display font-bold text-primary">
                      {totalPrice.toLocaleString()} MMK
                    </span>
                  </div>
                </div>

                <Button 
                  className="w-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.01]" 
                  size="lg"
                  onClick={handleCheckout}
                >
                  Proceed to Checkout ({cartItems.length} {cartItems.length === 1 ? 'item' : 'items'})
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      <BottomNav />

      {cartItems.length > 0 && (
        <CheckoutDialog
          open={checkoutOpen}
          onClose={() => setCheckoutOpen(false)}
          cartItems={cartItems}
          userId={user?.id || ""}
          onSuccess={handleCheckoutSuccess}
        />
      )}
    </div>
  );
};

export default Cart;