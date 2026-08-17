/**
 * Small retry helper for backend calls that fail at the transport layer
 * ("Failed to fetch"). These are usually transient: a proxy hiccup, a paused
 * preview iframe, or a mobile network switching cells. Auth/API errors that
 * come back from the server are returned as-is and never retried.
 */

export const isTransportError = (error: unknown) => {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { message?: unknown; name?: unknown; status?: unknown };
  const message = typeof candidate.message === "string" ? candidate.message.toLowerCase() : "";
  const name = typeof candidate.name === "string" ? candidate.name.toLowerCase() : "";
  if (typeof candidate.status === "number" && candidate.status > 0) return false;
  return (
    message.includes("failed to fetch") ||
    message.includes("networkerror") ||
    message.includes("load failed") ||
    message.includes("network request failed") ||
    name === "typeerror" ||
    name.includes("fetcherror")
  );
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Runs `fn`, retrying only on transport-level failures. */
export async function withNetworkRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (!isTransportError(error) || attempt === attempts - 1) throw error;
      await wait(400 * (attempt + 1));
    }
  }
  throw lastError;
}
