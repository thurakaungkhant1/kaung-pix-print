import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface GameCatalogItem {
  id: string;
  category_key: string;
  name: string;
  short_name: string | null;
  image_url: string | null;
  requires_server_id: boolean;
  nickname_key: string | null;
  display_order: number;
  is_active: boolean;
  /** Card layout used in the Game Shop: "default" (compact) or "image" (Supercell-style) */
  card_style?: string | null;
  /** Hex accent colour used for image cards */
  card_accent?: string | null;
  show_discount_badge?: boolean | null;
  price_suffix?: string | null;
  /** True when the row came from the KGameShop API instead of the manual catalog */
  source?: "manual" | "kgameshop";
}

/** Feature flag key controlling where the game list comes from. */
export const KGAMESHOP_FLAG = "kgameshop_game_list";

/** Loads the admin-managed list of games available in the Game Shop. */
export const useGameCatalog = (includeInactive = false) => {
  const [games, setGames] = useState<GameCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<"manual" | "kgameshop">("manual");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    // Which source should we use? (admin-controlled, persisted in feature_flags)
    const { data: flag } = await (supabase as any)
      .from("feature_flags")
      .select("enabled")
      .eq("key", KGAMESHOP_FLAG)
      .maybeSingle();
    const useKGameShop = Boolean(flag?.enabled);
    setSource(useKGameShop ? "kgameshop" : "manual");

    if (useKGameShop) {
      try {
        const { data, error: fnError } = await supabase.functions.invoke("kgameshop-games");
        if (fnError) throw fnError;
        if (!data?.ok) throw new Error(data?.error || "KGameShop request failed");
        const apiGames: GameCatalogItem[] = (data.games || []).map((g: any, i: number) => ({
          id: String(g.id),
          category_key: String(g.category_key ?? g.id),
          name: String(g.name),
          short_name: g.short_name ?? g.name,
          image_url: g.image_url ?? null,
          requires_server_id: false,
          nickname_key: null,
          display_order: typeof g.display_order === "number" ? g.display_order : i,
          is_active: true,
          card_style: "default",
          card_accent: null,
          show_discount_badge: false,
          price_suffix: null,
          source: "kgameshop" as const,
        }));
        setGames(apiGames);
      } catch (e: any) {
        console.error("Failed to load KGameShop games:", e);
        // Never silently fall back to manual games while KGameShop mode is ON.
        setGames([]);
        setError(e?.message || "Could not load games from KGameShop");
      } finally {
        setLoading(false);
      }
      return;
    }

    let query = (supabase as any)
      .from("game_catalog")
      .select("*")
      .order("display_order", { ascending: true });
    if (!includeInactive) query = query.eq("is_active", true);
    const { data, error: dbError } = await query;
    if (dbError) setError(dbError.message);
    setGames(((data || []) as GameCatalogItem[]).map((g) => ({ ...g, source: "manual" as const })));
    setLoading(false);
  }, [includeInactive]);

  useEffect(() => {
    load();
  }, [load]);

  return { games, loading, error, source, reload: load };
};
