import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { isPopupActive, PUBLIC_EVENT_COLUMNS, type MlbbEvent } from "@/lib/mlbbEvents";
import MlbbEventDialog from "./MlbbEventDialog";

const DISMISS_KEY = "mlbb-popup-dismissed";
const readDismissed = (): string[] => {
  try { return JSON.parse(sessionStorage.getItem(DISMISS_KEY) || "[]"); } catch { return []; }
};
// Key includes the window so a re-scheduled popup shows again.
const keyOf = (e: MlbbEvent) => `${e.id}:${e.popup_starts_at}:${e.popup_ends_at}`;

/** Shows admin-scheduled MLBB events as a popup while inside their popup window. */
const MlbbEventPopup = () => {
  const { pathname } = useLocation();
  const [now, setNow] = useState(() => Date.now());
  const [dismissed, setDismissed] = useState<string[]>(readDismissed);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  const { data } = useQuery({
    queryKey: ["mlbb-events", "popup"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mlbb_events")
        .select(PUBLIC_EVENT_COLUMNS)
        .eq("review_status", "approved")
        .eq("popup_enabled", true)
        .gt("popup_ends_at", new Date().toISOString())
        .order("popup_starts_at", { ascending: true })
        .limit(10);
      if (error) throw error;
      return (data ?? []) as unknown as MlbbEvent[];
    },
    staleTime: 5 * 60_000,
  });

  const hiddenHere = pathname.startsWith("/auth") || pathname.startsWith("/admin") || pathname.startsWith("/.lovable");
  const current = useMemo(
    () => (data ?? []).find((e) => isPopupActive(e, now) && !dismissed.includes(keyOf(e))) ?? null,
    [data, now, dismissed],
  );

  const close = () => {
    if (!current) return;
    const next = [...dismissed, keyOf(current)];
    setDismissed(next);
    try { sessionStorage.setItem(DISMISS_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  };

  if (hiddenHere) return null;
  return (
    <MlbbEventDialog
      event={current}
      onClose={close}
      className="[&>button:last-child]:right-3 [&>button:last-child]:top-3 [&>button:last-child]:z-10 [&>button:last-child]:rounded-full [&>button:last-child]:bg-background/90 [&>button:last-child]:p-1.5 [&>button:last-child]:opacity-100 [&>button:last-child]:shadow-md"
    />
  );
};

export default MlbbEventPopup;
