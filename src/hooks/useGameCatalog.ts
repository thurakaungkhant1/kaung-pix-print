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

/** When enabled (default), manual games stay visible alongside KGameShop games. */
export const KGAMESHOP_MERGE_FLAG = "kgameshop_merge_manual";

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
    const { data: flags } = await (supabase as any)
      .from("feature_flags")
      .select("key, enabled")
      .in("key", [KGAMESHOP_FLAG, KGAMESHOP_MERGE_FLAG]);
    const flagMap = new Map<string, boolean>(((flags || []) as any[]).map((f) => [f.key, Boolean(f.enabled)]));
    const useKGameShop = flagMap.get(KGAMESHOP_FLAG) === true;
    // Merge defaults to ON so manual games never disappear unexpectedly.
    const mergeManual = flagMap.get(KGAMESHOP_MERGE_FLAG) !== false;
    setSource(useKGameShop ? "kgameshop" : "manual");

    const loadManual = async (): Promise<GameCatalogItem[]> => {
      let query = (supabase as any)
        .from("game_catalog")
        .select("*")
        .order("display_order", { ascending: true });
      if (!includeInactive) query = query.eq("is_active", true);
      const { data, error: dbError } = await query;
      if (dbError) throw dbError;
      return ((data || []) as GameCatalogItem[]).map((g) => ({ ...g, source: "manual" as const }));
    };

    if (useKGameShop) {
      const manual = mergeManual ? await loadManual().catch(() => []) : [];
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
        const seen = new Set(manual.map((m) => m.category_key.toLowerCase()));
        setGames([...manual, ...apiGames.filter((g) => !seen.has(g.category_key.toLowerCase()))]);
      } catch (e: any) {
        console.error("Failed to load KGameShop games:", e);
        setGames(manual);
        // Only block the shop when there is nothing else to show.
        setError(manual.length ? null : e?.message || "Could not load games from KGameShop");
      } finally {
        setLoading(false);
      }
      return;
    }

    try {
      setGames(await loadManual());
    } catch (e: any) {
      setError(e?.message || "Could not load games");
    }
    setLoading(false);
  }, [includeInactive]);

  useEffect(() => {
    load();
  }, [load]);

  return { games, loading, error, source, reload: load };
};
