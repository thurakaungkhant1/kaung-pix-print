import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { useToast } from "@/hooks/use-toast";
import { zonedInputToISO, isoToZonedInput, timezoneOptions, localTimeZone, formatInViewerZone } from "@/lib/eventTime";
import MobileLayout from "@/components/MobileLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
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
  Gamepad2,
  Loader2,
  Plus,
  Trash2,
  Pencil,
  Package,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface GameRow {
  id: string;
  category_key: string;
  name: string;
  short_name: string | null;
  image_url: string | null;
  requires_server_id: boolean;
  nickname_key: string | null;
  display_order: number;
  is_active: boolean;
  card_style?: string | null;
  card_accent?: string | null;
  show_discount_badge?: boolean | null;
  price_suffix?: string | null;
}


interface PackageRow {
  id: number;
  name: string;
  price: number;
  cost_price: number;
  image_url: string;
  category: string;
  diamond_tier: string | null;
  smile_package_id: string | null;
  description: string | null;
  event_ends_at?: string | null;
  event_label?: string | null;
}

const TIERS = ["special", "starter", "popular", "pro", "mega"];

const COC_TIER_LABELS: Record<string, string> = {
  special: "Skins",
  starter: "Sceneries",
  popular: "Gold Pass",
  pro: "Event Pass",
};
const COC_TIERS = ["special", "starter", "popular", "pro"];
const tiersFor = (category: string) => (category === "Clash of Clans" ? COC_TIERS : TIERS);
const DEFAULT_TIER_LABELS: Record<string, string> = {
  special: "Special Offers",
  starter: "Starter Packs",
  popular: "Popular Packs",
  pro: "Pro Packs",
  mega: "Mega Packs",
};
const tierLabel = (tier: string, category: string) =>
  (category === "Clash of Clans" ? COC_TIER_LABELS : DEFAULT_TIER_LABELS)[tier] || tier;

const emptyGame = {
  name: "",
  short_name: "",
  image_url: "",
  category_key: "",
  idMode: "single" as "single" | "dual",
  nickname_key: "none",
  is_active: true,
  card_style: "default",
  card_accent: "#F5B301",
  show_discount_badge: true,
  price_suffix: "MMK",
};


const emptyPkg = {
  id: null as number | null,
  name: "",
  price: "",
  cost_price: "",
  image_url: "",
  diamond_tier: "popular",
  smile_package_id: "",
  description: "",
  event_ends_at: "",
  event_label: "",
};

const GameCatalogManage = () => {
  const { isAdmin, isLoading: adminLoading } = useAdminCheck({ redirectTo: "/", redirectOnFail: true });
  const { toast } = useToast();
  const navigate = useNavigate();

  const [eventTz, setEventTz] = useState(localTimeZone());
  const tzOptions = timezoneOptions(eventTz);
  const [games, setGames] = useState<GameRow[]>([]);
  const [packages, setPackages] = useState<Record<string, PackageRow[]>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const [gameDialog, setGameDialog] = useState(false);
  const [editingGame, setEditingGame] = useState<GameRow | null>(null);
  const [gameForm, setGameForm] = useState({ ...emptyGame });

  const [pkgDialog, setPkgDialog] = useState(false);
  const [pkgCategory, setPkgCategory] = useState<string>("");
  const [pkgForm, setPkgForm] = useState({ ...emptyPkg });

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin]);

  const load = async () => {
    setLoading(true);
    const { data: gameRows } = await (supabase as any)
      .from("game_catalog")
      .select("*")
      .order("display_order", { ascending: true });
    const list = (gameRows || []) as GameRow[];
    setGames(list);

    if (list.length) {
      const { data: prods } = await (supabase as any)
        .from("products")
        .select("id,name,price,cost_price,image_url,category,diamond_tier,smile_package_id,description,event_ends_at,event_label")
        .in("category", list.map((g) => g.category_key))
        .order("price", { ascending: true });
      const map: Record<string, PackageRow[]> = {};
      (prods || []).forEach((p: PackageRow) => {
        (map[p.category] ||= []).push(p);
      });
      setPackages(map);
    }
    setLoading(false);
  };

  const openNewGame = () => {
    setEditingGame(null);
    setGameForm({ ...emptyGame });
    setGameDialog(true);
  };

  const openEditGame = (g: GameRow) => {
    setEditingGame(g);
    setGameForm({
      name: g.name,
      short_name: g.short_name || "",
      image_url: g.image_url || "",
      category_key: g.category_key,
      idMode: g.requires_server_id ? "dual" : "single",
      nickname_key: g.nickname_key || "none",
      is_active: g.is_active,
      card_style: g.card_style || "default",
      card_accent: g.card_accent || "#F5B301",
      show_discount_badge: g.show_discount_badge !== false,
      price_suffix: g.price_suffix || "MMK",
    });

    setGameDialog(true);
  };

  const saveGame = async () => {
    if (!gameForm.name.trim()) {
      toast({ title: "Game name required", variant: "destructive" });
      return;
    }
    if (!gameForm.image_url.trim()) {
      toast({ title: "Game image link required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const categoryKey =
      editingGame?.category_key ||
      (gameForm.category_key.trim() || `${gameForm.name.trim()} Packages`);

    const payload = {
      category_key: categoryKey,
      name: gameForm.name.trim(),
      short_name: gameForm.short_name.trim() || gameForm.name.trim(),
      image_url: gameForm.image_url.trim(),
      requires_server_id: gameForm.idMode === "dual",
      nickname_key: gameForm.nickname_key === "none" ? null : gameForm.nickname_key,
      is_active: gameForm.is_active,
      card_style: gameForm.card_style,
      card_accent: gameForm.card_accent,
      show_discount_badge: gameForm.show_discount_badge,
      price_suffix: gameForm.price_suffix.trim() || "MMK",
      display_order: editingGame?.display_order ?? games.length + 1,
    };


    const { error } = editingGame
      ? await (supabase as any).from("game_catalog").update(payload).eq("id", editingGame.id)
      : await (supabase as any).from("game_catalog").insert(payload);

    setSaving(false);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: editingGame ? "Game updated" : "Game added" });
    setGameDialog(false);
    load();
  };

  const deleteGame = async (g: GameRow) => {
    if (!confirm(`Remove ${g.name} from the Game Shop? Packages stay in the database.`)) return;
    const { error } = await (supabase as any).from("game_catalog").delete().eq("id", g.id);
    if (error) toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Game removed" });
      load();
    }
  };

  const toggleActive = async (g: GameRow, value: boolean) => {
    setGames((prev) => prev.map((x) => (x.id === g.id ? { ...x, is_active: value } : x)));
    await (supabase as any).from("game_catalog").update({ is_active: value }).eq("id", g.id);
  };

  const openNewPkg = (categoryKey: string, image: string | null) => {
    setPkgCategory(categoryKey);
    setPkgForm({ ...emptyPkg, image_url: image || "" });
    setPkgDialog(true);
  };

  const openEditPkg = (p: PackageRow) => {
    setPkgCategory(p.category);
    setPkgForm({
      id: p.id,
      name: p.name,
      price: String(p.price),
      cost_price: String(p.cost_price ?? 0),
      image_url: p.image_url,
      diamond_tier: p.diamond_tier || "popular",
      smile_package_id: p.smile_package_id || "",
      description: p.description || "",
      event_ends_at: isoToZonedInput(p.event_ends_at, eventTz),
      event_label: p.event_label || "",
    });
    setPkgDialog(true);
  };

  const savePkg = async () => {
    if (!pkgForm.name.trim() || !pkgForm.price) {
      toast({ title: "Package name and price required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      name: pkgForm.name.trim(),
      price: Number(pkgForm.price),
      cost_price: Number(pkgForm.cost_price || 0),
      image_url: pkgForm.image_url.trim() || "/images/games/mobile-legends.png",
      category: pkgCategory,
      diamond_tier: pkgForm.diamond_tier,
      smile_package_id: pkgForm.smile_package_id.trim() || null,
      description: pkgForm.description.trim() || null,
      event_ends_at: zonedInputToISO(pkgForm.event_ends_at, eventTz),
      event_label: pkgForm.event_label.trim() || null,
      points_value: 0,
    };
    const { error } = pkgForm.id
      ? await (supabase as any).from("products").update(payload).eq("id", pkgForm.id)
      : await (supabase as any).from("products").insert(payload);
    setSaving(false);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: pkgForm.id ? "Package updated" : "Package added" });
    setPkgDialog(false);
    load();
  };

  const deletePkg = async (p: PackageRow) => {
    if (!confirm(`Delete package "${p.name}"?`)) return;
    const { error } = await (supabase as any).from("products").delete().eq("id", p.id);
    if (error) toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    else load();
  };

  if (adminLoading || loading) {
    return (
      <MobileLayout className="pb-20">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout className="pb-24">
      <header className="bg-gradient-primary text-primary-foreground p-4 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/admin")} aria-label="Back">
            <ArrowLeft className="h-6 w-6" />
          </button>
          <Gamepad2 className="h-6 w-6" />
          <div className="flex-1">
            <h1 className="text-lg font-bold leading-tight">Game Shop</h1>
            <p className="text-xs opacity-80">{games.length} games</p>
          </div>
        </div>
      </header>

      <div className="max-w-screen-md mx-auto p-4 space-y-4">
        <Button className="w-full gap-2" onClick={openNewGame}>
          <Plus className="h-4 w-4" /> Add Game
        </Button>

        <div className="space-y-3">
          {games.map((g) => {
            const items = packages[g.category_key] || [];
            const open = expanded === g.id;
            return (
              <Card key={g.id} className={g.is_active ? "" : "opacity-60"}>
                <CardContent className="p-3 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-xl overflow-hidden bg-muted shrink-0">
                      {g.image_url && (
                        <img src={g.image_url} alt={g.name} className="w-full h-full object-cover" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate">{g.name}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{g.category_key}</p>
                      <div className="flex gap-1.5 mt-1">
                        <Badge variant="outline" className="text-[10px]">
                          {g.requires_server_id ? "Player ID + Server ID" : "Player ID only"}
                        </Badge>
                        <Badge variant="secondary" className="text-[10px]">{items.length} packages</Badge>
                      </div>
                    </div>
                    <Switch checked={g.is_active} onCheckedChange={(v) => toggleActive(g, v)} />
                  </div>

                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1 h-8 text-xs gap-1" onClick={() => openEditGame(g)}>
                      <Pencil className="h-3 w-3" /> Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="flex-1 h-8 text-xs gap-1"
                      onClick={() => setExpanded(open ? null : g.id)}
                    >
                      <Package className="h-3 w-3" /> Packages
                      {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    </Button>
                    <Button size="sm" variant="ghost" className="h-8 text-destructive" onClick={() => deleteGame(g)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  {open && (
                    <div className="space-y-2 pt-1 border-t border-border/60">
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full h-8 text-xs gap-1 mt-2"
                        onClick={() => openNewPkg(g.category_key, g.image_url)}
                      >
                        <Plus className="h-3 w-3" /> Add package
                      </Button>
                      {items.length === 0 && (
                        <p className="text-[11px] text-muted-foreground text-center py-2">No packages yet</p>
                      )}
                      {items.map((p) => (
                        <div key={p.id} className="flex items-center gap-2 rounded-xl border border-border/60 p-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold truncate">{p.name}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {p.price.toLocaleString()} MMK
                              {p.diamond_tier ? ` · ${tierLabel(p.diamond_tier, p.category)}` : ""}
                              {p.smile_package_id ? ` · #${p.smile_package_id}` : ""}
                            </p>
                          </div>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEditPkg(p)}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => deletePkg(p)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Game dialog */}
      <Dialog open={gameDialog} onOpenChange={setGameDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingGame ? "Edit game" : "Add game"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Game name</Label>
              <Input
                value={gameForm.name}
                onChange={(e) => setGameForm({ ...gameForm, name: e.target.value })}
                placeholder="Free Fire"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Short label (shown on Home)</Label>
              <Input
                value={gameForm.short_name}
                onChange={(e) => setGameForm({ ...gameForm, short_name: e.target.value })}
                placeholder="Free Fire"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Game image link</Label>
              <Input
                value={gameForm.image_url}
                onChange={(e) => setGameForm({ ...gameForm, image_url: e.target.value })}
                placeholder="https://..."
              />
              {gameForm.image_url && (
                <img src={gameForm.image_url} alt="preview" className="w-16 h-16 rounded-xl object-cover" />
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Player ID fields</Label>
              <Select
                value={gameForm.idMode}
                onValueChange={(v) => setGameForm({ ...gameForm, idMode: v as "single" | "dual" })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="dual">Player ID + Server ID (like Mobile Legends)</SelectItem>
                  <SelectItem value="single">Player ID only (like PUBG)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Auto name checker</Label>
              <Select
                value={gameForm.nickname_key}
                onValueChange={(v) => setGameForm({ ...gameForm, nickname_key: v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Off</SelectItem>
                  <SelectItem value="ml">Mobile Legends</SelectItem>
                  <SelectItem value="mcgg">Magic Chess GoGo</SelectItem>
                  <SelectItem value="pubgm">PUBG Mobile</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {!editingGame && (
              <div className="space-y-1.5">
                <Label className="text-xs">Category key (optional)</Label>
                <Input
                  value={gameForm.category_key}
                  onChange={(e) => setGameForm({ ...gameForm, category_key: e.target.value })}
                  placeholder="Free Fire Diamonds"
                />
                <p className="text-[10px] text-muted-foreground">
                  Leave empty to generate automatically. Packages are linked with this key.
                </p>
              </div>
            )}
            <div className="flex items-center justify-between rounded-xl border border-border/60 p-3">
              <Label className="text-xs">Show in Game Shop</Label>
              <Switch
                checked={gameForm.is_active}
                onCheckedChange={(v) => setGameForm({ ...gameForm, is_active: v })}
              />
            </div>

            {/* Card style settings */}
            <div className="rounded-xl border border-border/60 p-3 space-y-3">
              <p className="text-xs font-semibold">Store card style</p>
              <div className="space-y-1.5">
                <Label className="text-xs">Layout</Label>
                <Select
                  value={gameForm.card_style}
                  onValueChange={(v) => setGameForm({ ...gameForm, card_style: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Compact list card</SelectItem>
                    <SelectItem value="image">Image card (Supercell style)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Accent colour</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={gameForm.card_accent}
                    onChange={(e) => setGameForm({ ...gameForm, card_accent: e.target.value })}
                    className="h-9 w-12 rounded-md border border-border/60 bg-transparent p-1"
                  />
                  <Input
                    value={gameForm.card_accent}
                    onChange={(e) => setGameForm({ ...gameForm, card_accent: e.target.value })}
                    placeholder="#F5B301"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Price suffix</Label>
                <Input
                  value={gameForm.price_suffix}
                  onChange={(e) => setGameForm({ ...gameForm, price_suffix: e.target.value })}
                  placeholder="MMK"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-xs">Show discount badge</Label>
                <Switch
                  checked={gameForm.show_discount_badge}
                  onCheckedChange={(v) => setGameForm({ ...gameForm, show_discount_badge: v })}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={saveGame} disabled={saving} className="w-full">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Package dialog */}
      <Dialog open={pkgDialog} onOpenChange={setPkgDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{pkgForm.id ? "Edit package" : "Add package"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Package name</Label>
              <Input
                value={pkgForm.name}
                onChange={(e) => setPkgForm({ ...pkgForm, name: e.target.value })}
                placeholder="100 Diamonds"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Selling price (MMK)</Label>
                <Input
                  type="number"
                  value={pkgForm.price}
                  onChange={(e) => setPkgForm({ ...pkgForm, price: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Cost price</Label>
                <Input
                  type="number"
                  value={pkgForm.cost_price}
                  onChange={(e) => setPkgForm({ ...pkgForm, cost_price: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Image link</Label>
              <Input
                value={pkgForm.image_url}
                onChange={(e) => setPkgForm({ ...pkgForm, image_url: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Category / Tab</Label>
              <Select
                value={pkgForm.diamond_tier}
                onValueChange={(v) => setPkgForm({ ...pkgForm, diamond_tier: v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {tiersFor(pkgCategory).map((t) => (
                    <SelectItem key={t} value={t}>{tierLabel(t, pkgCategory)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground">
                Controls which tab this package appears under in the game shop.
              </p>
            </div>
            <div className="rounded-lg border bg-muted/40 p-3 space-y-2">
              <p className="text-xs font-semibold">⏳ Limited-time event (optional)</p>
              <div className="space-y-1.5">
                <Label className="text-xs">Event ends at</Label>
                <Input
                  type="datetime-local"
                  value={pkgForm.event_ends_at}
                  onChange={(e) => setPkgForm({ ...pkgForm, event_ends_at: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Timezone</Label>
                <Select
                  value={eventTz}
                  onValueChange={(tz) => {
                    const iso = zonedInputToISO(pkgForm.event_ends_at, eventTz);
                    setEventTz(tz);
                    if (iso) setPkgForm((f) => ({ ...f, event_ends_at: isoToZonedInput(iso, tz) }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {tzOptions.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {pkgForm.event_ends_at && (
                  <p className="text-[10px] text-muted-foreground">
                    Your time: {formatInViewerZone(zonedInputToISO(pkgForm.event_ends_at, eventTz))}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Event label</Label>
                <Input
                  placeholder="EVENT"
                  value={pkgForm.event_label}
                  onChange={(e) => setPkgForm({ ...pkgForm, event_label: e.target.value })}
                />
              </div>
              <p className="text-[10px] text-muted-foreground">
                User ဘက်မှာ item ပေါ်တွင် real-time countdown ပြပါမည်။
              </p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Description (optional)</Label>
              <Input
                value={pkgForm.description}
                onChange={(e) => setPkgForm({ ...pkgForm, description: e.target.value })}
                placeholder="Instant delivery"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Smile.One package ID (optional)</Label>
              <Input
                value={pkgForm.smile_package_id}
                onChange={(e) => setPkgForm({ ...pkgForm, smile_package_id: e.target.value })}
                placeholder="Leave empty for manual fulfilment"
              />
              <p className="text-[10px] text-muted-foreground">
                Not required. Packages work manually without a Smile.One ID.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={savePkg} disabled={saving} className="w-full">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save package"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MobileLayout>
  );
};

export default GameCatalogManage;
