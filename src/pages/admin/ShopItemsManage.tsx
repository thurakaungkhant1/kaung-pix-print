import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Plus, Pencil, Trash2, Loader2, Search, Crown, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import MobileLayout from "@/components/MobileLayout";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Category {
  id: string;
  name: string;
}

interface ShopItem {
  id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  price_mmk: number;
  price_points: number;
  image_url: string | null;
  is_premium: boolean;
  is_active: boolean;
  stock_quantity: number | null;
  created_at: string;
  shop_categories: { name: string } | null;
}

const ShopItemsManage = () => {
  const [items, setItems] = useState<ShopItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ShopItem | null>(null);
  const [saving, setSaving] = useState(false);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  
  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [priceMmk, setPriceMmk] = useState("");
  const [pricePoints, setPricePoints] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [stockQuantity, setStockQuantity] = useState("");
  const [isPremium, setIsPremium] = useState(false);
  const [isActive, setIsActive] = useState(true);

  const { isAdmin } = useAdminCheck({ redirectTo: "/", redirectOnFail: true });
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAdmin) {
      loadItems();
      loadCategories();
    }
  }, [isAdmin]);

  const loadCategories = async () => {
    const { data } = await supabase
      .from("shop_categories")
      .select("id, name")
      .eq("is_active", true)
      .order("display_order");
    setCategories(data || []);
  };

  const loadItems = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("shop_items")
      .select(`*, shop_categories(name)`)
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Error", description: "Failed to load items", variant: "destructive" });
    } else {
      setItems(data || []);
    }
    setLoading(false);
  };

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!item.name.toLowerCase().includes(query) &&
            !(item.description?.toLowerCase().includes(query))) {
          return false;
        }
      }
      if (categoryFilter !== "all" && item.category_id !== categoryFilter) {
        return false;
      }
      if (statusFilter === "active" && !item.is_active) return false;
      if (statusFilter === "inactive" && item.is_active) return false;
      if (statusFilter === "premium" && !item.is_premium) return false;
      return true;
    });
  }, [items, searchQuery, categoryFilter, statusFilter]);

  const openNewDialog = () => {
    setSelectedItem(null);
    setName("");
    setDescription("");
    setCategoryId("");
    setPriceMmk("");
    setPricePoints("");
    setImageUrl("");
    setStockQuantity("");
    setIsPremium(false);
    setIsActive(true);
    setDialogOpen(true);
  };

  const openEditDialog = (item: ShopItem) => {
    setSelectedItem(item);
    setName(item.name);
    setDescription(item.description || "");
    setCategoryId(item.category_id || "");
    setPriceMmk(item.price_mmk.toString());
    setPricePoints(item.price_points.toString());
    setImageUrl(item.image_url || "");
    setStockQuantity(item.stock_quantity?.toString() || "");
    setIsPremium(item.is_premium);
    setIsActive(item.is_active);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast({ title: "Error", description: "Item name is required", variant: "destructive" });
      return;
    }

    setSaving(true);

    const itemData = {
      name: name.trim(),
      description: description.trim() || null,
      category_id: categoryId || null,
      price_mmk: parseFloat(priceMmk) || 0,
      price_points: parseInt(pricePoints) || 0,
      image_url: imageUrl.trim() || null,
      stock_quantity: stockQuantity ? parseInt(stockQuantity) : null,
      is_premium: isPremium,
      is_active: isActive,
    };

    if (selectedItem) {
      const { error } = await supabase
        .from("shop_items")
        .update(itemData)
        .eq("id", selectedItem.id);

      if (error) {
        toast({ title: "Error", description: "Failed to update item", variant: "destructive" });
      } else {
        toast({ title: "Success", description: "Item updated" });
        setDialogOpen(false);
        loadItems();
      }
    } else {
      const { error } = await supabase
        .from("shop_items")
        .insert(itemData);

      if (error) {
        toast({ title: "Error", description: "Failed to create item", variant: "destructive" });
      } else {
        toast({ title: "Success", description: "Item created" });
        setDialogOpen(false);
        loadItems();
      }
    }

    setSaving(false);
  };

  const handleDelete = async () => {
    if (!selectedItem) return;

    const { error } = await supabase
      .from("shop_items")
      .delete()
      .eq("id", selectedItem.id);

    if (error) {
      toast({ title: "Error", description: "Failed to delete item", variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Item deleted" });
      setDeleteDialogOpen(false);
      setSelectedItem(null);
      loadItems();
    }
  };

  if (!isAdmin) return null;

  return (
    <MobileLayout className="pb-8">
      <header className="bg-gradient-primary text-primary-foreground p-4 sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate("/admin")}>
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h1 className="text-xl font-bold">Shop Items</h1>
          <Badge variant="secondary" className="ml-auto">
            {filteredItems.length}/{items.length}
          </Badge>
        </div>
      </header>

      {/* Search & Filters */}
      <div className="sticky top-[60px] z-30 bg-background border-b p-3 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="premium">Premium</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="p-4">
        <Button onClick={openNewDialog} className="w-full mb-4">
          <Plus className="h-4 w-4 mr-2" />
          Add Item
        </Button>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            {items.length === 0 ? "No items yet. Create your first one!" : "No items match your filters."}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredItems.map((item) => (
              <Card key={item.id} className={!item.is_active ? "opacity-60" : ""}>
                <CardContent className="p-4">
                  <div className="flex gap-3">
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-16 h-16 object-cover rounded-lg"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center">
                        <span className="text-2xl">📦</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold truncate">{item.name}</h3>
                        {item.is_premium && (
                          <Badge className="bg-amber-500">
                            <Crown className="h-3 w-3 mr-1" />
                            Premium
                          </Badge>
                        )}
                        {!item.is_active && (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {item.shop_categories?.name || "Uncategorized"}
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-sm">
                        <span className="font-bold text-primary">
                          {item.price_mmk.toLocaleString()} MMK
                        </span>
                        <span className="text-amber-600">
                          {item.price_points.toLocaleString()} pts
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setSelectedItem(item);
                          setPreviewOpen(true);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(item)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setSelectedItem(item);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedItem ? "Edit Item" : "New Item"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Item name"
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Item description..."
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="category">Category</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="priceMmk">Price (MMK)</Label>
                <Input
                  id="priceMmk"
                  type="number"
                  value={priceMmk}
                  onChange={(e) => setPriceMmk(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div>
                <Label htmlFor="pricePoints">Price (Points)</Label>
                <Input
                  id="pricePoints"
                  type="number"
                  value={pricePoints}
                  onChange={(e) => setPricePoints(e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="imageUrl">Image URL</Label>
              <Input
                id="imageUrl"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://..."
              />
              {imageUrl && (
                <img
                  src={imageUrl}
                  alt="Preview"
                  className="mt-2 w-full h-32 object-cover rounded-lg"
                  onError={(e) => (e.currentTarget.style.display = "none")}
                />
              )}
            </div>
            <div>
              <Label htmlFor="stock">Stock Quantity (leave empty for unlimited)</Label>
              <Input
                id="stock"
                type="number"
                value={stockQuantity}
                onChange={(e) => setStockQuantity(e.target.value)}
                placeholder="Unlimited"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="premium">Premium Item</Label>
              <Switch
                id="premium"
                checked={isPremium}
                onCheckedChange={setIsPremium}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="active">Active</Label>
              <Switch
                id="active"
                checked={isActive}
                onCheckedChange={setIsActive}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {selectedItem ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Item Preview</DialogTitle>
          </DialogHeader>
          {selectedItem && (
            <Card className="overflow-hidden">
              {selectedItem.image_url ? (
                <img
                  src={selectedItem.image_url}
                  alt={selectedItem.name}
                  className="w-full h-48 object-cover"
                />
              ) : (
                <div className="w-full h-48 bg-muted flex items-center justify-center">
                  <span className="text-6xl">📦</span>
                </div>
              )}
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-bold text-lg">{selectedItem.name}</h3>
                  {selectedItem.is_premium && (
                    <Badge className="bg-amber-500">
                      <Crown className="h-3 w-3 mr-1" />
                      Premium
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  {selectedItem.description || "No description"}
                </p>
                <div className="flex items-center gap-4">
                  <span className="text-xl font-bold text-primary">
                    {selectedItem.price_mmk.toLocaleString()} MMK
                  </span>
                  <span className="text-amber-600 font-semibold">
                    or {selectedItem.price_points.toLocaleString()} pts
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedItem?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MobileLayout>
  );
};

export default ShopItemsManage;