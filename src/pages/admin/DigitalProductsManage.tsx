import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Plus,
  Edit,
  Trash2,
  Loader2,
  Save,
  Search,
  Package,
  ChevronLeft,
  ChevronRight,
  Layers,
  X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import MobileLayout from "@/components/MobileLayout";

interface Product {
  id: number;
  name: string;
  description: string | null;
  price: number;
  image_url: string;
  points_value: number;
  category: string;
  is_premium: boolean;
}

interface Plan {
  id?: string;
  name: string;
  duration_label: string;
  price: number;
  cost_price: number;
  sort_order: number;
  is_active: boolean;
  _deleted?: boolean;
  _new?: boolean;
}

const CATEGORY = "Digital Products";

const emptyForm = {
  id: 0 as number,
  name: "",
  description: "",
  price: 0,
  image_url: "",
  points_value: 0,
  is_premium: false,
};

const DigitalProductsManage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<typeof emptyForm>({ ...emptyForm });
  const [plans, setPlans] = useState<Plan[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("category", CATEGORY)
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Load failed", description: error.message, variant: "destructive" });
    }
    setItems((data as Product[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = items.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const openNew = () => {
    setForm({ ...emptyForm });
    setPlans([
      { name: "1 Month", duration_label: "1 month", price: 0, cost_price: 0, sort_order: 0, is_active: true, _new: true },
    ]);
    setOpen(true);
  };

  const openEdit = async (p: Product) => {
    setForm({
      id: p.id,
      name: p.name,
      description: p.description || "",
      price: p.price,
      image_url: p.image_url,
      points_value: p.points_value || 0,
      is_premium: !!p.is_premium,
    });
    const { data } = await supabase
      .from("digital_product_plans")
      .select("*")
      .eq("product_id", p.id)
      .order("sort_order", { ascending: true });
    setPlans(
      (data || []).map((d: any) => ({
        id: d.id,
        name: d.name,
        duration_label: d.duration_label || "",
        price: Number(d.price),
        cost_price: Number(d.cost_price || 0),
        sort_order: d.sort_order,
        is_active: d.is_active,
      }))
    );
    setOpen(true);
  };

  const addPlan = () => {
    setPlans((prev) => [
      ...prev,
      {
        name: "",
        duration_label: "",
        price: 0,
        cost_price: 0,
        sort_order: prev.filter((p) => !p._deleted).length,
        is_active: true,
        _new: true,
      },
    ]);
  };

  const updatePlan = (idx: number, patch: Partial<Plan>) => {
    setPlans((prev) => prev.map((p, i) => (i === idx ? { ...p, ...patch } : p)));
  };

  const removePlan = (idx: number) => {
    setPlans((prev) =>
      prev
        .map((p, i) => (i === idx ? { ...p, _deleted: true } : p))
        .filter((p) => !(p._new && p._deleted))
    );
  };

  const save = async () => {
    if (!form.name.trim() || !form.image_url.trim()) {
      toast({ title: "Name and image URL required", variant: "destructive" });
      return;
    }
    const activePlans = plans.filter((p) => !p._deleted);
    if (activePlans.length === 0) {
      toast({ title: "Add at least one plan", variant: "destructive" });
      return;
    }
    if (activePlans.some((p) => !p.name.trim() || !p.price || p.price <= 0)) {
      toast({ title: "Each plan needs a name and price", variant: "destructive" });
      return;
    }

    setSaving(true);
    // Use the lowest plan price as the product's base/display price
    const basePrice = Math.min(...activePlans.map((p) => Number(p.price)));

    const payload = {
      name: form.name.trim(),
      description: form.description || null,
      price: basePrice,
      image_url: form.image_url.trim(),
      points_value: Number(form.points_value) || 0,
      is_premium: form.is_premium,
      category: CATEGORY,
    };

    let productId = form.id;
    if (form.id) {
      const { error } = await supabase.from("products").update(payload).eq("id", form.id);
      if (error) {
        setSaving(false);
        toast({ title: "Save failed", description: error.message, variant: "destructive" });
        return;
      }
    } else {
      const { data, error } = await supabase
        .from("products")
        .insert(payload as any)
        .select("id")
        .single();
      if (error || !data) {
        setSaving(false);
        toast({ title: "Save failed", description: error?.message, variant: "destructive" });
        return;
      }
      productId = data.id;
    }

    // Sync plans
    const toDelete = plans.filter((p) => p._deleted && p.id).map((p) => p.id!);
    if (toDelete.length) {
      await supabase.from("digital_product_plans").delete().in("id", toDelete);
    }

    for (let i = 0; i < plans.length; i++) {
      const p = plans[i];
      if (p._deleted) continue;
      const row = {
        product_id: productId,
        name: p.name.trim(),
        duration_label: p.duration_label?.trim() || null,
        price: Number(p.price),
        sort_order: i,
        is_active: p.is_active,
      };
      if (p.id) {
        await supabase.from("digital_product_plans").update(row).eq("id", p.id);
      } else {
        await supabase.from("digital_product_plans").insert(row);
      }
    }

    setSaving(false);
    toast({ title: form.id ? "Updated" : "Created" });
    setOpen(false);
    load();
  };

  const remove = async (p: Product) => {
    if (!confirm(`Delete "${p.name}"?`)) return;
    const { error } = await supabase.from("products").delete().eq("id", p.id);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Deleted" });
    load();
  };

  return (
    <MobileLayout className="pb-8">
      <header className="bg-gradient-primary text-primary-foreground p-4 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/admin")}>
            <ArrowLeft className="h-6 w-6" />
          </button>
          <Package className="h-5 w-5" />
          <h1 className="text-lg font-bold flex-1">Digital Products</h1>
          <Button size="sm" variant="secondary" onClick={openNew}>
            <Plus className="h-4 w-4 mr-1" /> New
          </Button>
        </div>
      </header>

      <div className="max-w-screen-md mx-auto p-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search digital products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <p className="text-xs text-muted-foreground">
          {filtered.length} of {items.length} products
        </p>

        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground text-sm">
              No digital products yet. Tap "New" to add one.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            <div className="grid gap-2">
              {paginated.map((p) => (
                <Card key={p.id}>
                  <CardContent className="p-3 flex items-center gap-3">
                    <img
                      src={p.image_url}
                      alt={p.name}
                      className="w-14 h-14 rounded-lg object-cover bg-muted flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-sm truncate">{p.name}</h3>
                        {p.is_premium && (
                          <Badge className="text-[9px] bg-amber-500">Premium</Badge>
                        )}
                      </div>
                      <p className="text-xs text-primary font-bold">
                        From {p.price.toLocaleString()} MMK
                      </p>
                      {p.points_value > 0 && (
                        <p className="text-[10px] text-muted-foreground">
                          +{p.points_value} pts
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button size="icon" variant="outline" onClick={() => openEdit(p)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="outline"
                        className="text-destructive"
                        onClick={() => remove(p)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between bg-card/80 backdrop-blur-sm rounded-xl border border-border/40 px-3 py-2">
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Prev
                </Button>
                <span className="text-xs font-medium text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit" : "New"} Digital Product</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Product Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. NordVPN"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                rows={2}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div>
              <Label>Image URL</Label>
              <Input
                value={form.image_url}
                onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                placeholder="https://..."
              />
              {form.image_url && (
                <img
                  src={form.image_url}
                  alt=""
                  className="mt-2 w-20 h-20 rounded-lg object-cover bg-muted"
                />
              )}
            </div>

            {/* Plans section */}
            <div className="rounded-lg border p-3 space-y-3 bg-muted/30">
              <div className="flex items-center justify-between">
                <Label className="m-0 flex items-center gap-2">
                  <Layers className="h-4 w-4" /> Plans / Pricing
                </Label>
                <Button size="sm" type="button" variant="outline" onClick={addPlan}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add plan
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                User က ဒီ plan တွေထဲက တစ်ခုကို ရွေးပြီး ၀ယ်ပါမယ်။ ဥပမာ - 1 month / 4000 MMK
              </p>

              {plans.filter((p) => !p._deleted).length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-2">
                  No plans yet.
                </p>
              )}

              <div className="space-y-2">
                {plans.map((p, idx) =>
                  p._deleted ? null : (
                    <div
                      key={idx}
                      className="rounded-md bg-background border p-2 space-y-2"
                    >
                      <div className="flex items-center gap-2">
                        <Input
                          placeholder="Plan name (e.g. 1 Month)"
                          value={p.name}
                          onChange={(e) => updatePlan(idx, { name: e.target.value })}
                          className="h-8 text-sm flex-1"
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive"
                          onClick={() => removePlan(idx)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          placeholder="Duration (e.g. 30 days)"
                          value={p.duration_label}
                          onChange={(e) =>
                            updatePlan(idx, { duration_label: e.target.value })
                          }
                          className="h-8 text-sm"
                        />
                        <Input
                          type="number"
                          placeholder="Price MMK"
                          value={p.price || ""}
                          onChange={(e) =>
                            updatePlan(idx, { price: Number(e.target.value) })
                          }
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Active</span>
                        <Switch
                          checked={p.is_active}
                          onCheckedChange={(v) => updatePlan(idx, { is_active: v })}
                        />
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>

            <div>
              <Label>Points reward (per purchase)</Label>
              <Input
                type="number"
                value={form.points_value}
                onChange={(e) =>
                  setForm({ ...form, points_value: Number(e.target.value) })
                }
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <Label className="m-0">Premium only</Label>
              <Switch
                checked={form.is_premium}
                onCheckedChange={(v) => setForm({ ...form, is_premium: v })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Save className="h-4 w-4 mr-1" />
              )}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MobileLayout>
  );
};

export default DigitalProductsManage;
