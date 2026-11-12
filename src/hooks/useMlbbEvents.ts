import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PUBLIC_EVENT_COLUMNS, sortEvents, type MlbbEvent } from "@/lib/mlbbEvents";

/** Approved MLBB events only (admins can read more rows, so filter explicitly). */
export function useMlbbEvents() {
  return useQuery({
    queryKey: ["mlbb-events", "approved"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mlbb_events")
        .select(PUBLIC_EVENT_COLUMNS)
        .eq("review_status", "approved")
        .limit(200);
      if (error) throw error;
      return sortEvents((data ?? []) as unknown as MlbbEvent[]);
    },
    staleTime: 5 * 60_000,
  });
}

export function useMlbbLastSync() {
  return useQuery({
    queryKey: ["mlbb-events", "last-sync"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("mlbb_events_last_sync");
      if (error) throw error;
      return (data as string | null) ?? null;
    },
    staleTime: 10 * 60_000,
  });
}
