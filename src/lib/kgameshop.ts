export const KGAMESHOP_PRODUCTS_URL = "https://study.kaungcomputer.com/api/kgameshop/products";

export interface KGameShopProduct {
  product_id: string;
  name: string;
  price_usd: number;
  is_bundle?: boolean;
  bundle_summary?: string;
}

// Account-field schema comes from the server (kgameshop-order ?schema=<game>); never hardcode it here.
export type KgField = { key: string; label: string; placeholder?: string };
export type KgSchema = { game: string; fields: KgField[]; verified: boolean };

const schemaCache = new Map<string, Promise<KgSchema>>();
export function fetchKgSchema(game: string): Promise<KgSchema> {
  if (!schemaCache.has(game)) {
    const base = import.meta.env.VITE_SUPABASE_URL;
    const p = fetch(`${base}/functions/v1/kgameshop-order?schema=${encodeURIComponent(game)}`, {
      headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((d) => ({ game, fields: Array.isArray(d.fields) ? d.fields : [], verified: !!d.verified }));
    p.catch(() => schemaCache.delete(game));
    schemaCache.set(game, p);
  }
  return schemaCache.get(game)!;
}
