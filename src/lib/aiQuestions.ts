// Client-side AI question queue with sessionStorage caching + batched refills.
// Each game type fetches 20 at a time and refills when fewer than 5 remain.
import { supabase } from "@/integrations/supabase/client";

export type GameKind = "quiz" | "flag" | "math" | "word" | "typing";

const BATCH = 20;
const REFILL_THRESHOLD = 5;
const cacheKey = (g: GameKind) => `aiq:${g}`;
const inflight: Partial<Record<GameKind, Promise<void>>> = {};

function read<T>(g: GameKind): T[] {
  try {
    const raw = sessionStorage.getItem(cacheKey(g));
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch { return []; }
}
function write<T>(g: GameKind, items: T[]) {
  try { sessionStorage.setItem(cacheKey(g), JSON.stringify(items)); } catch {}
}

async function refill(g: GameKind) {
  if (inflight[g]) return inflight[g];
  inflight[g] = (async () => {
    try {
      const { data, error } = await supabase.functions.invoke("ai-game-content", {
        body: { game: g, count: BATCH },
      });
      if (error) throw error;
      const items = (data as { items?: unknown[] })?.items ?? [];
      if (items.length) {
        const existing = read<unknown>(g);
        write(g, [...existing, ...items]);
      }
    } catch (e) {
      console.error("[aiQuestions] refill failed", g, e);
    } finally {
      delete inflight[g];
    }
  })();
  return inflight[g];
}

/**
 * Pop next AI-generated item from cache. Triggers background refill when running low.
 * Returns null if cache is empty (caller should fall back to local data).
 */
export async function nextAIItem<T>(g: GameKind): Promise<T | null> {
  let items = read<T>(g);
  if (items.length <= REFILL_THRESHOLD) {
    void refill(g); // fire & forget
  }
  if (items.length === 0) {
    await refill(g);
    items = read<T>(g);
  }
  if (items.length === 0) return null;
  const [head, ...rest] = items;
  write(g, rest);
  return head;
}

/** Warm cache early (e.g. on game start screen). */
export function prefetchAI(g: GameKind) {
  const items = read<unknown>(g);
  if (items.length <= REFILL_THRESHOLD) void refill(g);
}
