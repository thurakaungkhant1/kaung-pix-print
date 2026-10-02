import { useCallback, useEffect, useState } from "react";
import { AlertCircle, Diamond, Loader2, Package, RefreshCw, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const KGAMESHOP_PRODUCTS_URL = "https://study.kaungcomputer.com/api/kgameshop/products";

export interface KGameShopProduct {
  product_id: string;
  name: string;
  price_usd: number;
  is_bundle?: boolean;
  bundle_summary?: string;
}

type Result = { ok: true; products: KGameShopProduct[] } | { ok: false; error: string; code?: string };

// Per-game in-memory cache (lives for the session). Only successful results are cached.
const cache = new Map<string, KGameShopProduct[]>();
const inflight = new Map<string, Promise<Result>>();

async function fetchProducts(game: string): Promise<Result> {
  if (cache.has(game)) return { ok: true, products: cache.get(game)! };
  if (inflight.has(game)) return inflight.get(game)!;
  const p = (async (): Promise<Result> => {
    try {
      const res = await fetch(`${KGAMESHOP_PRODUCTS_URL}?game=${encodeURIComponent(game)}`);
      let body: any = null;
      try { body = await res.json(); } catch { /* non-JSON */ }
      if (!res.ok || !body || body.ok === false) {
        const code = String(body?.error ?? body?.code ?? "");
        return { ok: false, code, error: body?.message || code || `Request failed (${res.status})` };
      }
      const list = Array.isArray(body) ? body : Array.isArray(body.products) ? body.products : Array.isArray(body.data) ? body.data : [];
      const products: KGameShopProduct[] = list
        .filter((x: any) => x && x.product_id != null)
        .map((x: any) => ({
          product_id: String(x.product_id),
          name: String(x.name ?? "Product"),
          price_usd: Number(x.price_usd ?? 0),
          is_bundle: !!x.is_bundle,
          bundle_summary: x.bundle_summary,
        }));
      cache.set(game, products);
      return { ok: true, products };
    } catch (e: any) {
      return { ok: false, error: e?.message || "Network error" };
    } finally {
      inflight.delete(game);
    }
  })();
  inflight.set(game, p);
  return p;
}

export function KGameShopProducts({ game, onChooseAnother }: { game: string; onChooseAnother: () => void }) {
  const [usdToMmkRate, setUsdToMmkRate] = useState(4500);
  const [state, setState] = useState<{ loading: boolean; result: Result | null }>(() =>
    cache.has(game) ? { loading: false, result: { ok: true, products: cache.get(game)! } } : { loading: true, result: null },
  );

  const load = useCallback(async () => {
    setState({ loading: !cache.has(game), result: cache.has(game) ? { ok: true, products: cache.get(game)! } : null });
    const result = await fetchProducts(game);
    setState({ loading: false, result });
  }, [game]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    let active = true;
    supabase
      .from("ad_settings")
      .select("setting_value")
      .eq("setting_key", "usd_to_mmk_rate")
      .maybeSingle()
      .then(({ data }) => {
        const value = Number(data?.setting_value);
        if (active && Number.isFinite(value) && value > 0) setUsdToMmkRate(value);
      });
    return () => { active = false; };
  }, []);

  if (state.loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading products…
      </div>
    );
  }

  const r = state.result;
  if (!r || !r.ok) {
    const err = r as { error?: string; code?: string } | null;
    const disabled = /disabled|unavailable/i.test(`${err?.code ?? ""} ${err?.error ?? ""}`);
    return (
      <div className="rounded-2xl border border-border/60 bg-card p-5 text-center space-y-3">
        <AlertCircle className="h-8 w-8 mx-auto text-destructive" />
        <p className="text-sm font-semibold">
          {disabled ? "Products are currently unavailable for this game" : "Could not load products"}
        </p>
        <p className="text-xs text-muted-foreground">
          {disabled ? "ဒီဂိမ်းအတွက် package တွေ လောလောဆယ် မရနိုင်ပါ။ တခြားဂိမ်း ရွေးပါ။" : err?.error ?? ""}
        </p>
        <div className="flex justify-center gap-2">
          {!disabled && (
            <Button size="sm" variant="outline" onClick={load} className="rounded-full gap-1">
              <RefreshCw className="h-3.5 w-3.5" /> Try again
            </Button>
          )}
          <Button size="sm" onClick={onChooseAnother} className="rounded-full">Choose another game</Button>
        </div>
      </div>
    );
  }

  if (r.products.length === 0) {
    return (
      <div className="rounded-2xl border border-border/60 bg-card p-5 text-center space-y-3">
        <Package className="h-8 w-8 mx-auto text-muted-foreground" />
        <p className="text-sm font-semibold">No products for this game yet</p>
        <Button size="sm" onClick={onChooseAnother} className="rounded-full">Choose another game</Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between rounded-xl border border-border/50 bg-muted/40 px-3.5 py-2.5">
        <div className="flex items-center gap-2">
          <Diamond className="h-4 w-4 text-primary" />
          <p className="text-xs font-bold">Available Packages</p>
        </div>
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary">
          <Zap className="h-3 w-3" /> Instant
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
        {r.products.map((p) => (
          <div key={p.product_id} className="relative flex min-h-28 flex-col overflow-hidden rounded-2xl border border-border/60 bg-card p-3 text-left shadow-sm">
            <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
              <Diamond className="h-4 w-4 text-primary" />
            </div>
            <p className="text-sm font-bold leading-tight text-foreground">{p.name}</p>
            {p.bundle_summary && <p className="mt-1 line-clamp-2 text-[10px] text-muted-foreground">{p.bundle_summary}</p>}
            <div className="mt-auto border-t border-border/50 pt-2">
              <p className="text-sm font-bold tabular-nums text-primary">
                {Math.round(p.price_usd * usdToMmkRate).toLocaleString()} <span className="text-[10px] font-medium text-muted-foreground">MMK</span>
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
