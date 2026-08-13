import { useEffect, useState } from "react";
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
}


/** Loads the admin-managed list of games available in the Game Shop. */
export const useGameCatalog = (includeInactive = false) => {
  const [games, setGames] = useState<GameCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    let query = (supabase as any)
      .from("game_catalog")
      .select("*")
      .order("display_order", { ascending: true });
    if (!includeInactive) query = query.eq("is_active", true);
    const { data } = await query;
    setGames((data || []) as GameCatalogItem[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [includeInactive]);

  return { games, loading, reload: load };
};
