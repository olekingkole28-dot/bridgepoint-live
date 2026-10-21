const UPSTREAM_ROOT = "https://pointcloud.ucsd.edu/archive_temp/oh3d_store/oh3d-vis/datasets/90yg-1054/potree/";
const FUNCTION_SLUG = "bridgepoint-lincoln-lidar-proxy-v5987";
const PROJECT_URL = Deno.env.get("SUPABASE_URL") ?? "https://xdfsjztwgsbmabshzsjw.supabase.co";
const STORAGE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SECRET_KEY") ?? "";
const BUCKET = "lincoln-memorial-lidar-cache";
const CACHE_PREFIX = "pointcloud-v5987/";
const MAX_CACHE_BYTES = 24 * 1024 * 1024;
const CORS: Record<string,string> = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, HEAD, OPTIONS",
  "access-control-allow-headers": "authorization, apikey, x-client-info, content-type, range, if-range, if-none-match, if-modified-since, accept",
  "access-control-expose-headers": "accept-ranges, content-range, content-length, content-type, etag, last-modified, x-bp-lincoln-cache",
  "access-control-max-age": "86400",
  "cache-control": "no-store",
};
function encodePath(path: string) {
  return path.split("/").map((part) => encodeURIComponent(part)).join("/");
}
function storageUrl(path: string, write = false) {
  const mode = write ? "object" : "object/authenticated";
  return PROJECT_URL + "/storage/v1/" + mode + "/" + BUCKET + "/" + encodePath(path);
}
function storageHeaders(extra: Record<string,string> = {}) {
  const headers = new Headers(extra);
  if (STORAGE_KEY) {
    headers.set("apikey", STORAGE_KEY);
    headers.set("authorization", "Bearer " + STORAGE_KEY);
  }
  return headers;
}
function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...CORS, "content-type": "application/json" } });
}
function rangeLabel(value: string | null) {
  if (!value) return "";
  return value.replace(/^bytes=/i, "").replace(/[^0-9,-]/g, "_").slice(0, 180);
}
function cacheKey(rel: string, range: string | null) {
  return CACHE_PREFIX + rel + (range ? ".__range_" + rangeLabel(range) : "");
}
function cacheHeaders(source: Headers) {
  const headers: Record<string,string> = {};
  for (const name of ["content-range","content-type","etag","last-modified","accept-ranges","cache-control","content-encoding"]) {
    const value = source.get(name);
    if (value) headers[name] = value;
  }
  return headers;
}
async function readCached(key: string, method: string) {
  if (!STORAGE_KEY) return null;
  try {
    const metaResponse = await fetch(storageUrl(key + ".meta"), { method: "GET", headers: storageHeaders() });
    if (!metaResponse.ok) return null;
    const meta = await metaResponse.json();
    if (!meta || ![200,206,304].includes(Number(meta.status))) return null;
    const bytesResponse = await fetch(storageUrl(key), { method: "GET", headers: storageHeaders() });
    if (!bytesResponse.ok) return null;
    const headers = new Headers(CORS);
    for (const [name,value] of Object.entries(meta.headers || {})) {
      if (typeof value === "string") headers.set(name, value);
    }
    const blobSize = bytesResponse.headers.get("content-length");
    if (blobSize) headers.set("content-length", blobSize);
    headers.set("x-bp-lincoln-cache", "HIT");
    headers.set("cache-control", "public, max-age=3600");
    return new Response(method === "HEAD" ? null : bytesResponse.body, { status: Number(meta.status), headers });
  } catch (_) { return null; }
}
async function storeCached(key: string, response: Response) {
  if (!STORAGE_KEY || (!response.ok && response.status !== 206)) return;
  const rawLength = Number(response.headers.get("content-length") || 0);
  const range = response.headers.get("content-range");
  const rangeMatch = range ? range.match(/bytes\s+(\d+)-(\d+)\/(\d+|\*)/i) : null;
  const inferredLength = rangeMatch ? Number(rangeMatch[2]) - Number(rangeMatch[1]) + 1 : 0;
  const length = rawLength || inferredLength;
  if (!length || length > MAX_CACHE_BYTES) return;
  const data = await response.arrayBuffer();
  if (data.byteLength > MAX_CACHE_BYTES) return;
  const meta = {
    status: response.status,
    headers: cacheHeaders(response.headers),
    bytes: data.byteLength,
    cachedAt: new Date().toISOString(),
    license: "CC BY-NC-SA 4.0",
    attribution: "CyArk / DJS Associates; distributed by Open Heritage 3D; DOI 10.26301/90yg-1054",
  };
  const dataUpload = await fetch(storageUrl(key, true), {
    method: "POST",
    headers: storageHeaders({ "content-type": "application/octet-stream", "x-upsert": "true", "cache-control": "public, max-age=3600" }),
    body: data,
  });
  if (!dataUpload.ok) {
    const message = await dataUpload.text().catch(() => "");
    console.warn("Lincoln cache data upload failed", dataUpload.status, message.slice(0, 300));
    return;
  }
  const metaUpload = await fetch(storageUrl(key + ".meta", true), {
    method: "POST",
    headers: storageHeaders({ "content-type": "application/octet-stream", "x-upsert": "true" }),
    body: JSON.stringify(meta),
  });
  if (!metaUpload.ok) {
    const message = await metaUpload.text().catch(() => "");
    console.warn("Lincoln cache metadata upload failed", metaUpload.status, message.slice(0, 300));
  }
}
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (!["GET","HEAD"].includes(req.method)) return new Response("Method not allowed", { status: 405, headers: CORS });
  const incoming = new URL(req.url);
  const path = incoming.pathname;
  const marker = "/" + FUNCTION_SLUG + "/";
  let rel = "";
  const markerAt = path.lastIndexOf(marker);
  if (markerAt >= 0) rel = path.slice(markerAt + marker.length);
  else if (path.includes("/functions/v1/")) {
    const pieces = path.split("/").filter(Boolean);
    const at = pieces.lastIndexOf(FUNCTION_SLUG);
    if (at >= 0) rel = pieces.slice(at + 1).join("/");
  } else rel = path.replace(/^\/+/, "");
  if (!rel) rel = incoming.searchParams.get("path") || "";
  try { rel = decodeURIComponent(rel); } catch { return new Response("Bad path encoding", { status: 400, headers: CORS }); }
  rel = rel.replace(/^\/+/, "");
  const parts = rel.split("/");
  if (!rel.startsWith("90yg-1054_lidar_terrestrial/") ||
      parts.some((p) => !p || p === "." || p === ".." || !/^[A-Za-z0-9._~-]+$/.test(p))) {
    return new Response("Only approved Lincoln Memorial terrestrial LiDAR paths are available", { status: 400, headers: CORS });
  }
  const range = req.headers.get("range");
  const key = cacheKey(rel, range);
  const cached = await readCached(key, req.method);
  if (cached) return cached;

  const upstreamHeaders = new Headers();
  for (const name of ["range","if-range","if-none-match","if-modified-since","accept"]) {
    const value = req.headers.get(name);
    if (value) upstreamHeaders.set(name, value);
  }
  const upstreamQuery = new URLSearchParams(incoming.searchParams);
  upstreamQuery.delete("path");
  const query = upstreamQuery.toString();
  try {
    const upstream = await fetch(UPSTREAM_ROOT + rel + (query ? "?" + query : ""), {
      method: req.method, headers: upstreamHeaders, redirect: "follow", signal: AbortSignal.timeout(55000),
    });
    const out = new Headers(CORS);
    for (const name of ["accept-ranges","content-range","content-length","content-type","etag","last-modified"]) {
      const value = upstream.headers.get(name);
      if (value) out.set(name,value);
    }
    out.set("x-bp-lincoln-cache", "MISS");
    if (upstream.status === 206) out.set("cache-control", "public, max-age=3600");
    if (req.method === "GET" && (upstream.status === 200 || upstream.status === 206)) {
      const cachePromise = storeCached(key, upstream.clone()).catch((error) => console.warn("Lincoln cache task failed", String(error)));
      const runtime = (globalThis as unknown as { EdgeRuntime?: { waitUntil?: (promise: Promise<unknown>) => void } }).EdgeRuntime;
      if (runtime?.waitUntil) runtime.waitUntil(cachePromise);
      else await cachePromise;
    }
    return new Response(req.method === "HEAD" ? null : upstream.body, { status: upstream.status, headers: out });
  } catch (error) {
    return json({ error: "LINCOLN_SCAN_UPSTREAM_UNAVAILABLE", detail: String(error) }, 502);
  }
});
