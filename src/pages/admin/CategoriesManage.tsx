import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, Trash2, Edit, Save, X, Plus, Gamepad2, Package, Smartphone, FolderOpen } from "lucide-react";
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
}

const ICON_OPTIONS = [
  { value: "gamepad", label: "Game", icon: Gamepad2 },
  { value: "package", label: "Physical", icon: Package },
  { value: "smartphone", label: "Mobile", icon: Smartphone },
  { value: "folder", label: "General", icon: FolderOpen },
];

const CategoriesManage = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", description: "", icon: "folder", display_order: 0, is_active: true });
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newCategory, setNewCategory] = useState({ name: "", description: "", icon: "folder", display_order: 0, is_active: true });
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
    const { data } = await supabase
      .from("shop_categories")
      .select("*")
      .order("display_order", { ascending: true });

    if (data) {
      setCategories(data);
    }
  };

  const startEdit = (category: Category) => {
    setEditingId(category.id);
    setEditForm({
      name: category.name,
      description: category.description || "",
      icon: category.icon || "folder",
      display_order: category.display_order || 0,
      is_active: category.is_active,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ name: "", description: "", icon: "folder", display_order: 0, is_active: true });
  };

  const saveEdit = async () => {
    const { error } = await supabase
      .from("shop_categories")
      .update(editForm)
      .eq("id", editingId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update category",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Category updated successfully",
      });
      cancelEdit();
      loadCategories();
    }
  };

  const addCategory = async () => {
    if (!newCategory.name.trim()) {
      toast({
        title: "Error",
        description: "Category name is required",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    const { error } = await supabase
      .from("shop_categories")
      .insert([newCategory]);

    setIsSubmitting(false);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to add category",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Category added successfully",
      });
      setNewCategory({ name: "", description: "", icon: "folder", display_order: 0, is_active: true });
      setIsAddDialogOpen(false);
      loadCategories();
    }
  };

  const deleteCategory = async (id: string) => {
    if (!confirm("Are you sure you want to delete this category?")) return;

    const { error } = await supabase.from("shop_categories").delete().eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete category. Make sure no products are using this category.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Category deleted successfully",
      });
      loadCategories();
    }
  };

  const getIconComponent = (iconName: string) => {
    const option = ICON_OPTIONS.find(o => o.value === iconName);
    if (option) {
      const IconComponent = option.icon;
      return <IconComponent className="h-5 w-5" />;
    }
    return <FolderOpen className="h-5 w-5" />;
  };

  return (
    <MobileLayout className="pb-8">
      <header className="bg-gradient-primary text-primary-foreground p-4 sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate("/admin")}>
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h1 className="text-xl font-bold">Manage Categories</h1>
        </div>
      </header>

      <div className="max-w-screen-xl mx-auto p-4 space-y-4">
        {/* Add Category Dialog */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full">
              <Plus className="mr-2 h-4 w-4" />
              Add New Category
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Category</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Name</Label>
                <Input
                  value={newCategory.name}
                  onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                  placeholder="Category name"
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={newCategory.description}
                  onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                  placeholder="Category description"
                />
              </div>
              <div>
                <Label>Icon</Label>
                <div className="flex gap-2 mt-2">
                  {ICON_OPTIONS.map((option) => (
                    <Button
                      key={option.value}
                      type="button"
                      variant={newCategory.icon === option.value ? "default" : "outline"}
                      size="icon"
                      onClick={() => setNewCategory({ ...newCategory, icon: option.value })}
                    >
                      <option.icon className="h-4 w-4" />
                    </Button>
                  ))}
                </div>
              </div>
              <div>
                <Label>Display Order</Label>
                <Input
                  type="number"
                  value={newCategory.display_order}
                  onChange={(e) => setNewCategory({ ...newCategory, display_order: parseInt(e.target.value) || 0 })}
                  min="0"
                />
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  checked={newCategory.is_active}
                  onCheckedChange={(checked) => setNewCategory({ ...newCategory, is_active: checked })}
                />
                <Label>Active</Label>
              </div>
              <Button onClick={addCategory} disabled={isSubmitting} className="w-full">
                {isSubmitting ? "Adding..." : "Add Category"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Categories List */}
        <div className="grid gap-4">
          {categories.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <FolderOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No categories found. Add your first category!</p>
              </CardContent>
            </Card>
          ) : (
            categories.map((category) => (
              <Card key={category.id} className={!category.is_active ? "opacity-60" : ""}>
                {editingId === category.id ? (
                  <CardContent className="p-4 space-y-4">
                    <div>
                      <Label>Name</Label>
                      <Input
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Description</Label>
                      <Textarea
                        value={editForm.description}
                        onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Icon</Label>
                      <div className="flex gap-2 mt-2">
                        {ICON_OPTIONS.map((option) => (
                          <Button
                            key={option.value}
                            type="button"
                            variant={editForm.icon === option.value ? "default" : "outline"}
                            size="icon"
                            onClick={() => setEditForm({ ...editForm, icon: option.value })}
                          >
                            <option.icon className="h-4 w-4" />
                          </Button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <Label>Display Order</Label>
                      <Input
                        type="number"
                        value={editForm.display_order}
                        onChange={(e) => setEditForm({ ...editForm, display_order: parseInt(e.target.value) || 0 })}
                        min="0"
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={editForm.is_active}
                        onCheckedChange={(checked) => setEditForm({ ...editForm, is_active: checked })}
                      />
                      <Label>Active</Label>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={saveEdit} className="flex-1">
                        <Save className="mr-2 h-4 w-4" />
                        Save
                      </Button>
                      <Button onClick={cancelEdit} variant="outline" className="flex-1">
                        <X className="mr-2 h-4 w-4" />
                        Cancel
                      </Button>
                    </div>
                  </CardContent>
                ) : (
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                        {getIconComponent(category.icon || "folder")}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold">{category.name}</h3>
                          {!category.is_active && (
                            <Badge variant="secondary" className="text-xs">Inactive</Badge>
                          )}
                        </div>
                        {category.description && (
                          <p className="text-sm text-muted-foreground line-clamp-1">{category.description}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">Order: {category.display_order || 0}</p>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => startEdit(category)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="icon"
                          onClick={() => deleteCategory(category.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            ))
          )}
        </div>
      </div>
    </MobileLayout>
  );
};

export default CategoriesManage;
