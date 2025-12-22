import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Crown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import MobileLayout from "@/components/MobileLayout";

const ProductNew = () => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [imageUrl1, setImageUrl1] = useState("");
  const [imageUrl2, setImageUrl2] = useState("");
  const [imageUrl3, setImageUrl3] = useState("");
  const [imageUrl4, setImageUrl4] = useState("");
  const [pointsValue, setPointsValue] = useState("");
  const [category, setCategory] = useState("General");
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Use first non-empty image URL as primary
    const primaryImage = imageUrl1 || imageUrl2 || imageUrl3 || imageUrl4;
    
    if (!primaryImage) {
      toast({
        title: "Error",
        description: "Please provide at least one image URL",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    const { error } = await supabase.from("products").insert({
      name,
      description,
      price: parseFloat(price),
      image_url: primaryImage,
      points_value: parseInt(pointsValue) || 0,
      category,
      is_premium: isPremium,
    });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to create product",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Product created successfully",
      });
      navigate("/admin/products");
    }

    setLoading(false);
  };

  return (
    <MobileLayout>
      <div className="min-h-screen bg-background pb-8">
        <header className="bg-gradient-primary text-primary-foreground p-4 sticky top-0 z-40">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate("/admin")}>
              <ArrowLeft className="h-6 w-6" />
            </button>
            <h1 className="text-xl font-bold">Add New Product</h1>
          </div>
        </header>

        <div className="p-4">
          <Card>
            <CardHeader>
              <CardTitle>Product Details</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Product Name *</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="price">Price *</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    required
                  />
                </div>

                {/* 4 Image URL Fields */}
                <div className="space-y-3">
                  <Label>Product Images (up to 4)</Label>
                  <div className="space-y-2">
                    <Input
                      type="url"
                      value={imageUrl1}
                      onChange={(e) => setImageUrl1(e.target.value)}
                      placeholder="Image URL 1 (Primary) *"
                    />
                    <Input
                      type="url"
                      value={imageUrl2}
                      onChange={(e) => setImageUrl2(e.target.value)}
                      placeholder="Image URL 2 (Optional)"
                    />
                    <Input
                      type="url"
                      value={imageUrl3}
                      onChange={(e) => setImageUrl3(e.target.value)}
                      placeholder="Image URL 3 (Optional)"
                    />
                    <Input
                      type="url"
                      value={imageUrl4}
                      onChange={(e) => setImageUrl4(e.target.value)}
                      placeholder="Image URL 4 (Optional)"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    First non-empty URL will be used as primary image
                  </p>
                </div>

                <div>
                  <Label htmlFor="pointsValue">Points Value *</Label>
                  <Input
                    id="pointsValue"
                    type="number"
                    value={pointsValue}
                    onChange={(e) => setPointsValue(e.target.value)}
                    placeholder="Points awarded per product"
                    required
                    min="0"
                  />
                </div>

                <div>
                  <Label htmlFor="category">Category *</Label>
                  <Input
                    id="category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="e.g., Electronics, Books, Apparel"
                    required
                  />
                </div>

                <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg border">
                  <Switch
                    id="is_premium"
                    checked={isPremium}
                    onCheckedChange={setIsPremium}
                  />
                  <Label htmlFor="is_premium" className="flex items-center gap-2 cursor-pointer">
                    <Crown className="h-4 w-4 text-amber-500" />
                    <div>
                      <span className="font-medium">Premium Only</span>
                      <p className="text-xs text-muted-foreground">Only users with premium subscription can access this product</p>
                    </div>
                  </Label>
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Creating..." : "Create Product"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </MobileLayout>
  );
};

export default ProductNew;
