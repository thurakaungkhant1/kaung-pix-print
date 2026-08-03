import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Save, Search, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import MobileLayout from "@/components/MobileLayout";

const GAME_CATEGORIES = ["MLBB Diamonds", "PUBG UC", "Magic Chess Diamonds", "Free Fire", "Genshin", "Gift Cards"];

interface GameProduct {
  id: number;
  name: string;
  price: number;
  image_url: string;
  category: string;
  smile_package_id: string | null;
}

const SmilePackagesManage = () => {
  const [products, setProducts] = useState<GameProduct[]>([]);
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [savingId, setSavingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    const { data, error } = await supabase
      .from("products")
      .select("id, name, price, image_url, category, smile_package_id")
      .in("category", GAME_CATEGORIES)
      .order("category", { ascending: true });

    if (error) {
      toast({ title: "Error", description: "Failed to load game products", variant: "destructive" });
    } else if (data) {
      setProducts(data as GameProduct[]);
      setDrafts(
        Object.fromEntries((data as GameProduct[]).map((p) => [p.id, p.smile_package_id ?? ""]))
      );
    }
    setLoading(false);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        (p.smile_package_id ?? "").toLowerCase().includes(q)
    );
  }, [products, search]);

  const save = async (id: number) => {
    setSavingId(id);
    const value = (drafts[id] ?? "").trim();
    const { error } = await supabase
      .from("products")
      .update({ smile_package_id: value === "" ? null : value })
      .eq("id", id);
    setSavingId(null);

    if (error) {
      toast({ title: "Error", description: "Failed to save package ID", variant: "destructive" });
      return;
    }
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, smile_package_id: value === "" ? null : value } : p))
    );
    toast({ title: "Saved", description: "Smile.One Package ID updated" });
  };

  return (
    <MobileLayout className="pb-8">
      <header className="bg-gradient-primary text-primary-foreground p-4 sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate("/admin")} aria-label="Back">
            <ArrowLeft className="h-6 w-6" />
          </button>
          <div>
            <h1 className="text-xl font-bold">Smile.One Packages</h1>
            <p className="text-xs opacity-80">Game products ↔ Smile.One package ID mapping</p>
          </div>
        </div>
      </header>

      <div className="max-w-screen-xl mx-auto p-4 space-y-4">
        <Card className="border-border/50">
          <CardContent className="p-4 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search game products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Showing {filtered.length} of {products.length} game products
            </p>
          </CardContent>
        </Card>

        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-muted animate-pulse rounded-xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <Zap className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No game products found</p>
          </div>
        ) : (
          filtered.map((p) => {
            const dirty = (drafts[p.id] ?? "") !== (p.smile_package_id ?? "");
            return (
              <Card key={p.id}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex gap-3 items-center">
                    <img
                      src={p.image_url}
                      alt={p.name}
                      className="w-14 h-14 rounded object-cover flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm truncate">{p.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-[10px]">{p.category}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {p.price.toLocaleString()} MMK
                        </span>
                      </div>
                    </div>
                    {p.smile_package_id ? (
                      <Badge className="text-[10px]">Linked</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px]">Not set</Badge>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={drafts[p.id] ?? ""}
                      onChange={(e) => setDrafts((d) => ({ ...d, [p.id]: e.target.value }))}
                      placeholder="Smile.One Package ID"
                    />
                    <Button onClick={() => save(p.id)} disabled={!dirty || savingId === p.id}>
                      <Save className="h-4 w-4 mr-1" />
                      Save
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </MobileLayout>
  );
};

export default SmilePackagesManage;
