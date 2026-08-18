// Loads promotional placement config through an edge function.
// The endpoint name intentionally avoids ad-related keywords so that
// browser extensions / DNS filters do not block the request.
export interface PromoPlacement {
  id: string;
  name: string;
  placement_type: string;
  zone_id: string | null;
  script_code: string | null;
  page_location: string;
  position: string;
  display_order?: number | null;
}

interface PromoConfig {
  placements: PromoPlacement[];
  settings: Record<string, string>;
}

let cache: Promise<PromoConfig> | null = null;

export const loadPromoConfig = (): Promise<PromoConfig> => {
  if (!cache) {
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/promo-config`;
    const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    cache = fetch(url, { headers: { apikey: key, Authorization: `Bearer ${key}` } })
      .then((r) => r.json())
      .then((d) => ({ placements: d?.placements ?? [], settings: d?.settings ?? {} }))
      .catch(() => ({ placements: [], settings: {} }));
  }
  return cache;
};
