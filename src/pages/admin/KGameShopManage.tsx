import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Cloud, Loader2, Package, Pencil, RefreshCw, Search, Trash2, XCircle } from "lucide-react";
import MobileLayout from "@/components/MobileLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useFeatureFlag } from "@/hooks/useFeatureFlag";
import { KGAMESHOP_FLAG, KGAMESHOP_GAMES_URL, KGAMESHOP_MERGE_FLAG } from "@/hooks/useGameCatalog";
import { KGAMESHOP_PRODUCTS_URL, type KGameShopProduct } from "@/lib/kgameshop";
import { supabase } from "@/integrations/supabase/client";

type ApiGame = { game: string; name: string; category?: string; icon?: string };
type SavedProduct = { id: number; name: string; price: number; kgameshop_product_id: string | null; kgameshop_game: string | null };

const KGameShopManage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { enabled: kgameshopOn, setFlag: setKgameshopFlag, loading } = useFeatureFlag(KGAMESHOP_FLAG, false);
  const { enabled: mergeOn, setFlag: setMergeFlag } = useFeatureFlag(KGAMESHOP_MERGE_FLAG, true);
  const [games, setGames] = useState<ApiGame[]>([]);
  const [gameSearch, setGameSearch] = useState("");
  const [selectedGame, setSelectedGame] = useState<ApiGame | null>(null);
  const [apiProducts, setApiProducts] = useState<KGameShopProduct[]>([]);
  const [savedProducts, setSavedProducts] = useState<SavedProduct[]>([]);
  const [gamesLoading, setGamesLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [rate, setRate] = useState("4500");
  const [selectedApiProduct, setSelectedApiProduct] = useState<KGameShopProduct | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [packageName, setPackageName] = useState("");
  const [packagePrice, setPackagePrice] = useState("");

  useEffect(() => { void loadGames(); void loadRate(); }, []);
  useEffect(() => { if (selectedGame) void loadProducts(selectedGame.game); }, [selectedGame]);

  const loadRate = async () => {
    const { data } = await supabase.from("ad_settings").select("setting_value").eq("setting_key", "usd_to_mmk_rate").maybeSingle();
    if (data?.setting_value) setRate(data.setting_value);
  };

  const loadGames = async () => {
    setGamesLoading(true);
    try {
      const response = await fetch(KGAMESHOP_GAMES_URL, { headers: { Accept: "application/json" } });
      const body = await response.json();
      if (!response.ok || body?.ok === false) throw new Error(body?.message || body?.error || `Request failed (${response.status})`);
      const list = Array.isArray(body) ? body : Array.isArray(body?.games) ? body.games : Array.isArray(body?.data) ? body.data : [];
      setGames(list.map((game: any) => ({ game: String(game.game), name: String(game.name), category: game.category, icon: game.icon })));
      setResult({ ok: true, message: `Connected. ${list.length} games received.` });
    } catch (error: any) {
      setResult({ ok: false, message: error?.message || "Could not reach VPS game API" });
    } finally { setGamesLoading(false); }
  };

  const loadProducts = async (game: string) => {
    setProductsLoading(true);
    setApiProducts([]);
    setSelectedApiProduct(null);
    setEditingId(null);
    try {
      const response = await fetch(`${KGAMESHOP_PRODUCTS_URL}?game=${encodeURIComponent(game)}`, { headers: { Accept: "application/json" } });
      const body = await response.json();
      if (!response.ok || body?.ok === false) throw new Error(body?.message || body?.error || `Request failed (${response.status})`);
      const list = Array.isArray(body) ? body : Array.isArray(body?.products) ? body.products : Array.isArray(body?.data) ? body.data : [];
      setApiProducts(list.map((item: any) => ({ product_id: String(item.product_id), name: String(item.name), price_usd: Number(item.price_usd || 0), is_bundle: !!item.is_bundle, bundle_summary: item.bundle_summary })));
      setProductsLoading(false);
      const saved = await (supabase as any).from("products").select("id,name,price,kgameshop_product_id,kgameshop_game").eq("kgameshop_enabled", true).eq("kgameshop_game", game).order("price");
      if (saved.error) throw saved.error;
      setSavedProducts((saved.data || []) as SavedProduct[]);
    } catch (error: any) {
      toast({ title: "Packages unavailable", description: error?.message || "Could not load packages", variant: "destructive" });
    } finally { setProductsLoading(false); }
  };

  const chooseProduct = (product: KGameShopProduct) => {
    setSelectedApiProduct(product);
    setEditingId(null);
    setPackageName(product.name);
    setPackagePrice(String(Math.round(product.price_usd * Number(rate || 0))));
  };

  const editSaved = (product: SavedProduct) => {
    setEditingId(product.id);
    setSelectedApiProduct(apiProducts.find((item) => item.product_id === product.kgameshop_product_id) || null);
    setPackageName(product.name);
    setPackagePrice(String(product.price));
  };

  const saveRate = async () => {
    const value = Number(rate);
    if (!Number.isFinite(value) || value <= 0) return toast({ title: "Invalid rate", variant: "destructive" });
    setSaving(true);
    const { error } = await supabase.from("ad_settings").update({ setting_value: String(value), updated_at: new Date().toISOString() }).eq("setting_key", "usd_to_mmk_rate");
    setSaving(false);
    toast({ title: error ? "Save failed" : "MMK rate saved", description: error?.message, variant: error ? "destructive" : undefined });
    if (!error && selectedApiProduct) setPackagePrice(String(Math.round(selectedApiProduct.price_usd * value)));
  };

  const savePackage = async () => {
    if (!selectedGame || !selectedApiProduct || !packageName.trim() || Number(packagePrice) <= 0) {
      toast({ title: "Package and valid MMK price required", variant: "destructive" }); return;
    }
    setSaving(true);
    const payload = {
      name: packageName.trim(), price: Number(packagePrice), cost_price: Math.round(selectedApiProduct.price_usd * Number(rate)),
      image_url: selectedGame.icon || "/placeholder.svg", description: selectedApiProduct.bundle_summary || null,
      category: selectedGame.game, points_value: 0, status: "available", kgameshop_enabled: true,
      kgameshop_game: selectedGame.game, kgameshop_product_id: selectedApiProduct.product_id, kgameshop_region: null,
    };
    const existingId = editingId || savedProducts.find((product) => product.kgameshop_product_id === selectedApiProduct.product_id)?.id || null;
    const query = existingId
      ? (supabase as any).from("products").update(payload).eq("id", existingId)
      : (supabase as any).from("products").insert(payload);
    const { error } = await query;
    setSaving(false);
    if (error) return toast({ title: "Save failed", description: error.message, variant: "destructive" });
    toast({ title: existingId ? "Package updated" : "Package added to shop" });
    setSelectedApiProduct(null); setEditingId(null); setPackageName(""); setPackagePrice("");
    void loadProducts(selectedGame.game);
  };

  const deletePackage = async (id: number) => {
    if (!confirm("Remove this package from the shop?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    else if (selectedGame) void loadProducts(selectedGame.game);
  };

  const apply = async (setter: typeof setKgameshopFlag, value: boolean, label: string) => {
    const error = await setter(value, label);
    toast({ title: error ? "Update failed" : "Saved", description: error?.message || "Game Shop updated.", variant: error ? "destructive" : undefined });
  };

  const filteredGames = useMemo(() => games.filter((game) => game.name.toLowerCase().includes(gameSearch.toLowerCase())), [games, gameSearch]);

  return (
    <MobileLayout className="pb-24">
      <header className="sticky top-0 z-40 bg-gradient-primary p-4 text-primary-foreground">
        <div className="flex items-center gap-3"><Button variant="ghost" size="icon" onClick={() => navigate("/admin")}><ArrowLeft /></Button><Cloud /><div><h1 className="text-lg font-bold">KGameShop API</h1><p className="text-xs opacity-80">VPS games, packages and MMK prices</p></div></div>
      </header>
      <div className="mx-auto max-w-screen-xl space-y-4 p-4">
        <div className="grid gap-4 lg:grid-cols-2">
          <Card><CardContent className="flex items-center gap-3 p-4"><div className="flex-1"><p className="text-sm font-semibold">Use VPS Game List</p><p className="text-xs text-muted-foreground">Show games loaded from your VPS.</p></div><Switch checked={kgameshopOn} disabled={loading} onCheckedChange={(v) => apply(setKgameshopFlag, v, "Use KGameShop Game List")} /></CardContent></Card>
          <Card><CardContent className="flex items-center gap-3 p-4"><div className="flex-1"><p className="text-sm font-semibold">Keep manual games visible</p><p className="text-xs text-muted-foreground">Show your own games together with VPS games.</p></div><Switch checked={mergeOn} disabled={!kgameshopOn} onCheckedChange={(v) => apply(setMergeFlag as any, v, "Keep manual games with KGameShop")} /></CardContent></Card>
        </div>

        <Card><CardHeader><CardTitle className="text-base">MMK Rate</CardTitle></CardHeader><CardContent className="space-y-3"><Label htmlFor="kg-rate">1 USD equals</Label><div className="flex gap-2"><Input id="kg-rate" type="number" min="1" value={rate} onChange={(e) => { setRate(e.target.value); if (selectedApiProduct) setPackagePrice(String(Math.round(selectedApiProduct.price_usd * Number(e.target.value || 0)))); }} /><span className="self-center text-sm font-semibold">MMK</span><Button onClick={saveRate} disabled={saving}>Save Rate</Button></div><p className="text-xs text-muted-foreground">Package USD prices below are converted automatically with this rate.</p></CardContent></Card>

        <Card><CardHeader><div className="flex items-center justify-between"><CardTitle className="text-base">Choose VPS Game</CardTitle><Button variant="outline" size="sm" onClick={loadGames} disabled={gamesLoading}><RefreshCw className={gamesLoading ? "h-4 w-4 animate-spin" : "h-4 w-4"} /></Button></div></CardHeader><CardContent className="space-y-3"><div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input className="pl-9" placeholder="Search 200+ games" value={gameSearch} onChange={(e) => setGameSearch(e.target.value)} /></div>{result && <div className={`flex items-center gap-2 text-xs ${result.ok ? "text-primary" : "text-destructive"}`}>{result.ok ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}{result.message}</div>}<div className="grid max-h-80 grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3 lg:grid-cols-4">{filteredGames.map((game) => <Button key={game.game} variant={selectedGame?.game === game.game ? "default" : "outline"} className="h-auto justify-start gap-2 p-2 text-left" onClick={() => setSelectedGame(game)}>{game.icon ? <img src={game.icon} alt="" className="h-9 w-9 rounded object-cover" /> : <Package className="h-5 w-5" />}<span className="line-clamp-2 whitespace-normal text-xs">{game.name}</span></Button>)}</div></CardContent></Card>

        {selectedGame && <div className="grid items-start gap-4 lg:grid-cols-2">
          <Card><CardHeader><CardTitle className="text-base">{selectedGame.name} VPS Packages</CardTitle></CardHeader><CardContent>{productsLoading ? <Loader2 className="mx-auto h-6 w-6 animate-spin" /> : apiProducts.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">Products are unavailable for this game.</p> : <div className="space-y-2">{apiProducts.map((product) => <Button key={product.product_id} variant={selectedApiProduct?.product_id === product.product_id ? "secondary" : "outline"} className="h-auto w-full justify-between gap-3 p-3 text-left" onClick={() => chooseProduct(product)}><span className="whitespace-normal text-sm font-medium">{product.name}</span><span className="shrink-0 text-right text-xs"><strong>${product.price_usd.toFixed(2)}</strong><br />{Math.round(product.price_usd * Number(rate || 0)).toLocaleString()} MMK</span></Button>)}</div>}</CardContent></Card>
          <div className="space-y-4">
            <Card><CardHeader><CardTitle className="text-base">{editingId ? "Edit Store Package" : "Add Store Package"}</CardTitle></CardHeader><CardContent className="space-y-3"><div><Label>VPS package</Label><p className="mt-1 text-sm text-muted-foreground">{selectedApiProduct?.name || "Choose a VPS package from the list"}</p></div><div><Label htmlFor="package-name">Package name</Label><Input id="package-name" value={packageName} onChange={(e) => setPackageName(e.target.value)} /></div><div><Label htmlFor="package-price">Selling price (MMK)</Label><Input id="package-price" type="number" min="1" value={packagePrice} onChange={(e) => setPackagePrice(e.target.value)} /></div><Button className="w-full" onClick={savePackage} disabled={saving || !selectedApiProduct}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{editingId ? "Update package" : "Add package to shop"}</Button></CardContent></Card>
            <Card><CardHeader><CardTitle className="text-base">Packages in Shop <Badge variant="secondary">{savedProducts.length}</Badge></CardTitle></CardHeader><CardContent className="space-y-2">{savedProducts.length === 0 ? <p className="py-4 text-center text-sm text-muted-foreground">No saved packages yet.</p> : savedProducts.map((product) => <div key={product.id} className="flex items-center gap-2 rounded-lg border p-3"><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{product.name}</p><p className="text-xs text-primary">{Number(product.price).toLocaleString()} MMK</p></div><Button size="icon" variant="ghost" onClick={() => editSaved(product)}><Pencil className="h-4 w-4" /></Button><Button size="icon" variant="ghost" onClick={() => deletePackage(product.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></div>)}</CardContent></Card>
          </div>
        </div>}
      </div>
    </MobileLayout>
  );
};

export default KGameShopManage;