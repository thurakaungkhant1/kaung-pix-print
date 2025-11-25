import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Trash2, Plus, Minus, ShoppingBag } from "lucide-react";
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
    // Remove all items from cart after successful checkout
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
          <p>Loading...</p>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="bg-gradient-primary text-primary-foreground p-4 sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)}>
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h1 className="text-xl font-bold flex-1">Shopping Cart</h1>
          <PointsDisplay />
        </div>
      </header>

      <div className="max-w-screen-xl mx-auto p-4">
        {cartItems.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingBag className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">Your cart is empty</p>
            <Button onClick={() => navigate("/")}>Continue Shopping</Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Cart Items */}
            {cartItems.map((item) => (
              <Card key={item.id}>
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    <img
                      src={item.products.image_url}
                      alt={item.products.name}
                      className="w-24 h-24 object-cover rounded cursor-pointer"
                      onClick={() => navigate(`/product/${item.products.id}`)}
                    />
                    <div className="flex-1">
                      <h3
                        className="font-semibold cursor-pointer hover:text-primary"
                        onClick={() => navigate(`/product/${item.products.id}`)}
                      >
                        {item.products.name}
                      </h3>
                      <p className="text-primary font-bold mt-1">
                        {item.products.price.toLocaleString()} MMK
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item.products.points_value} points per item
                      </p>

                      <div className="flex items-center gap-4 mt-3">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() =>
                              updateQuantity(item.id, item.quantity - 1)
                            }
                            disabled={item.quantity <= 1}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-8 text-center font-semibold">
                            {item.quantity}
                          </span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() =>
                              updateQuantity(item.id, item.quantity + 1)
                            }
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => removeItem(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">
                        {(item.products.price * item.quantity).toLocaleString()} MMK
                      </p>
                      <p className="text-xs text-green-600">
                        +{item.products.points_value * item.quantity} pts
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Cart Summary */}
            <Card className="sticky bottom-20">
              <CardContent className="p-4 space-y-4">
                <h3 className="font-bold text-lg">Order Summary</h3>
                
                {/* Itemized List */}
                <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-3 bg-muted/30">
                  {cartItems.map((item) => (
                    <div key={item.id} className="space-y-1">
                      <div className="flex justify-between items-start text-sm">
                        <span className="font-medium flex-1">{item.products.name}</span>
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{item.products.price.toLocaleString()} MMK × {item.quantity}</span>
                        <span className="font-semibold text-foreground">
                          {(item.products.price * item.quantity).toLocaleString()} MMK
                        </span>
                      </div>
                      {item !== cartItems[cartItems.length - 1] && (
                        <div className="border-b pt-1" />
                      )}
                    </div>
                  ))}
                </div>

                {/* Points Summary */}
                <div className="flex justify-between text-sm bg-green-50 dark:bg-green-950/20 p-2 rounded">
                  <span className="text-muted-foreground">Total Points to Earn:</span>
                  <span className="font-bold text-green-600 dark:text-green-400">
                    +{totalPoints} pts
                  </span>
                </div>

                {/* Grand Total */}
                <div className="border-t pt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold">Grand Total:</span>
                    <span className="text-2xl font-bold text-primary">
                      {totalPrice.toLocaleString()} MMK
                    </span>
                  </div>
                </div>

                <Button 
                  className="w-full" 
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
