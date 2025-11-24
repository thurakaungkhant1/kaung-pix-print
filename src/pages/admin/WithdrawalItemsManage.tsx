import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Pencil, Trash2, Coins } from "lucide-react";
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

interface WithdrawalItem {
  id: string;
  name: string;
  description: string | null;
  points_required: number;
  value_amount: number;
  image_url: string | null;
  is_active: boolean;
}

const WithdrawalItemsManage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [items, setItems] = useState<WithdrawalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<WithdrawalItem | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    points_required: "",
    value_amount: "",
    image_url: "",
    is_active: true,
  });

  useEffect(() => {
    if (user) {
      checkAdmin();
      loadItems();
    }
  }, [user]);

  const checkAdmin = async () => {
    if (!user) return;

    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (data?.role !== "admin") {
      navigate("/");
    }
  };

  const loadItems = async () => {
    const { data, error } = await supabase
      .from("withdrawal_items")
      .select("*")
      .order("points_required", { ascending: true });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load withdrawal items",
        variant: "destructive",
      });
      return;
    }

    setItems(data || []);
    setLoading(false);
  };

  const handleOpenDialog = (item?: WithdrawalItem) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        name: item.name,
        description: item.description || "",
        points_required: item.points_required.toString(),
        value_amount: item.value_amount.toString(),
        image_url: item.image_url || "",
        is_active: item.is_active,
      });
    } else {
      setEditingItem(null);
      setFormData({
        name: "",
        description: "",
        points_required: "",
        value_amount: "",
        image_url: "",
        is_active: true,
      });
    }
    setShowDialog(true);
  };

  const handleCloseDialog = () => {
    setShowDialog(false);
    setEditingItem(null);
    setFormData({
      name: "",
      description: "",
      points_required: "",
      value_amount: "",
      image_url: "",
      is_active: true,
    });
  };

  const handleSave = async () => {
    if (!formData.name || !formData.points_required || !formData.value_amount) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const itemData = {
      name: formData.name,
      description: formData.description || null,
      points_required: parseInt(formData.points_required),
      value_amount: parseFloat(formData.value_amount),
      image_url: formData.image_url || null,
      is_active: formData.is_active,
    };

    let error;

    if (editingItem) {
      const { error: updateError } = await supabase
        .from("withdrawal_items")
        .update(itemData)
        .eq("id", editingItem.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase
        .from("withdrawal_items")
        .insert(itemData);
      error = insertError;
    }

    if (error) {
      toast({
        title: "Error",
        description: `Failed to ${editingItem ? "update" : "create"} withdrawal item`,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Success",
      description: `Withdrawal item ${editingItem ? "updated" : "created"} successfully`,
    });

    handleCloseDialog();
    loadItems();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this withdrawal item?")) {
      return;
    }

    const { error } = await supabase
      .from("withdrawal_items")
      .delete()
      .eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete withdrawal item",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Success",
      description: "Withdrawal item deleted successfully",
    });

    loadItems();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-7xl mx-auto p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/admin")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold">Manage Exchange Items</h1>
            <p className="text-muted-foreground">Configure available withdrawal/exchange options</p>
          </div>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="mr-2 h-4 w-4" />
            Add Item
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Exchange Items</CardTitle>
            <CardDescription>
              Manage the items users can exchange their points for
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Points Required</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No exchange items found
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="max-w-xs truncate">
                        {item.description || "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Coins className="h-4 w-4 text-primary" />
                          {item.points_required.toLocaleString()}
                        </div>
                      </TableCell>
                      <TableCell>${item.value_amount}</TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            item.is_active
                              ? "bg-primary/10 text-primary"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {item.is_active ? "Active" : "Inactive"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDialog(item)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Add/Edit Dialog */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingItem ? "Edit Exchange Item" : "Add Exchange Item"}
              </DialogTitle>
              <DialogDescription>
                {editingItem
                  ? "Update the exchange item details"
                  : "Create a new exchange item for users"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Cash - $10"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Exchange 1000 points for $10 cash"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="points_required">Points Required *</Label>
                  <Input
                    id="points_required"
                    type="number"
                    value={formData.points_required}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        points_required: e.target.value,
                      })
                    }
                    placeholder="1000"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="value_amount">Value Amount ($) *</Label>
                  <Input
                    id="value_amount"
                    type="number"
                    step="0.01"
                    value={formData.value_amount}
                    onChange={(e) =>
                      setFormData({ ...formData, value_amount: e.target.value })
                    }
                    placeholder="10.00"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="image_url">Image URL (optional)</Label>
                <Input
                  id="image_url"
                  value={formData.image_url}
                  onChange={(e) =>
                    setFormData({ ...formData, image_url: e.target.value })
                  }
                  placeholder="https://example.com/image.jpg"
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="is_active">Active</Label>
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, is_active: checked })
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button onClick={handleSave}>
                {editingItem ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default WithdrawalItemsManage;