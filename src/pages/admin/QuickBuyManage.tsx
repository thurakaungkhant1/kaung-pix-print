import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Plus, Edit, Trash2, Zap, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { cn } from "@/lib/utils";
import MobileLayout from "@/components/MobileLayout";

interface QuickBuyItem {
  id: string;
  name: string;
  description: string | null;
  duration_months: number;
  price_points: number;
  price_mmk: number | null;
  is_active: boolean;
  plan_type: string;
  badge_text: string | null;
}

const QuickBuyManage = () => {
  const [items, setItems] = useState<QuickBuyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<QuickBuyItem | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    price_points: "",
    price_mmk: "",
    badge_text: "",
    is_active: true,
  });
  const { isAdmin } = useAdminCheck({ redirectTo: "/", redirectOnFail: true });
  const { toast } = useToast();
  const navigate = useNavigate();

  const loadItems = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("premium_plans")
      .select("*")
      .eq("plan_type", "microtransaction")
      .order("price_points", { ascending: true });

    if (data) {
      setItems(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isAdmin) {
      loadItems();
    }
  }, [isAdmin]);

  const resetForm = () => {
    setForm({
      name: "",
      description: "",
      price_points: "",
      price_mmk: "",
      badge_text: "",
      is_active: true,
    });
    setEditingItem(null);
  };

  const openEditDialog = (item: QuickBuyItem) => {
    setEditingItem(item);
    setForm({
      name: item.name,
      description: item.description || "",
      price_points: item.price_points.toString(),
      price_mmk: item.price_mmk?.toString() || "",
      badge_text: item.badge_text || "",
      is_active: item.is_active,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.name || !form.price_points) {
      toast({ title: "Error", description: "Name and price are required", variant: "destructive" });
      return;
    }

    const itemData = {
      name: form.name,
      description: form.description || null,
      duration_months: 0, // Quick buy items don't have duration
      price_points: parseInt(form.price_points),
      price_mmk: form.price_mmk ? parseFloat(form.price_mmk) : null,
      plan_type: "microtransaction",
      badge_text: form.badge_text || null,
      is_active: form.is_active,
    };

    if (editingItem) {
      const { error } = await supabase
        .from("premium_plans")
        .update(itemData)
        .eq("id", editingItem.id);

      if (error) {
        toast({ title: "Error", description: "Failed to update item", variant: "destructive" });
      } else {
        toast({ title: "Success", description: "Item updated successfully" });
        loadItems();
      }
    } else {
      const { error } = await supabase
        .from("premium_plans")
        .insert(itemData);

      if (error) {
        toast({ title: "Error", description: "Failed to create item", variant: "destructive" });
      } else {
        toast({ title: "Success", description: "Item created successfully" });
        loadItems();
      }
    }

    setDialogOpen(false);
    resetForm();
  };

  const handleDelete = async () => {
    if (!editingItem) return;

    const { error } = await supabase
      .from("premium_plans")
      .delete()
      .eq("id", editingItem.id);

    if (error) {
      toast({ title: "Error", description: "Failed to delete item", variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Item deleted" });
      loadItems();
    }

    setDeleteDialogOpen(false);
    setEditingItem(null);
  };

  const toggleActive = async (item: QuickBuyItem) => {
    const { error } = await supabase
      .from("premium_plans")
      .update({ is_active: !item.is_active })
      .eq("id", item.id);

    if (!error) {
      loadItems();
    }
  };

  if (!isAdmin) return null;

  return (
    <MobileLayout>
      <div className="min-h-screen bg-background pb-8">
        <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
          <div className="flex items-center gap-4 p-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-xl font-semibold">Quick Buy Items</h1>
              <p className="text-sm text-muted-foreground">One-time digital purchases</p>
            </div>
            <Button variant="outline" size="icon" onClick={loadItems}>
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </Button>
            <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </div>
        </header>

        <div className="p-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Zap className="h-5 w-5 text-blue-500" />
                Quick Buy Items
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Points</TableHead>
                      <TableHead>MMK</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No quick buy items yet
                        </TableCell>
                      </TableRow>
                    ) : (
                      items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{item.name}</span>
                              {item.badge_text && (
                                <Badge variant="secondary" className="text-xs">
                                  {item.badge_text}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate text-muted-foreground">
                            {item.description || "-"}
                          </TableCell>
                          <TableCell>{item.price_points.toLocaleString()}</TableCell>
                          <TableCell>{item.price_mmk?.toLocaleString() || "-"}</TableCell>
                          <TableCell>
                            <Switch
                              checked={item.is_active}
                              onCheckedChange={() => toggleActive(item)}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button variant="ghost" size="icon" onClick={() => openEditDialog(item)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => { setEditingItem(item); setDeleteDialogOpen(true); }}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Add/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingItem ? "Edit Item" : "Add New Quick Buy Item"}</DialogTitle>
              <DialogDescription>
                {editingItem ? "Update the item details" : "Create a new one-time purchase item"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Name *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g., 100 Bonus Points"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="What does this item include?"
                  className="mt-1"
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Price (Points) *</Label>
                  <Input
                    type="number"
                    value={form.price_points}
                    onChange={(e) => setForm({ ...form, price_points: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Price (MMK)</Label>
                  <Input
                    type="number"
                    value={form.price_mmk}
                    onChange={(e) => setForm({ ...form, price_mmk: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>
              <div>
                <Label>Badge Text (Optional)</Label>
                <Input
                  value={form.badge_text}
                  onChange={(e) => setForm({ ...form, badge_text: e.target.value })}
                  placeholder="e.g., Popular, Best Value"
                  className="mt-1"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Active</Label>
                <Switch
                  checked={form.is_active}
                  onCheckedChange={(checked) => setForm({ ...form, is_active: checked })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSubmit}>{editingItem ? "Update" : "Create"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-destructive">Delete Item</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete "{editingItem?.name}"? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
              <Button variant="destructive" onClick={handleDelete}>Delete</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MobileLayout>
  );
};

export default QuickBuyManage;
