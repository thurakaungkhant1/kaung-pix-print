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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, Trash2, Edit, Save, X, Plus, Package, Loader2, ImageIcon, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import MobileLayout from "@/components/MobileLayout";

interface Category {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
}

const PhysicalCategoriesManage = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ 
    name: "", 
    description: "", 
    image_url: "",
    display_order: 0, 
    is_active: true 
  });
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newCategory, setNewCategory] = useState({ 
    name: "", 
    description: "", 
    image_url: "",
    display_order: 0, 
    is_active: true 
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
    const { data } = await supabase
      .from("physical_categories")
      .select("*")
      .order("display_order", { ascending: true });

    if (data) {
      setCategories(data);
    }
    setLoading(false);
  };

  const startEdit = (category: Category) => {
    setEditingId(category.id);
    setEditForm({
      name: category.name,
      description: category.description || "",
      image_url: category.image_url || "",
      display_order: category.display_order || 0,
      is_active: category.is_active,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ name: "", description: "", image_url: "", display_order: 0, is_active: true });
  };

  const saveEdit = async () => {
    if (!editForm.name.trim()) {
      toast({
        title: "Error",
        description: "Category name is required",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase
      .from("physical_categories")
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
      .from("physical_categories")
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
      setNewCategory({ name: "", description: "", image_url: "", display_order: 0, is_active: true });
      setIsAddDialogOpen(false);
      loadCategories();
    }
  };

  const deleteCategory = async (id: string) => {
    if (!confirm("Are you sure you want to delete this category? Products using this category will be uncategorized.")) return;

    const { error } = await supabase
      .from("physical_categories")
      .delete()
      .eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete category",
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

  const CategoryForm = ({ 
    form, 
    setForm, 
    onSave, 
    onCancel,
    isLoading,
    submitLabel 
  }: {
    form: typeof newCategory;
    setForm: (form: typeof newCategory) => void;
    onSave: () => void;
    onCancel?: () => void;
    isLoading?: boolean;
    submitLabel: string;
  }) => (
    <div className="space-y-4">
      <div>
        <Label>Category Name *</Label>
        <Input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="e.g., Electronics, Gaming Gear"
        />
      </div>
      <div>
        <Label>Description</Label>
        <Textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="Brief description of the category"
          rows={2}
        />
      </div>
      <div>
        <Label>Image URL</Label>
        <Input
          value={form.image_url}
          onChange={(e) => setForm({ ...form, image_url: e.target.value })}
          placeholder="https://example.com/image.jpg"
        />
      </div>
      <div>
        <Label>Display Order</Label>
        <Input
          type="number"
          value={form.display_order}
          onChange={(e) => setForm({ ...form, display_order: parseInt(e.target.value) || 0 })}
          min="0"
        />
      </div>
      <div className="flex items-center gap-3">
        <Switch
          checked={form.is_active}
          onCheckedChange={(checked) => setForm({ ...form, is_active: checked })}
        />
        <Label>Active</Label>
      </div>
      <div className="flex gap-2">
        <Button onClick={onSave} disabled={isLoading} className="flex-1">
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              {submitLabel}
            </>
          )}
        </Button>
        {onCancel && (
          <Button onClick={onCancel} variant="outline" className="flex-1">
            <X className="mr-2 h-4 w-4" />
            Cancel
          </Button>
        )}
      </div>
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
            <h1 className="text-xl font-bold">Physical Categories</h1>
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
          <div className="flex-1">
            <h1 className="text-xl font-bold">Physical Categories</h1>
            <p className="text-sm text-primary-foreground/70">{categories.length} categories</p>
          </div>
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
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Physical Category</DialogTitle>
            </DialogHeader>
            <CategoryForm
              form={newCategory}
              setForm={setNewCategory}
              onSave={addCategory}
              isLoading={isSubmitting}
              submitLabel="Add Category"
            />
          </DialogContent>
        </Dialog>

        {/* Categories List */}
        <div className="grid gap-4">
          {categories.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium">No categories yet</p>
                <p className="text-sm mt-1">Add your first physical product category</p>
              </CardContent>
            </Card>
          ) : (
            categories.map((category) => (
              <Card key={category.id} className={!category.is_active ? "opacity-60" : ""}>
                {editingId === category.id ? (
                  <CardContent className="p-4">
                    <CategoryForm
                      form={editForm}
                      setForm={setEditForm}
                      onSave={saveEdit}
                      onCancel={cancelEdit}
                      submitLabel="Save Changes"
                    />
                  </CardContent>
                ) : (
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      {category.image_url ? (
                        <div className="w-14 h-14 rounded-xl overflow-hidden bg-muted">
                          <img 
                            src={category.image_url} 
                            alt={category.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-14 h-14 rounded-xl bg-secondary flex items-center justify-center">
                          <Package className="h-6 w-6 text-secondary-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold truncate">{category.name}</h3>
                          {!category.is_active && (
                            <Badge variant="secondary" className="text-xs">Inactive</Badge>
                          )}
                        </div>
                        {category.description && (
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {category.description}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          Order: {category.display_order}
                        </p>
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

export default PhysicalCategoriesManage;
