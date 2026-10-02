import { useCallback, useEffect, useState } from "react";
import { AlertCircle, Loader2, Package, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

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
  const [state, setState] = useState<{ loading: boolean; result: Result | null }>(() =>
    cache.has(game) ? { loading: false, result: { ok: true, products: cache.get(game)! } } : { loading: true, result: null },
  );

  const load = useCallback(async () => {
    setState({ loading: !cache.has(game), result: cache.has(game) ? { ok: true, products: cache.get(game)! } : null });
    const result = await fetchProducts(game);
    setState({ loading: false, result });
  }, [game]);

  useEffect(() => { load(); }, [load]);

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
    <section className="space-y-2">
      <h3 className="text-sm font-bold">Products</h3>
      <div className="grid grid-cols-2 gap-2">
        {r.products.map((p) => (
          <div key={p.product_id} className="rounded-xl border border-border/60 bg-card p-3">
            <p className="text-sm font-semibold leading-tight">{p.name}</p>
            {p.bundle_summary && <p className="text-[10px] text-muted-foreground mt-0.5">{p.bundle_summary}</p>}
            <p className="text-xs font-bold text-primary mt-1">${p.price_usd.toFixed(2)}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
