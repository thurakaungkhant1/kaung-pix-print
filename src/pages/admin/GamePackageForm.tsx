import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Gem } from "lucide-react";

const GamePackageForm = () => {
  const { id, categoryKey = "" } = useParams();
  const category = decodeURIComponent(categoryKey);
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [gameName, setGameName] = useState(category);
  const [gameImage, setGameImage] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    price: "",
    cost_price: "0",
    description: "",
    image_url: "",
    points_value: "0",
    smile_package_id: "",
  });

  const listPath = `/admin/game-packages/${encodeURIComponent(category)}`;

  useEffect(() => {
    loadGame();
    if (id) loadPackage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, category]);

  const loadGame = async () => {
    const { data } = await (supabase as any)
      .from("game_catalog")
      .select("name,image_url")
      .eq("category_key", category)
      .maybeSingle();
    if (data?.name) setGameName(data.name);
    if (data?.image_url) setGameImage(data.image_url);
  };

  const loadPackage = async () => {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("id", parseInt(id!))
      .single();

    if (error) {
      toast({ title: "Error loading package", description: error.message, variant: "destructive" });
    } else if (data) {
      setFormData({
        name: data.name,
        price: data.price.toString(),
        cost_price: (data.cost_price ?? 0).toString(),
        description: data.description || "",
        image_url: data.image_url,
        points_value: data.points_value.toString(),
        smile_package_id: (data as any).smile_package_id || "",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const packageData: Record<string, unknown> = {
      name: formData.name,
      price: parseFloat(formData.price) || 0,
      cost_price: parseFloat(formData.cost_price) || 0,
      description: formData.description || null,
      image_url: formData.image_url || gameImage || "/placeholder.svg",
      points_value: parseInt(formData.points_value) || 0,
      smile_package_id: formData.smile_package_id.trim() || null,
      category,
    };

    let error;
    if (id) {
      const result = await supabase.from("products").update(packageData as any).eq("id", parseInt(id));
      error = result.error;
    } else {
      const result = await supabase.from("products").insert([packageData as any]);
      error = result.error;
    }

    if (error) {
      toast({ title: "Error saving package", description: error.message, variant: "destructive" });
    } else {
      toast({
        title: id ? "Package updated" : "Package created",
        description: `${gameName} package has been ${id ? "updated" : "created"} successfully`,
      });
      navigate(listPath);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="bg-gradient-primary text-primary-foreground p-4 sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(listPath)}
            className="hover:bg-primary-foreground/10"
          >
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <div className="flex items-center gap-2 min-w-0">
            <Gem className="h-6 w-6 shrink-0" />
            <h1 className="text-xl font-bold truncate">
              {id ? "Edit" : "New"} {gameName} Package
            </h1>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto p-4">
        <Card>
          <CardHeader>
            <CardTitle>Package Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Package Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., 86 Diamonds, 325 UC"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="price">Price (Kyat) *</Label>
                <Input
                  id="price"
                  type="number"
                  step="1"
                  placeholder="5000"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="cost_price">Cost Price (Kyat)</Label>
                <Input
                  id="cost_price"
                  type="number"
                  step="1"
                  placeholder="0"
                  value={formData.cost_price}
                  onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
                />
                <p className="text-sm text-muted-foreground mt-1">Used for profit reporting</p>
              </div>
              <div>
                <Label htmlFor="points_value">Bonus Coins</Label>
                <Input
                  id="points_value"
                  type="number"
                  placeholder="0"
                  value={formData.points_value}
                  onChange={(e) => setFormData({ ...formData, points_value: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="image_url">Image URL</Label>
                <Input
                  id="image_url"
                  placeholder="https://... (leave empty to use the game image)"
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                />
                {(formData.image_url || gameImage) && (
                  <img
                    src={formData.image_url || gameImage}
                    alt="preview"
                    className="mt-2 h-16 w-16 rounded-lg object-cover"
                  />
                )}
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Package description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="smile_package_id">Smile.One Package ID (optional)</Label>
                <Input
                  id="smile_package_id"
                  placeholder="Leave empty for manual fulfilment"
                  value={formData.smile_package_id}
                  onChange={(e) => setFormData({ ...formData, smile_package_id: e.target.value })}
                />
              </div>
              <div className="flex gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => navigate(listPath)} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? "Saving..." : id ? "Update Package" : "Create Package"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default GamePackageForm;
