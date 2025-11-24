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

const DiamondPackageForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    price: "",
    description: "",
    image_url: "",
    points_value: "0",
  });

  useEffect(() => {
    if (id) {
      loadPackage();
    }
  }, [id]);

  const loadPackage = async () => {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("id", parseInt(id!))
      .single();

    if (error) {
      toast({
        title: "Error loading package",
        description: error.message,
        variant: "destructive",
      });
    } else if (data) {
      setFormData({
        name: data.name,
        price: data.price.toString(),
        description: data.description || "",
        image_url: data.image_url,
        points_value: data.points_value.toString(),
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const packageData = {
      name: formData.name,
      price: parseFloat(formData.price),
      description: formData.description || null,
      image_url: formData.image_url,
      points_value: parseInt(formData.points_value),
      category: "MLBB Diamonds",
    };

    let error;
    if (id) {
      const result = await supabase
        .from("products")
        .update(packageData)
        .eq("id", parseInt(id));
      error = result.error;
    } else {
      const result = await supabase.from("products").insert([packageData]);
      error = result.error;
    }

    if (error) {
      toast({
        title: "Error saving package",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: id ? "Package updated" : "Package created",
        description: `Diamond package has been ${id ? "updated" : "created"} successfully`,
      });
      navigate("/admin/diamond-packages");
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
            onClick={() => navigate("/admin/diamond-packages")}
            className="hover:bg-primary-foreground/10"
          >
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <div className="flex items-center gap-2">
            <Gem className="h-6 w-6" />
            <h1 className="text-2xl font-bold">
              {id ? "Edit" : "New"} Diamond Package
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
                  placeholder="e.g., 100 Diamonds, 500 Diamonds"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Include the diamond quantity in the name
                </p>
              </div>

              <div>
                <Label htmlFor="price">Price (Kyat) *</Label>
                <Input
                  id="price"
                  type="number"
                  step="1"
                  placeholder="8379"
                  value={formData.price}
                  onChange={(e) =>
                    setFormData({ ...formData, price: e.target.value })
                  }
                  required
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Enter price in Myanmar Kyat (Ks)
                </p>
              </div>

              <div>
                <Label htmlFor="points_value">Bonus Points</Label>
                <Input
                  id="points_value"
                  type="number"
                  placeholder="0"
                  value={formData.points_value}
                  onChange={(e) =>
                    setFormData({ ...formData, points_value: e.target.value })
                  }
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Optional loyalty points users earn when purchasing
                </p>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Package description or special offers"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="image_url">Image URL *</Label>
                <Input
                  id="image_url"
                  type="url"
                  placeholder="https://example.com/diamond-image.jpg"
                  value={formData.image_url}
                  onChange={(e) =>
                    setFormData({ ...formData, image_url: e.target.value })
                  }
                  required
                />
                {formData.image_url && (
                  <div className="mt-2">
                    <img
                      src={formData.image_url}
                      alt="Preview"
                      className="h-32 w-32 object-cover rounded border"
                    />
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/admin/diamond-packages")}
                  className="flex-1"
                >
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

export default DiamondPackageForm;
