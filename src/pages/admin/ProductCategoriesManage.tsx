import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, Trash2, Edit, Save, X, Plus, Gamepad2, Package, Smartphone, FolderOpen, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import MobileLayout from "@/components/MobileLayout";

interface Category {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  display_order: number | null;
  is_active: boolean;
  category_type?: string;
}

const ICON_OPTIONS = [
  { value: "gamepad", label: "Game", icon: Gamepad2 },
  { value: "package", label: "Physical", icon: Package },
  { value: "smartphone", label: "Mobile", icon: Smartphone },
  { value: "folder", label: "General", icon: FolderOpen },
];

// Define which product categories are considered "game" categories
const GAME_KEYWORDS = ["diamond", "game", "mobile legends", "pubg", "free fire", "genshin", "top-up", "topup"];

const ProductCategoriesManage = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", description: "", icon: "folder", display_order: 0, is_active: true });
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"physical" | "game">("physical");
  const [newCategory, setNewCategory] = useState({ 
    name: "", 
    description: "", 
    icon: "package", 
    display_order: 0, 
    is_active: true,
    category_type: "physical"
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    checkAdmin();
    loadCategories();
  }, [user]);

  const checkAdmin = async () => {
    if (!user) {
      navigate("/");
      return;
    }

    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!data) {
      navigate("/");
    }
  };

  const loadCategories = async () => {
    setLoading(true);
    // Get unique categories from products table
    const { data: products } = await supabase
      .from("products")
      .select("category")
      .order("category");

    if (products) {
      const uniqueCategories = [...new Set(products.map(p => p.category))];
      const categorizedList: Category[] = uniqueCategories.map((cat, index) => ({
        id: cat,
        name: cat,
        description: null,
        icon: isGameCategory(cat) ? "gamepad" : "package",
        display_order: index,
        is_active: true,
        category_type: isGameCategory(cat) ? "game" : "physical"
      }));
      setCategories(categorizedList);
    }
    setLoading(false);
  };

  const isGameCategory = (categoryName: string): boolean => {
    const lowerName = categoryName.toLowerCase();
    return GAME_KEYWORDS.some(keyword => lowerName.includes(keyword));
  };

  const physicalCategories = categories.filter(c => c.category_type === "physical");
  const gameCategories = categories.filter(c => c.category_type === "game");

  const getProductCount = async (category: string): Promise<number> => {
    const { count } = await supabase
      .from("products")
      .select("*", { count: "exact", head: true })
      .eq("category", category);
    return count || 0;
  };

  const renameCategory = async (oldName: string, newName: string) => {
    if (!newName.trim() || newName === oldName) return;

    const { error } = await supabase
      .from("products")
      .update({ category: newName })
      .eq("category", oldName);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to rename category",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Category renamed successfully",
      });
      loadCategories();
    }
    setEditingId(null);
  };

  const getIconComponent = (iconName: string) => {
    const option = ICON_OPTIONS.find(o => o.value === iconName);
    if (option) {
      const IconComponent = option.icon;
      return <IconComponent className="h-5 w-5" />;
    }
    return <FolderOpen className="h-5 w-5" />;
  };

  const renderCategoryList = (categoryList: Category[], type: "physical" | "game") => (
    <div className="grid gap-4">
      {categoryList.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            {type === "physical" ? (
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
            ) : (
              <Gamepad2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            )}
            <p>No {type} product categories found.</p>
            <p className="text-sm mt-2">Categories are created when you add products.</p>
          </CardContent>
        </Card>
      ) : (
        categoryList.map((category) => (
          <Card key={category.id}>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  type === "physical" 
                    ? "bg-secondary text-secondary-foreground" 
                    : "bg-primary/10 text-primary"
                }`}>
                  {type === "physical" ? (
                    <Package className="h-5 w-5" />
                  ) : (
                    <Gamepad2 className="h-5 w-5" />
                  )}
                </div>
                <div className="flex-1">
                  {editingId === category.id ? (
                    <div className="flex gap-2">
                      <Input
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        className="h-8"
                      />
                      <Button 
                        size="sm" 
                        onClick={() => renameCategory(category.name, editForm.name)}
                      >
                        <Save className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => setEditingId(null)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold">{category.name}</h3>
                        <Badge variant={type === "physical" ? "secondary" : "default"} className="text-xs">
                          {type === "physical" ? "Physical" : "Game"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Click to view products in this category
                      </p>
                    </>
                  )}
                </div>
                {editingId !== category.id && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        setEditingId(category.id);
                        setEditForm({ ...editForm, name: category.name });
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => navigate(`/admin/products?category=${encodeURIComponent(category.name)}`)}
                    >
                      <FolderOpen className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );

  if (loading) {
    return (
      <MobileLayout className="pb-8">
        <header className="bg-gradient-primary text-primary-foreground p-4 sticky top-0 z-40">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate("/admin")}>
              <ArrowLeft className="h-6 w-6" />
            </button>
            <h1 className="text-xl font-bold">Product Categories</h1>
          </div>
        </header>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout className="pb-8">
      <header className="bg-gradient-primary text-primary-foreground p-4 sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate("/admin")}>
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h1 className="text-xl font-bold">Product Categories</h1>
        </div>
      </header>

      <div className="max-w-screen-xl mx-auto p-4 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="bg-secondary/50 border-secondary">
            <CardContent className="p-4 text-center">
              <Package className="h-8 w-8 mx-auto mb-2 text-secondary-foreground" />
              <p className="text-2xl font-bold">{physicalCategories.length}</p>
              <p className="text-sm text-muted-foreground">Physical Categories</p>
            </CardContent>
          </Card>
          <Card className="bg-primary/10 border-primary/20">
            <CardContent className="p-4 text-center">
              <Gamepad2 className="h-8 w-8 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{gameCategories.length}</p>
              <p className="text-sm text-muted-foreground">Game Categories</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for Physical vs Game */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "physical" | "game")}>
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="physical" className="gap-2">
              <Package className="h-4 w-4" />
              Physical ({physicalCategories.length})
            </TabsTrigger>
            <TabsTrigger value="game" className="gap-2">
              <Gamepad2 className="h-4 w-4" />
              Game ({gameCategories.length})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="physical" className="mt-4">
            <div className="space-y-4">
              <div className="bg-secondary/30 p-4 rounded-lg border border-secondary">
                <h3 className="font-semibold flex items-center gap-2 mb-2">
                  <Package className="h-4 w-4" />
                  Physical Product Categories
                </h3>
                <p className="text-sm text-muted-foreground">
                  Manage categories for physical goods like gadgets, accessories, and merchandise.
                </p>
              </div>
              {renderCategoryList(physicalCategories, "physical")}
            </div>
          </TabsContent>
          
          <TabsContent value="game" className="mt-4">
            <div className="space-y-4">
              <div className="bg-primary/10 p-4 rounded-lg border border-primary/20">
                <h3 className="font-semibold flex items-center gap-2 mb-2">
                  <Gamepad2 className="h-4 w-4" />
                  Game/Digital Categories
                </h3>
                <p className="text-sm text-muted-foreground">
                  Manage categories for game top-ups, diamonds, and digital items.
                </p>
              </div>
              {renderCategoryList(gameCategories, "game")}
            </div>
          </TabsContent>
        </Tabs>

        {/* Add Product Button */}
        <Button 
          className="w-full" 
          onClick={() => navigate("/admin/products/new")}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add New Product
        </Button>
      </div>
    </MobileLayout>
  );
};

export default ProductCategoriesManage;
