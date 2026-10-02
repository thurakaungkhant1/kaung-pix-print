export const KGAMESHOP_PRODUCTS_URL = "https://study.kaungcomputer.com/api/kgameshop/products";

export interface KGameShopProduct {
  product_id: string;
  name: string;
  price_usd: number;
  is_bundle?: boolean;
  bundle_summary?: string;
}
// VPS game slugs whose player check/top-up needs a Server/Zone ID. All others use Player ID only.
export const KGAMESHOP_SERVER_GAMES = ["mobile-legends", "magic-chess"];
export const kgameshopNeedsServer = (game: string) => KGAMESHOP_SERVER_GAMES.includes(game);
