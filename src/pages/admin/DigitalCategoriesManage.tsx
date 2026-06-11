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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Plus,
  Edit,
  Trash2,
  Loader2,
  Package,
  Save,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import MobileLayout from "@/components/MobileLayout";

interface DigitalCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  display_order: number;
  is_active: boolean;
}

const empty = {
  id: "",
  name: "",
  slug: "",
  description: "",
  icon: "package",
  display_order: 0,
  is_active: true,
};

const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const DigitalCategoriesManage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [items, setItems] = useState<DigitalCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [productCounts, setProductCounts] = useState<Record<string, number>>({});
  const [editing, setEditing] = useState<typeof empty | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("digital_categories")
      .select("*")
      .order("display_order", { ascending: true });
    if (error) {
      toast({ title: "Load failed", description: error.message, variant: "destructive" });
    }
    setItems(data || []);

    // count products mapped to "Digital Products"
    const { count } = await supabase
      .from("products")
      .select("*", { count: "exact", head: true })
      .eq("category", "Digital Products");
    setProductCounts({ "Digital Products": count || 0 });
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const openNew = () => {
    setEditing({ ...empty });
    setOpen(true);
  };

  const openEdit = (c: DigitalCategory) => {
    setEditing({
      id: c.id,
      name: c.name,
      slug: c.slug,
      description: c.description || "",
      icon: c.icon || "package",
      display_order: c.display_order,
      is_active: c.is_active,
    });
    setOpen(true);
  };

  const save = async () => {
    if (!editing) return;
    if (!editing.name.trim()) {
      toast({ title: "Name required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const slug = editing.slug.trim() || slugify(editing.name);
    const payload = {
      name: editing.name.trim(),
      slug,
      description: editing.description || null,
      icon: editing.icon || "package",
      display_order: Number(editing.display_order) || 0,
      is_active: editing.is_active,
    };
    const { error } = editing.id
      ? await (supabase as any).from("digital_categories").update(payload).eq("id", editing.id)
      : await (supabase as any).from("digital_categories").insert(payload);
    setSaving(false);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: editing.id ? "Updated" : "Created" });
    setOpen(false);
    setEditing(null);
    load();
  };

  const remove = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"?`)) return;
    const { error } = await (supabase as any).from("digital_categories").delete().eq("id", id);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Deleted" });
    load();
  };

  const toggleActive = async (c: DigitalCategory) => {
    const { error } = await (supabase as any)
      .from("digital_categories")
      .update({ is_active: !c.is_active })
      .eq("id", c.id);
    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
      return;
    }
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
          <h1 className="text-xl font-bold flex-1">Digital Products</h1>
          <Button size="sm" variant="secondary" onClick={openNew}>
            <Plus className="h-4 w-4 mr-1" /> New
          </Button>
        </div>
      </header>

      <div className="max-w-screen-md mx-auto p-4 space-y-4">
        <Card className="bg-emerald-500/10 border-emerald-500/30">
          <CardContent className="p-4 flex items-center gap-3">
            <Package className="h-8 w-8 text-emerald-500" />
            <div className="flex-1">
              <p className="text-sm font-semibold">
                {productCounts["Digital Products"] || 0} products in “Digital Products”
              </p>
              <p className="text-xs text-muted-foreground">
                Subcategories below help organize the catalog.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                navigate("/admin/products/new?category=Digital%20Products")
              }
            >
              <Plus className="h-4 w-4 mr-1" /> Product
            </Button>
          </CardContent>
        </Card>

        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : items.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              No digital subcategories yet.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {items.map((c) => (
              <Card key={c.id}>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center">
                    <Package className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold truncate">{c.name}</h3>
                      <Badge variant={c.is_active ? "default" : "secondary"} className="text-[10px]">
                        {c.is_active ? "Active" : "Hidden"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      /{c.slug} · order {c.display_order}
                    </p>
                  </div>
                  <Switch checked={c.is_active} onCheckedChange={() => toggleActive(c)} />
                  <Button size="icon" variant="outline" onClick={() => openEdit(c)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => remove(c.id, c.name)}
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit" : "New"} Digital Subcategory</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div>
                <Label>Name</Label>
                <Input
                  value={editing.name}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      name: e.target.value,
                      slug: editing.slug || slugify(e.target.value),
                    })
                  }
                  placeholder="Software & License Keys"
                />
              </div>
              <div>
                <Label>Slug</Label>
                <Input
                  value={editing.slug}
                  onChange={(e) => setEditing({ ...editing, slug: slugify(e.target.value) })}
                  placeholder="software"
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={editing.description}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Icon name</Label>
                  <Input
                    value={editing.icon}
                    onChange={(e) => setEditing({ ...editing, icon: e.target.value })}
                    placeholder="package"
                  />
                </div>
                <div>
                  <Label>Display order</Label>
                  <Input
                    type="number"
                    value={editing.display_order}
                    onChange={(e) =>
                      setEditing({ ...editing, display_order: Number(e.target.value) })
                    }
                  />
                </div>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <Label className="m-0">Visible to users</Label>
                <Switch
                  checked={editing.is_active}
                  onCheckedChange={(v) => setEditing({ ...editing, is_active: v })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MobileLayout>
  );
};

export default DigitalCategoriesManage;
