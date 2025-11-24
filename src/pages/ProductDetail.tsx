import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, Minus, Plus, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface Product {
  id: string;
  name: string;
  price: number;
  image_url: string;
  description: string | null;
}

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isFavourite, setIsFavourite] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    loadProduct();
    if (user) checkFavourite();
  }, [id, user]);

  const loadProduct = async () => {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("id", id)
      .single();

    if (!error && data) {
      setProduct(data);
    }
  };

  const checkFavourite = async () => {
    if (!user || !id) return;

    const { data } = await supabase
      .from("favourite_products")
      .select("id")
      .eq("user_id", user.id)
      .eq("product_id", id)
      .maybeSingle();

    setIsFavourite(!!data);
  };

  const toggleFavourite = async () => {
    if (!user) {
      toast({
        title: "Login required",
        description: "Please login to add favourites",
        variant: "destructive",
      });
      return;
    }

    if (isFavourite) {
      await supabase
        .from("favourite_products")
        .delete()
        .eq("user_id", user.id)
        .eq("product_id", id);
    } else {
      await supabase
        .from("favourite_products")
        .insert({ user_id: user.id, product_id: id });
    }

    setIsFavourite(!isFavourite);
  };

  const handleBuyNow = async () => {
    if (!user) {
      toast({
        title: "Login required",
        description: "Please login to place an order",
        variant: "destructive",
      });
      navigate("/auth/login");
      return;
    }

    if (!product) return;

    const { error } = await supabase.from("orders").insert({
      user_id: user.id,
      product_id: product.id,
      quantity,
      price: product.price * quantity,
    });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to place order",
        variant: "destructive",
      });
    } else {
      // Award points for purchase (10 points per product)
      const pointsEarned = quantity * 10;

      // Get current points
      const { data: profile } = await supabase
        .from("profiles")
        .select("points")
        .eq("id", user.id)
        .single();

      if (profile) {
        // Update points
        await supabase
          .from("profiles")
          .update({ points: profile.points + pointsEarned })
          .eq("id", user.id);

        // Add transaction record
        await supabase.from("point_transactions").insert({
          user_id: user.id,
          amount: pointsEarned,
          transaction_type: "purchase",
          description: `Earned ${pointsEarned} points from purchasing ${product.name}`,
        });
      }

      toast({
        title: "Success",
        description: `Order placed! You earned ${pointsEarned} points!`,
      });
    }
  };

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-8">
      <header className="bg-gradient-primary text-primary-foreground p-4 sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)}>
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h1 className="text-xl font-bold">Product Details</h1>
        </div>
      </header>

      <div className="max-w-screen-xl mx-auto p-4">
        <Card className="overflow-hidden">
          <div className="aspect-square bg-muted">
            <img
              src={product.image_url}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          </div>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-2xl">{product.name}</CardTitle>
                <CardDescription className="text-xl font-bold text-primary mt-2">
                  ${product.price.toFixed(2)}
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleFavourite}
                className="shrink-0"
              >
                <Heart
                  className={`h-6 w-6 ${
                    isFavourite ? "fill-primary text-primary" : ""
                  }`}
                />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {product.description && (
              <div>
                <h3 className="font-semibold mb-2">Description</h3>
                <p className="text-muted-foreground">{product.description}</p>
              </div>
            )}

            <div>
              <h3 className="font-semibold mb-2">Quantity</h3>
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="text-xl font-bold w-12 text-center">{quantity}</span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setQuantity(quantity + 1)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full" size="lg" onClick={handleBuyNow}>
              Buy Now - ${(product.price * quantity).toFixed(2)}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default ProductDetail;
