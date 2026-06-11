import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Trash2, Save, Gem } from "lucide-react";

interface Tier {
  id: string;
  slug: string;
  label: string;
  emoji: string | null;
  display_order: number;
  is_active: boolean;
}

const DiamondTiersManage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTier, setNewTier] = useState({ slug: "", label: "", emoji: "💎" });

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("mlbb_diamond_tiers" as any)
      .select("*")
      .order("display_order", { ascending: true });
    setTiers((data as any as Tier[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const updateTier = async (id: string, patch: Partial<Tier>) => {
    setTiers((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
    const { error } = await (supabase as any).from("mlbb_diamond_tiers").update(patch).eq("id", id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
  };

  const deleteTier = async (id: string) => {
    if (!confirm("ဤ category ကို ဖျက်မှာ သေချာပါသလား?")) return;
    const { error } = await (supabase as any).from("mlbb_diamond_tiers").delete().eq("id", id);
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    toast({ title: "Deleted" });
    load();
  };

  const addTier = async () => {
    if (!newTier.slug.trim() || !newTier.label.trim()) {
      return toast({ title: "Slug နဲ့ Label ဖြည့်ပါ", variant: "destructive" });
    }
    const slug = newTier.slug.trim().toLowerCase().replace(/\s+/g, "-");
    const order = (tiers.at(-1)?.display_order ?? 0) + 1;
    const { error } = await (supabase as any).from("mlbb_diamond_tiers").insert({
      slug,
      label: newTier.label.trim(),
      emoji: newTier.emoji || "💎",
      display_order: order,
    });
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    setNewTier({ slug: "", label: "", emoji: "💎" });
    toast({ title: "Category created" });
    load();
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="bg-gradient-primary text-primary-foreground p-4 sticky top-0 z-40 shadow-md">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin")} className="hover:bg-primary-foreground/10">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Gem className="h-5 w-5" />
          <h1 className="text-lg font-display font-bold">MLBB Diamond Categories</h1>
        </div>
      </header>

      <div className="max-w-2xl mx-auto p-4 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Add new category</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-[80px_1fr_1fr] gap-2">
              <div>
                <Label className="text-xs">Emoji</Label>
                <Input value={newTier.emoji} onChange={(e) => setNewTier({ ...newTier, emoji: e.target.value })} maxLength={4} />
              </div>
              <div>
                <Label className="text-xs">Slug</Label>
                <Input placeholder="e.g. weekly" value={newTier.slug} onChange={(e) => setNewTier({ ...newTier, slug: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Label</Label>
                <Input placeholder="e.g. Weekly Pass" value={newTier.label} onChange={(e) => setNewTier({ ...newTier, label: e.target.value })} />
              </div>
            </div>
            <Button onClick={addTier} className="w-full">
              <Plus className="h-4 w-4 mr-2" /> Add Category
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Existing categories</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : tiers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No categories yet.</p>
            ) : (
              <div className="space-y-2">
                {tiers.map((t) => (
                  <div key={t.id} className="border border-border rounded-lg p-3 grid grid-cols-[48px_1fr_1fr_70px_auto_auto] gap-2 items-end">
                    <div>
                      <Label className="text-[10px]">Emoji</Label>
                      <Input value={t.emoji || ""} onChange={(e) => setTiers((p) => p.map((x) => (x.id === t.id ? { ...x, emoji: e.target.value } : x)))} maxLength={4} />
                    </div>
                    <div>
                      <Label className="text-[10px]">Slug</Label>
                      <Input value={t.slug} disabled />
                    </div>
                    <div>
                      <Label className="text-[10px]">Label</Label>
                      <Input value={t.label} onChange={(e) => setTiers((p) => p.map((x) => (x.id === t.id ? { ...x, label: e.target.value } : x)))} />
                    </div>
                    <div>
                      <Label className="text-[10px]">Order</Label>
                      <Input type="number" value={t.display_order} onChange={(e) => setTiers((p) => p.map((x) => (x.id === t.id ? { ...x, display_order: parseInt(e.target.value) || 0 } : x)))} />
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <Label className="text-[10px]">Active</Label>
                      <Switch checked={t.is_active} onCheckedChange={(v) => updateTier(t.id, { is_active: v })} />
                    </div>
                    <div className="flex gap-1">
                      <Button size="icon" variant="outline" onClick={() => updateTier(t.id, { label: t.label, emoji: t.emoji, display_order: t.display_order })} title="Save">
                        <Save className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="destructive" onClick={() => deleteTier(t.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DiamondTiersManage;
