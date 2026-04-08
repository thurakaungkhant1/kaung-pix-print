import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Crown, Package, Gamepad2, Loader2, ImagePlus, Coins, Tag, Box, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import MobileLayout from "@/components/MobileLayout";
import { motion } from "framer-motion";

const GAME_CATEGORIES = [
  { id: "MLBB Diamonds", name: "Mobile Legends Diamonds" },
  { id: "PUBG UC", name: "PUBG Mobile UC" },
];

interface PhysicalCategory {
  id: string;
  name: string;
}

const ProductNew = () => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [originalPrice, setOriginalPrice] = useState("");
  const [imageUrl1, setImageUrl1] = useState("");
  const [imageUrl2, setImageUrl2] = useState("");
  const [imageUrl3, setImageUrl3] = useState("");
  const [imageUrl4, setImageUrl4] = useState("");
  const [pointsValue, setPointsValue] = useState("");
  const [category, setCategory] = useState("General");
  const [physicalCategoryId, setPhysicalCategoryId] = useState<string>("");
  const [stockQuantity, setStockQuantity] = useState("0");
  const [status, setStatus] = useState("available");
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(false);
  const [physicalCategories, setPhysicalCategories] = useState<PhysicalCategory[]>([]);
  const [step, setStep] = useState(1);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadPhysicalCategories();
  }, []);

  const loadPhysicalCategories = async () => {
    const { data } = await supabase
      .from("physical_categories")
      .select("id, name")
      .eq("is_active", true)
      .order("display_order", { ascending: true });
    if (data) setPhysicalCategories(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const primaryImage = imageUrl1 || imageUrl2 || imageUrl3 || imageUrl4;
    if (!primaryImage) {
      toast({ title: "Error", description: "Please provide at least one image URL", variant: "destructive" });
      setLoading(false);
      return;
    }

    const { error } = await supabase.from("products").insert({
      name,
      description,
      price: parseFloat(price),
      original_price: originalPrice ? parseFloat(originalPrice) : null,
      image_url: primaryImage,
      points_value: parseInt(pointsValue) || 0,
      category,
      physical_category_id: physicalCategoryId && physicalCategoryId !== "none" ? physicalCategoryId : null,
      stock_quantity: parseInt(stockQuantity) || 0,
      status,
      is_premium: isPremium,
    });

    if (error) {
      toast({ title: "Error", description: "Failed to create product", variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Product created successfully" });
      navigate("/admin/products");
    }
    setLoading(false);
  };

  const canProceed = step === 1 ? name.trim() && price : true;

  return (
    <MobileLayout>
      <div className="min-h-screen bg-background pb-8">
        <header className="bg-gradient-primary text-primary-foreground p-4 sticky top-0 z-40">
          <div className="flex items-center gap-4">
            <button onClick={() => step > 1 ? setStep(step - 1) : navigate("/admin")}>
              <ArrowLeft className="h-6 w-6" />
            </button>
            <div className="flex-1">
              <h1 className="text-xl font-bold">Add Product</h1>
              <p className="text-xs text-primary-foreground/70">Step {step} of 3</p>
            </div>
          </div>
          {/* Progress bar */}
          <div className="flex gap-1.5 mt-3">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-1 flex-1 rounded-full transition-all ${
                  s <= step ? "bg-primary-foreground" : "bg-primary-foreground/20"
                }`}
              />
            ))}
          </div>
        </header>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Step 1: Basic Info */}
          {step === 1 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-4"
            >
              <Card>
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Tag className="h-5 w-5 text-primary" />
                    <h2 className="font-bold text-lg">Basic Information</h2>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="name">Product Name *</Label>
                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter product name..." className="h-12" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Product description..." />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Price (MMK) *</Label>
                      <Input type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0" className="h-12 text-lg font-semibold" />
                    </div>
                    <div className="space-y-2">
                      <Label>Original Price</Label>
                      <Input type="number" step="0.01" value={originalPrice} onChange={(e) => setOriginalPrice(e.target.value)} placeholder="For discount" className="h-12" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5">
                      <Coins className="h-4 w-4 text-amber-500" /> Coin Reward
                    </Label>
                    <Input type="number" value={pointsValue} onChange={(e) => setPointsValue(e.target.value)} placeholder="Coins earned per purchase" className="h-12" min="0" />
                    <p className="text-xs text-muted-foreground">Users earn this many coins when order is approved</p>
                  </div>
                </CardContent>
              </Card>

              <Button type="button" className="w-full h-12 text-base" onClick={() => setStep(2)} disabled={!canProceed}>
                Continue to Images
              </Button>
            </motion.div>
          )}

          {/* Step 2: Images */}
          {step === 2 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-4"
            >
              <Card>
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <ImagePlus className="h-5 w-5 text-primary" />
                    <h2 className="font-bold text-lg">Product Images</h2>
                  </div>

                  {/* Image Preview */}
                  {imageUrl1 && (
                    <div className="w-full h-48 rounded-xl overflow-hidden bg-muted">
                      <img src={imageUrl1} alt="Preview" className="w-full h-full object-cover" onError={(e) => (e.currentTarget.style.display = "none")} />
                    </div>
                  )}

                  <div className="space-y-3">
                    <Input value={imageUrl1} onChange={(e) => setImageUrl1(e.target.value)} placeholder="📸 Primary Image URL *" className="h-12" />
                    <Input value={imageUrl2} onChange={(e) => setImageUrl2(e.target.value)} placeholder="📸 Image 2 (Optional)" />
                    <Input value={imageUrl3} onChange={(e) => setImageUrl3(e.target.value)} placeholder="📸 Image 3 (Optional)" />
                    <Input value={imageUrl4} onChange={(e) => setImageUrl4(e.target.value)} placeholder="📸 Image 4 (Optional)" />
                  </div>
                  <p className="text-xs text-muted-foreground">First non-empty URL is used as primary image</p>
                </CardContent>
              </Card>

              <div className="flex gap-3">
                <Button type="button" variant="outline" className="flex-1 h-12" onClick={() => setStep(1)}>Back</Button>
                <Button type="button" className="flex-1 h-12" onClick={() => setStep(3)}>Continue</Button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Category & Settings */}
          {step === 3 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-4"
            >
              <Card>
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Box className="h-5 w-5 text-primary" />
                    <h2 className="font-bold text-lg">Category & Settings</h2>
                  </div>

                  <div className="space-y-2">
                    <Label>Category Type *</Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger className="h-12">
                        <SelectValue placeholder="Select category..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="General">
                          <span className="flex items-center gap-2"><Package className="h-4 w-4" /> General</span>
                        </SelectItem>
                        {GAME_CATEGORIES.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            <span className="flex items-center gap-2"><Gamepad2 className="h-4 w-4 text-primary" /> {cat.name}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Physical Category</Label>
                    <Select value={physicalCategoryId} onValueChange={setPhysicalCategoryId}>
                      <SelectTrigger className="h-12">
                        <SelectValue placeholder="Optional..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {physicalCategories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Stock</Label>
                      <Input type="number" value={stockQuantity} onChange={(e) => setStockQuantity(e.target.value)} min="0" className="h-12" />
                    </div>
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Select value={status} onValueChange={setStatus}>
                        <SelectTrigger className="h-12">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="available"><span className="flex items-center gap-2"><Eye className="h-3.5 w-3.5" /> Available</span></SelectItem>
                          <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                          <SelectItem value="hidden">Hidden</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-xl border">
                    <Switch id="is_premium" checked={isPremium} onCheckedChange={setIsPremium} />
                    <Label htmlFor="is_premium" className="flex items-center gap-2 cursor-pointer">
                      <Crown className="h-4 w-4 text-amber-500" />
                      <div>
                        <span className="font-medium">Premium Only</span>
                        <p className="text-xs text-muted-foreground">Premium members only</p>
                      </div>
                    </Label>
                  </div>
                </CardContent>
              </Card>

              {/* Summary Preview */}
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="p-4">
                  <h3 className="font-semibold text-sm mb-2">Preview</h3>
                  <div className="flex items-center gap-3">
                    {(imageUrl1 || imageUrl2) && (
                      <div className="w-14 h-14 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                        <img src={imageUrl1 || imageUrl2} alt="" className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div>
                      <p className="font-bold text-sm">{name || "Product Name"}</p>
                      <p className="text-primary font-bold">{price ? `${Number(price).toLocaleString()} MMK` : "—"}</p>
                      {pointsValue && <p className="text-xs text-amber-500">+{pointsValue} coins</p>}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex gap-3">
                <Button type="button" variant="outline" className="flex-1 h-12" onClick={() => setStep(2)}>Back</Button>
                <Button type="submit" className="flex-1 h-12 text-base" disabled={loading}>
                  {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Creating...</> : "Create Product"}
                </Button>
              </div>
            </motion.div>
          )}
        </form>
      </div>
    </MobileLayout>
  );
};

export default ProductNew;
