import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  ArrowLeft, 
  Plus, 
  Edit, 
  Trash2, 
  Phone, 
  CreditCard, 
  Wallet, 
  Building, 
  Banknote,
  RefreshCw,
  GripVertical
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import MobileLayout from "@/components/MobileLayout";
import { cn } from "@/lib/utils";

interface PaymentMethod {
  id: string;
  name: string;
  account_name: string | null;
  account_number: string;
  icon_name: string;
  gradient_color: string;
  display_order: number;
  is_active: boolean;
}

const iconOptions = [
  { value: "Phone", label: "Phone", icon: Phone },
  { value: "CreditCard", label: "Credit Card", icon: CreditCard },
  { value: "Wallet", label: "Wallet", icon: Wallet },
  { value: "Building", label: "Bank", icon: Building },
  { value: "Banknote", label: "Cash", icon: Banknote },
];

const gradientOptions = [
  { value: "from-blue-500 to-blue-600", label: "Blue" },
  { value: "from-yellow-500 to-orange-500", label: "Orange" },
  { value: "from-emerald-500 to-teal-500", label: "Green" },
  { value: "from-purple-500 to-pink-500", label: "Purple" },
  { value: "from-red-500 to-rose-500", label: "Red" },
  { value: "from-cyan-500 to-blue-500", label: "Cyan" },
];

const PaymentMethodsManage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);
  const [form, setForm] = useState({
    name: "",
    account_name: "",
    account_number: "",
    icon_name: "Phone",
    gradient_color: "from-blue-500 to-blue-600",
  });

  useEffect(() => {
    loadMethods();
  }, []);

  const loadMethods = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("payment_methods")
      .select("*")
      .order("display_order", { ascending: true });

    if (error) {
      toast({ title: "Error", description: "Failed to load payment methods", variant: "destructive" });
    } else {
      setMethods(data || []);
    }
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!form.name || !form.account_number) {
      toast({ title: "Error", description: "Name and account number are required", variant: "destructive" });
      return;
    }

    if (editingMethod) {
      const { error } = await supabase
        .from("payment_methods")
        .update({
          name: form.name,
          account_name: form.account_name || null,
          account_number: form.account_number,
          icon_name: form.icon_name,
          gradient_color: form.gradient_color,
        })
        .eq("id", editingMethod.id);

      if (error) {
        toast({ title: "Error", description: "Failed to update payment method", variant: "destructive" });
      } else {
        toast({ title: "Success", description: "Payment method updated" });
        loadMethods();
      }
    } else {
      const { error } = await supabase
        .from("payment_methods")
        .insert({
          name: form.name,
          account_name: form.account_name || null,
          account_number: form.account_number,
          icon_name: form.icon_name,
          gradient_color: form.gradient_color,
          display_order: methods.length,
        });

      if (error) {
        toast({ title: "Error", description: "Failed to add payment method", variant: "destructive" });
      } else {
        toast({ title: "Success", description: "Payment method added" });
        loadMethods();
      }
    }
    closeDialog();
  };

  const handleDelete = async () => {
    if (!editingMethod) return;

    const { error } = await supabase
      .from("payment_methods")
      .delete()
      .eq("id", editingMethod.id);

    if (error) {
      toast({ title: "Error", description: "Failed to delete payment method", variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Payment method deleted" });
      loadMethods();
    }
    setDeleteDialogOpen(false);
    setEditingMethod(null);
  };

  const toggleActive = async (method: PaymentMethod) => {
    const { error } = await supabase
      .from("payment_methods")
      .update({ is_active: !method.is_active })
      .eq("id", method.id);

    if (error) {
      toast({ title: "Error", description: "Failed to update status", variant: "destructive" });
    } else {
      loadMethods();
    }
  };

  const openEditDialog = (method: PaymentMethod) => {
    setEditingMethod(method);
    setForm({
      name: method.name,
      account_name: method.account_name || "",
      account_number: method.account_number,
      icon_name: method.icon_name,
      gradient_color: method.gradient_color,
    });
    setDialogOpen(true);
  };

  const openAddDialog = () => {
    setEditingMethod(null);
    setForm({
      name: "",
      account_name: "",
      account_number: "",
      icon_name: "Phone",
      gradient_color: "from-blue-500 to-blue-600",
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingMethod(null);
  };

  const getIcon = (iconName: string) => {
    const found = iconOptions.find((i) => i.value === iconName);
    return found ? found.icon : Phone;
  };

  return (
    <MobileLayout className="pb-8">
      <header className="bg-gradient-primary text-primary-foreground p-4 sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate("/admin")}>
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h1 className="text-xl font-bold flex-1">Payment Methods</h1>
          <Button
            variant="ghost"
            size="icon"
            className="text-primary-foreground hover:bg-primary-foreground/10"
            onClick={loadMethods}
          >
            <RefreshCw className={cn("h-5 w-5", loading && "animate-spin")} />
          </Button>
        </div>
      </header>

      <div className="max-w-screen-xl mx-auto p-4 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-2xl font-bold">{methods.length}</p>
              <p className="text-sm text-muted-foreground">Total Methods</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-2xl font-bold text-green-600">
                {methods.filter((m) => m.is_active).length}
              </p>
              <p className="text-sm text-muted-foreground">Active</p>
            </CardContent>
          </Card>
        </div>

        {/* Add Button */}
        <Button onClick={openAddDialog} className="w-full gap-2">
          <Plus className="h-4 w-4" />
          Add Payment Method
        </Button>

        {/* Methods List */}
        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : methods.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No payment methods</div>
          ) : (
            methods.map((method) => {
              const IconComponent = getIcon(method.icon_name);
              return (
                <Card 
                  key={method.id} 
                  className={cn(
                    "transition-all",
                    !method.is_active && "opacity-60"
                  )}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="text-muted-foreground">
                        <GripVertical className="h-5 w-5" />
                      </div>
                      <div className={cn(
                        "p-3 rounded-xl bg-gradient-to-br",
                        method.gradient_color
                      )}>
                        <IconComponent className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold">{method.name}</h3>
                        {method.account_name && (
                          <p className="text-sm text-muted-foreground">{method.account_name}</p>
                        )}
                        <p className="text-sm font-mono text-muted-foreground">
                          {method.account_number}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={method.is_active}
                          onCheckedChange={() => toggleActive(method)}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(method)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          onClick={() => {
                            setEditingMethod(method);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingMethod ? "Edit Payment Method" : "Add Payment Method"}
            </DialogTitle>
            <DialogDescription>
              Configure payment method details
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g., KBZ Pay"
              />
            </div>
            <div>
              <Label>Account Name</Label>
              <Input
                value={form.account_name}
                onChange={(e) => setForm({ ...form, account_name: e.target.value })}
                placeholder="e.g., John Doe"
              />
            </div>
            <div>
              <Label>Account Number *</Label>
              <Input
                value={form.account_number}
                onChange={(e) => setForm({ ...form, account_number: e.target.value })}
                placeholder="e.g., 09xxxxxxxxx"
              />
            </div>
            <div>
              <Label>Icon</Label>
              <Select
                value={form.icon_name}
                onValueChange={(v) => setForm({ ...form, icon_name: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {iconOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <div className="flex items-center gap-2">
                        <opt.icon className="h-4 w-4" />
                        {opt.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Color</Label>
              <Select
                value={form.gradient_color}
                onValueChange={(v) => setForm({ ...form, gradient_color: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {gradientOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <div className="flex items-center gap-2">
                        <div className={cn("w-4 h-4 rounded bg-gradient-to-r", opt.value)} />
                        {opt.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancel</Button>
            <Button onClick={handleSubmit}>
              {editingMethod ? "Save Changes" : "Add Method"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">Delete Payment Method</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{editingMethod?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MobileLayout>
  );
};

export default PaymentMethodsManage;
