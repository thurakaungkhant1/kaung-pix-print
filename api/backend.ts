const ALLOWED_PATH = /^\/(auth|rest|storage|functions)\/v1(?:\/|$)/;

const DEFAULT_BACKEND_URL = "https://ojoenxchuzqonpixomkl.supabase.co";
const DEFAULT_PUBLISHABLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qb2VueGNodXpxb25waXhvbWtsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5MTg2NDUsImV4cCI6MjA3OTQ5NDY0NX0.zGVVOZMwMqHepUVa9gsja8DM7wUAnVSkxiPNefjTD58";

export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "authorization, apikey, content-type, prefer, range, x-client-info, x-supabase-api-version");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  const headerPath = req.headers["x-backend-path"];
  const queryPath = req.query?.path;
  const encodedQueryPath = req.query?.p;
  const requestUrl = new URL(req.url || "/api/backend", "https://gateway.local");
  let decodedPath = "";
  if (typeof encodedQueryPath === "string") {
    try {
      decodedPath = Buffer.from(encodedQueryPath, "base64url").toString("utf8");
    } catch {
      decodedPath = "";
    }
  }
  const rawPath = decodedPath || (typeof headerPath === "string"
    ? headerPath
    : typeof queryPath === "string"
      ? queryPath
      : requestUrl.searchParams.get("path") || "");
  const path = rawPath.startsWith("/") ? rawPath : `/${rawPath}`;
  const backendUrl = process.env.VITE_SUPABASE_URL || DEFAULT_BACKEND_URL;
  const publishableKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || DEFAULT_PUBLISHABLE_KEY;

  let target: URL;
  try {
    target = new URL(path, `${backendUrl}/`);
  } catch {
    res.status(400).json({ code: "invalid_gateway_request", message: "Invalid backend request" });
    return;
  }

  if (!ALLOWED_PATH.test(target.pathname) || target.origin !== new URL(backendUrl).origin) {
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
    const upstream = await fetch(target, {
      method: req.method,
      headers,
      body: req.method === "GET" || req.method === "HEAD"
        ? undefined
        : typeof req.body === "string" || req.body === undefined || req.body === null
          ? (req.body ?? undefined)
          : JSON.stringify(req.body),
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