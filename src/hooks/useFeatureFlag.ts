import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Reads a boolean feature flag from public.feature_flags and keeps it in sync
 * via realtime. Defaults to `fallback` while loading or if the flag is missing.
 */
export const useFeatureFlag = (key: string, fallback = true) => {
  const [enabled, setEnabled] = useState<boolean>(fallback);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await (supabase as any)
      .from("feature_flags")
      .select("enabled")
      .eq("key", key)
      .maybeSingle();
    setEnabled(data ? Boolean(data.enabled) : fallback);
    setLoading(false);
  }, [key, fallback]);

  useEffect(() => {
    load();
    const channel = supabase
      .channel(`feature-flag-${key}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "feature_flags", filter: `key=eq.${key}` },
        () => load()
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [key, load]);

  const setFlag = useCallback(
    async (value: boolean, label?: string) => {
      const { error } = await (supabase as any)
        .from("feature_flags")
        .upsert({ key, enabled: value, label, updated_at: new Date().toISOString() }, { onConflict: "key" });
      if (!error) setEnabled(value);
      return error;
    },
    [key]
  );

  return { enabled, loading, setFlag, reload: load };
};
