const ALLOWED_PATH = /^\/(auth|rest|storage)\/v1(?:\/|$)/;

export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "authorization, apikey, content-type, prefer, range, x-client-info, x-supabase-api-version");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  const path = typeof req.query?.path === "string" ? req.query.path : "";
  const backendUrl = process.env.VITE_SUPABASE_URL;
  const publishableKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!backendUrl || !publishableKey || !ALLOWED_PATH.test(path)) {
    res.status(400).json({ code: "invalid_gateway_request", message: "Invalid backend request" });
    return;
  }

  const headers = new Headers();
  const forwarded = [
    "authorization",
    "content-type",
    "prefer",
    "range",
    "x-client-info",
    "x-supabase-api-version",
  ];
  for (const name of forwarded) {
    const value = req.headers[name];
    if (typeof value === "string") headers.set(name, value);
  }
  headers.set("apikey", publishableKey);

  try {
    const upstream = await fetch(`${backendUrl}${path}`, {
      method: req.method,
      headers,
      body: req.method === "GET" || req.method === "HEAD"
        ? undefined
        : JSON.stringify(req.body ?? {}),
      redirect: "manual",
    });
    const body = await upstream.arrayBuffer();
    const contentType = upstream.headers.get("content-type");
    if (contentType) res.setHeader("Content-Type", contentType);
    const contentRange = upstream.headers.get("content-range");
    if (contentRange) res.setHeader("Content-Range", contentRange);
    res.status(upstream.status).send(Buffer.from(body));
  } catch {
    res.status(503).json({ code: "backend_unreachable", message: "Login service is temporarily unreachable" });
  }
}