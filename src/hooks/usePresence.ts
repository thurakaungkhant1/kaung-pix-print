import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// Lightweight global presence: a single channel tracks every online user id.
// Components can subscribe via `usePresenceMap()` to know who's online.
let onlineSet = new Set<string>();
const listeners = new Set<(s: Set<string>) => void>();
const notify = () => listeners.forEach((l) => l(new Set(onlineSet)));

let channelStarted = false;
let lastSeenInterval: ReturnType<typeof setInterval> | null = null;

export const useGlobalPresence = () => {
  const { user } = useAuth();
  useEffect(() => {
    if (!user || channelStarted) return;
    channelStarted = true;

    const channel = supabase.channel("presence:global", {
      config: { presence: { key: user.id } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        onlineSet = new Set(Object.keys(state));
        notify();
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ online_at: new Date().toISOString() });
        }
      });

    // Update last_seen_at periodically
    const touch = () =>
      supabase.from("profiles").update({ last_seen_at: new Date().toISOString() }).eq("id", user.id);
    touch();
    lastSeenInterval = setInterval(touch, 60_000);
    const onVis = () => document.visibilityState === "visible" && touch();
    document.addEventListener("visibilitychange", onVis);

    return () => {
      channelStarted = false;
      if (lastSeenInterval) clearInterval(lastSeenInterval);
      document.removeEventListener("visibilitychange", onVis);
      supabase.removeChannel(channel);
    };
  }, [user]);
};

export const usePresenceMap = () => {
  const [set, setSet] = useState<Set<string>>(new Set(onlineSet));
  useEffect(() => {
    const l = (s: Set<string>) => setSet(s);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);
  return set;
};

export const formatLastSeen = (iso?: string | null): string => {
  if (!iso) return "offline";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
};
