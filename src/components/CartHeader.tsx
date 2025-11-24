import { useEffect, useState } from "react";
import { ShoppingCart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

const CartHeader = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    if (user) {
      loadCartCount();
      
      // Subscribe to cart changes
      const channel = supabase
        .channel("cart-header-changes")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "cart_items",
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            loadCartCount();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } else {
      setCartCount(0);
    }
  }, [user]);

  const loadCartCount = async () => {
    if (!user) return;

    const { count } = await supabase
      .from("cart_items")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    setCartCount(count || 0);
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => navigate("/cart")}
      className="relative text-primary-foreground hover:bg-primary-foreground/10"
    >
      <ShoppingCart className="h-6 w-6" />
      {cartCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-primary-foreground text-primary text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
          {cartCount > 9 ? "9+" : cartCount}
        </span>
      )}
    </Button>
  );
};

export default CartHeader;
