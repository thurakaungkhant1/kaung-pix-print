import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface UseCartOptions {
  userId?: string;
}

export const useCart = ({ userId }: UseCartOptions = {}) => {
  const [isAdding, setIsAdding] = useState<number | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const addToCart = async (productId: number, quantity: number = 1) => {
    if (!userId) {
      toast({
        title: "Login Required",
        description: "Please login to add items to cart",
        variant: "destructive",
      });
      navigate("/auth/login");
      return false;
    }

    setIsAdding(productId);

    try {
      // Check if item already exists in cart
      const { data: existing } = await supabase
        .from("cart_items")
        .select("id, quantity")
        .eq("user_id", userId)
        .eq("product_id", productId)
        .maybeSingle();

      if (existing) {
        // Update quantity if exists
        const { error } = await supabase
          .from("cart_items")
          .update({ quantity: existing.quantity + quantity })
          .eq("id", existing.id);

        if (error) throw error;

        toast({
          title: "Cart Updated",
          description: "Item quantity increased",
        });
      } else {
        // Insert new item
        const { error } = await supabase
          .from("cart_items")
          .insert({
            user_id: userId,
            product_id: productId,
            quantity,
          });

        if (error) throw error;

        toast({
          title: "Added to Cart",
          description: "Item added to your cart",
        });
      }

      return true;
    } catch (error) {
      console.error("Error adding to cart:", error);
      toast({
        title: "Error",
        description: "Failed to add item to cart",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsAdding(null);
    }
  };

  return {
    addToCart,
    isAdding,
  };
};
