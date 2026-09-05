import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useGameCatalog, GameCatalogItem } from "@/hooks/useGameCatalog";

/**
 * Loads the Game Shop list from the KGameShop API (server-side edge function),
 * normalised into the exact same shape the existing Game Card UI already uses.
 * If the API is unavailable, the admin-managed catalog is used as fallback so
 * the UI never renders empty.
 */
export const useKGameShopGames = () => {
  const { games: catalogGames, loading: catalogLoading } = useGameCatalog();
  const [apiGames, setApiGames] = useState<GameCatalogItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error: fnError } = await supabase.functions.invoke("kgameshop-games");
        if (cancelled) return;
        if (fnError) throw fnError;
        if (data?.ok && Array.isArray(data.games) && data.games.length > 0) {
          setApiGames(data.games as GameCatalogItem[]);
          setError(null);
        } else {
          setApiGames(null);
          setError(data?.error ? String(data.error) : "empty");
        }
      } catch (e: any) {
        if (!cancelled) {
          setApiGames(null);
          setError(e?.message || "network_error");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const games = apiGames ?? catalogGames;

  return {
    games,
    loading: loading || catalogLoading,
    error,
    source: apiGames ? ("kgameshop" as const) : ("catalog" as const),
  };
};
