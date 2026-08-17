const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info, prefer, range",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD",
  "Access-Control-Expose-Headers": "content-range, content-type, location, sb-gateway-version",
};

const allowedPrefixes = ["/auth/v1/", "/rest/v1/", "/storage/v1/", "/realtime/v1/", "/functions/v1/"];

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const backendUrl = Deno.env.get("SUPABASE_URL");
    if (!backendUrl) throw new Error("Backend URL is unavailable");

    const requestUrl = new URL(request.url);
    const path = requestUrl.searchParams.get("path") || "";
    if (!allowedPrefixes.some((prefix) => path.startsWith(prefix))) {
      return new Response(JSON.stringify({ message: "Invalid backend path" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const target = new URL(path, backendUrl);
    for (const [key, value] of requestUrl.searchParams) {
      if (key !== "path") target.searchParams.append(key, value);
    }

    const headers = new Headers(request.headers);
    headers.delete("host");
    headers.delete("origin");
    headers.delete("referer");
    headers.delete("content-length");

    const response = await fetch(target, {
      method: request.method,
      headers,
      body: request.method === "GET" || request.method === "HEAD" ? undefined : request.body,
      redirect: "manual",
    });

    const responseHeaders = new Headers(response.headers);
    for (const [key, value] of Object.entries(corsHeaders)) responseHeaders.set(key, value);

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("backend-proxy failed", error);
    return new Response(JSON.stringify({ message: "Backend proxy unavailable", code: "proxy_unavailable" }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});