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

    // Update last_seen_at frequently so each user's real activity time is recorded.
    const touch = () =>
      supabase
        .from("profiles")
        .update({ last_seen_at: new Date().toISOString() })
        .eq("id", user.id);

    // Best-effort beacon touch on tab close / hide so we capture true exit time
    // even when normal async fetches get cancelled.
    const beaconTouch = () => {
      try {
        const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/profiles?id=eq.${user.id}`;
        const apikey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
        const token =
          (supabase as any)?.auth?.session?.()?.access_token ||
          JSON.parse(localStorage.getItem("sb-" + new URL(import.meta.env.VITE_SUPABASE_URL).host.split(".")[0] + "-auth-token") || "{}")?.access_token ||
          apikey;
        const body = JSON.stringify({ last_seen_at: new Date().toISOString() });
        const headers: Record<string, string> = {
          "content-type": "application/json",
          apikey,
          authorization: `Bearer ${token}`,
          prefer: "return=minimal",
        };
        // fetch with keepalive survives page unload; PATCH is required for PostgREST updates
        fetch(url, { method: "PATCH", headers, body, keepalive: true }).catch(() => {});
      } catch {
        // ignore — fall back to normal touch
      }
    };

    touch();
    lastSeenInterval = setInterval(touch, 30_000);

    const onVis = () => {
      if (document.visibilityState === "visible") touch();
      else beaconTouch();
    };
    const onHide = () => beaconTouch();
    const onFocus = () => touch();

    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("pagehide", onHide);
    window.addEventListener("beforeunload", onHide);
    window.addEventListener("focus", onFocus);

    return () => {
      channelStarted = false;
      if (lastSeenInterval) clearInterval(lastSeenInterval);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pagehide", onHide);
      window.removeEventListener("beforeunload", onHide);
      window.removeEventListener("focus", onFocus);
      beaconTouch();
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

// Telegram-style precise last-seen: "last seen today at 14:32",
// "last seen yesterday at 08:15", "last seen Mar 5 at 12:00",
// "last seen Mar 5, 2025 at 12:00" for older years.
export const formatLastSeenExact = (iso?: string | null): string => {
  if (!iso) return "last seen a long time ago";
  const then = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - then.getTime();
  if (diffMs < 60_000) return "last seen just now";

  const time = then.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const thenStart = new Date(then.getFullYear(), then.getMonth(), then.getDate()).getTime();
  const dayDiff = Math.round((startOfToday - thenStart) / 86_400_000);

  if (dayDiff <= 0) return `last seen today at ${time}`;
  if (dayDiff === 1) return `last seen yesterday at ${time}`;
  if (dayDiff < 7) {
    const wd = then.toLocaleDateString([], { weekday: "long" });
    return `last seen ${wd} at ${time}`;
  }
  const sameYear = then.getFullYear() === now.getFullYear();
  const date = then.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
  return `last seen ${date} at ${time}`;
};
