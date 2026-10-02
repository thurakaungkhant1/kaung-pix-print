export const KGAMESHOP_PRODUCTS_URL = "https://study.kaungcomputer.com/api/kgameshop/products";

export interface KGameShopProduct {
  product_id: string;
  name: string;
  price_usd: number;
  is_bundle?: boolean;
  bundle_summary?: string;
}