// Shared KGameShop provider helpers. Server-side only — the API key never leaves the edge runtime.

export const KG_BASE_URL =
  (Deno.env.get('KGAMESHOP_BASE_URL') || 'https://admin.kokhantgaming.com/api/v1').replace(/\/+$/, '');

export const TELEGRAM_CHAT_ID = '7642545999';

export function getApiKey(): string | null {
  return Deno.env.get('KGAMESHOP_API_KEY') || null;
}

export interface KgResult<T = any> {
  ok: boolean;
  status: number;
  data: T | null;
  error: string | null;
}

export async function kgFetch<T = any>(
  path: string,
  init: { method?: string; body?: unknown; timeoutMs?: number } = {},
): Promise<KgResult<T>> {
  const key = getApiKey();
  if (!key) return { ok: false, status: 0, data: null, error: 'KGAMESHOP_API_KEY is not configured' };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), init.timeoutMs ?? 20000);
  try {
    const res = await fetch(`${KG_BASE_URL}${path}`, {
      method: init.method ?? 'GET',
      headers: {
        'X-API-Key': key,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      signal: controller.signal,
    });
    const text = await res.text();
    let parsed: any = null;
    try { parsed = text ? JSON.parse(text) : null; } catch { parsed = { raw: text }; }
    if (!res.ok) {
      console.error(`KGameShop ${path} failed [${res.status}]: ${text.slice(0, 500)}`);
      return { ok: false, status: res.status, data: parsed, error: text.slice(0, 500) || `HTTP ${res.status}` };
    }
    return { ok: true, status: res.status, data: parsed as T, error: null };
  } catch (e) {
    const msg = (e as Error).name === 'AbortError' ? 'Provider request timed out' : (e as Error).message;
    console.error(`KGameShop ${path} error: ${msg}`);
    return { ok: false, status: 0, data: null, error: msg };
  } finally {
    clearTimeout(timer);
  }
}

/** Reuses the existing Telegram bot / admin chat. Never throws. */
export async function notifyAdminTelegram(text: string): Promise<void> {
  try {
    const token = Deno.env.get('TELEGRAM_BOT_TOKEN');
    if (!token) return;
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text }),
    });
  } catch (e) {
    console.error('telegram notify failed', e);
  }
}

/** Provider outcome, independent of the local status vocabulary. */
export function providerOutcome(providerStatus: string): 'processing' | 'completed' | 'failed' {
  const s = (providerStatus || '').toLowerCase();
  if (['completed', 'success', 'delivered', 'done'].includes(s)) return 'completed';
  if (['failed', 'error', 'cancelled', 'canceled', 'refunded'].includes(s)) return 'failed';
  return 'processing';
}

/**
 * Maps a provider status onto the EXISTING local order status vocabulary
 * ('pending' | 'approved' | 'finished' | 'cancelled' | 'processing').
 * A provider failure deliberately returns the order to 'approved' so it falls
 * back into the normal manual workflow instead of a status the app cannot handle.
 */
export function mapProviderStatus(providerStatus: string): 'processing' | 'finished' | 'approved' {
  const outcome = providerOutcome(providerStatus);
  if (outcome === 'completed') return 'finished';
  if (outcome === 'failed') return 'approved';
  return 'processing';
}


export function shortId(id: string): string {
  return String(id).slice(0, 8).toUpperCase();
}
