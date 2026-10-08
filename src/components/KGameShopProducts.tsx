import { useCallback, useEffect, useState } from "react";
import { AlertCircle, Diamond, Loader2, Package, RefreshCw, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { KGAMESHOP_PRODUCTS_URL, type KGameShopProduct } from "@/lib/kgameshop";

export interface KGameShopPackage {
  id: number;
  name: string;
  price: number;
  image_url: string;
  description: string | null;
  category: string;
  points_value: number;
  kg: { game: string; product_id: string };
}

type Saved = { kgameshop_product_id?: string | null; price: number; name: string; kgameshop_region?: string | null };

const cache = new Map<string, KGameShopProduct[]>();
let rateCache: number | null = null;

export function KGameShopProducts({
  game,
  category,
  icon,
  saved,
  onSelect,
  onChooseAnother,
}: {
  game: string;
  category: string;
  icon?: string;
  saved: Saved[];
  onSelect: (product: KGameShopPackage) => void;
  onChooseAnother: () => void;
}) {
  const [items, setItems] = useState<KGameShopProduct[] | null>(cache.get(game) || null);
  const [rate, setRate] = useState<number | null>(rateCache);
  // Reseller discount for the signed-in user (RLS returns only their own row); server re-applies it.
  const [resellerUsd, setResellerUsd] = useState(0);
  useEffect(() => {
    (supabase as any).from("resellers").select("discount_usd").maybeSingle()
      .then(({ data }: any) => setResellerUsd(Number(data?.discount_usd || 0)));
  }, []);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    if (rateCache == null) {
      const { data } = await supabase.from("ad_settings").select("setting_value").eq("setting_key", "usd_to_mmk_rate").maybeSingle();
      rateCache = Number(data?.setting_value || 4500);
      setRate(rateCache);
    }
    if (cache.has(game)) { setItems(cache.get(game)!); return; }
    setLoading(true);
    try {
      const res = await fetch(`${KGAMESHOP_PRODUCTS_URL}?game=${encodeURIComponent(game)}`, { headers: { Accept: "application/json" } });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || body?.ok === false) {
        const code = body?.error || body?.message || `Request failed (${res.status})`;
        throw new Error(code === "game_disabled" ? "Products are currently unavailable for this game." : String(code));
      }
      const list = (Array.isArray(body) ? body : body?.products || body?.data || []).map((p: any) => ({
        product_id: String(p.product_id), name: String(p.name), price_usd: Number(p.price_usd || 0), bundle_summary: p.bundle_summary,
      }));
      cache.set(game, list);
      setItems(list);
    } catch (e: any) {
      setError(e?.message || "Could not load packages");
    } finally {
      setLoading(false);
    }
  }, [game]);

  useEffect(() => { setItems(cache.get(game) || null); void load(); }, [game, load]);

  if (loading || (!items && !error)) {
    return <div className="flex items-center justify-center gap-2 rounded-2xl border border-border/60 bg-card p-6 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading packages…</div>;
  }

  if (error || !items || items.length === 0) {
    return (
      <div className="rounded-2xl border border-border/60 bg-card p-5 text-center space-y-3">
        {error ? <AlertCircle className="h-8 w-8 mx-auto text-destructive" /> : <Package className="h-8 w-8 mx-auto text-muted-foreground" />}
        <p className="text-sm font-semibold">{error || "Packages are currently unavailable"}</p>
        <div className="flex justify-center gap-2">
          {error && <Button size="sm" variant="outline" onClick={() => { cache.delete(game); void load(); }} className="rounded-full"><RefreshCw className="h-3.5 w-3.5 mr-1" />Retry</Button>}
          <Button size="sm" onClick={onChooseAnother} className="rounded-full">Choose another game</Button>
        </div>
      </div>
    );
  }

  const r = rate || 4500;
  const discount = Math.round(resellerUsd * r);
  const packages: KGameShopPackage[] = items.map((p, i) => {
    const s = saved.find((x) => x.kgameshop_product_id === p.product_id && x.kgameshop_region !== "auto");
    return {
      id: -(i + 1),
      name: s?.name || p.name,
      price: Math.max((s ? Number(s.price) : Math.round(p.price_usd * r)) - discount, 0),
      image_url: icon || "/placeholder.svg",
      description: p.bundle_summary || null,
      category,
      points_value: 0,
      kg: { game, product_id: p.product_id },
    };
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between rounded-xl border border-border/50 bg-muted/40 px-3.5 py-2.5">
        <div className="flex items-center gap-2">
          <Diamond className="h-4 w-4 text-primary" />
          <p className="text-xs font-bold">Available Packages · {packages.length}</p>
        </div>
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary">
          <Zap className="h-3 w-3" /> Auto top-up
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
        {packages.map((product) => (
          <Button
            key={product.kg.product_id}
            type="button"
            variant="outline"
            onClick={() => onSelect(product)}
            className="group relative h-auto min-h-32 flex-col items-stretch justify-start overflow-hidden rounded-2xl border-border/60 bg-card p-3 text-left shadow-sm hover:border-primary/50"
          >
            <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
              <Diamond className="h-4 w-4 text-primary" />
            </div>
            <p className="whitespace-normal text-sm font-bold leading-tight text-foreground">{product.name}</p>
            {product.description && <p className="mt-1 line-clamp-2 whitespace-normal text-[10px] text-muted-foreground">{product.description}</p>}
            <div className="mt-auto w-full border-t border-border/50 pt-2">
              <p className="text-sm font-bold tabular-nums text-primary">
                {product.price.toLocaleString()} <span className="text-[10px] font-medium text-muted-foreground">MMK</span>
              </p>
            </div>
          </Button>
        ))}
      </div>
    </div>
  );
}
