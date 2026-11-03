const ADSB_ROOT = "https://api.adsb.lol/v2/";
const LAYER400_ROOT = "https://layer400.com/business/api/v1/live/rid";
const FLYITALY_ROOT = "https://api.flyitalyadsb.com/v2/";
const PUBLISHABLE_KEY = "sb_publishable_lM9oWQeHjBmgOIiteeOicQ_PTyAeF25";
const ALLOWED_ORIGINS = new Set([
  "https://bridgepointintelligence.online",
  "https://www.bridgepointintelligence.online",
  "https://olekingkole28-dot.github.io",
]);
const CACHE_TTL_MS = 45_000;
const REQUEST_TIMEOUT_MS = 8_000;
const MAX_REMOTE_ID_PAGES = 3;
const cache = new Map<string, { at: number; body: unknown }>();
const inflight = new Map<string, Promise<{ status: number; body: unknown }>>();
const rate = new Map<string, { start: number; count: number }>();

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
function json(body: unknown, status: number, origin: string, cacheSeconds = 20) {
  const allowOrigin = ALLOWED_ORIGINS.has(origin) ? origin : "https://bridgepointintelligence.online";
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": cacheSeconds > 0 ? `public, max-age=${cacheSeconds}, stale-while-revalidate=30` : "no-store",
      "access-control-allow-origin": allowOrigin,
      "access-control-allow-methods": "GET, OPTIONS",
      "access-control-allow-headers": "apikey, authorization, x-client-info, content-type",
      "access-control-expose-headers": "x-bridgepoint-drone-version, x-bridgepoint-cache",
      "access-control-max-age": "86400",
      "vary": "Origin",
      "x-bridgepoint-drone-version": "1",
    },
  });
}
function validateOrigin(origin: string) {
  if (!origin) return true;
  if (ALLOWED_ORIGINS.has(origin)) return true;
  try {
    const parsed = new URL(origin);
    return (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") &&
      (parsed.protocol === "http:" || parsed.protocol === "https:");
  } catch {
    return false;
  }
}
function checkRateLimit(req: Request) {
  const forwarded = req.headers.get("x-forwarded-for") || "";
  const ip = (forwarded.split(",")[0] || req.headers.get("cf-connecting-ip") || "unknown").trim().slice(0, 80);
  const now = Date.now();
  const prior = rate.get(ip);
  if (!prior || now - prior.start >= 60_000) {
    rate.set(ip, { start: now, count: 1 });
    return true;
  }
  prior.count++;
  return prior.count <= 120;
}
function bboxForRadius(lat: number, lon: number, radiusNm: number) {
  const latDelta = radiusNm / 60;
  const lonDelta = Math.min(15, radiusNm / (60 * Math.max(0.05, Math.cos(lat * Math.PI / 180))));
  const south = clamp(lat - latDelta, -90, 90);
  const north = clamp(lat + latDelta, -90, 90);
  const west = clamp(lon - lonDelta, -180, 180);
  const east = clamp(lon + lonDelta, -180, 180);
  return [west, south, east, north].map((v) => Number(v.toFixed(5))).join(",");
}
function remoteIdRows(records: any[]) {
  const now = Date.now();
  const out: any[] = [];
  for (const row of records) {
    if (!row || typeof row !== "object") continue;
    if (row.simulated === true || row.is_simulated === true || row.test_broadcast === true) continue;
    if (String(row.track_kind || "").toLowerCase() !== "drone") continue;
    const lat = Number(row.latitude);
    const lon = Number(row.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) continue;
    const key = String(row.public_track_id || "").trim();
    if (!key) continue;
    const observedAt = Date.parse(String(row.observed_at || ""));
    if (!Number.isFinite(observedAt) || observedAt > now + 30_000 || now - observedAt > 240_000) continue;
    const staleAt = row.stale_after == null ? NaN : Date.parse(String(row.stale_after));
    if (Number.isFinite(staleAt) && staleAt <= now) continue;
    const ageSeconds = Math.max(0, (now - observedAt) / 1000);
    const altitude = row.altitude_m == null ? null : Number(row.altitude_m);
    const agl = row.height_agl_m == null ? null : Number(row.height_agl_m);
    const speed = row.speed_mps == null ? null : Number(row.speed_mps);
    const heading = row.heading_deg == null ? null : Number(row.heading_deg);
    out.push({
      hex: key,
      icao24: key,
      category: "UAV",
      typeDescription: "Remote ID broadcast unmanned aircraft",
      t: "UAV",
      lat,
      lon,
      remote_id_altitude_m: Number.isFinite(altitude) ? altitude : null,
      height_agl_m: Number.isFinite(agl) && agl >= 0 && agl <= 5000 ? agl : null,
      gs: Number.isFinite(speed) && speed >= 0 ? speed * 1.943844 : null,
      track: Number.isFinite(heading) ? heading : null,
      seen_pos: ageSeconds,
      seen: ageSeconds,
      observed_at: new Date(observedAt).toISOString(),
      stale_after: Number.isFinite(staleAt) ? new Date(staleAt).toISOString() : null,
      receiver_count: Number.isFinite(Number(row.receiver_count)) ? Number(row.receiver_count) : null,
      track_kind: "drone",
      simulated: false,
      test_broadcast: false,
      _bpSourceName: "Layer400 Remote ID",
      _bpRemoteId: true,
    });
  }
  return out;
}
async function fetchAdsb(lat: number, lon: number, radius: number) {
  const url = ADSB_ROOT + "lat/" + lat.toFixed(4) + "/lon/" + lon.toFixed(4) + "/dist/" + radius;
  const response = await fetch(url, {
    headers: {
      accept: "application/json",
      "user-agent": "BridgePoint-Intelligence/1.0 (+https://bridgepointintelligence.online)",
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error("ADSB.lol HTTP " + response.status);
  const payload = await response.json();
  if (!payload || !Array.isArray(payload.ac)) throw new Error("ADSB.lol returned an invalid aircraft response");
  return {
    records: payload.ac,
    total: Number.isFinite(Number(payload.total)) ? Number(payload.total) : payload.ac.length,
    url,
  };
}
function flyItalyUavRecord(row: any) {
  if (!row || typeof row !== "object") return false;
  const category = String(row.category || row.emitter_category || "").trim().toUpperCase();
  if (category === "B6" || category === "14" || category === "UAV") return true;
  const ecat = Number(row.ecat ?? row.flarm_ecat);
  if (Number.isFinite(ecat) && ecat === 13) return true;
  const description = [row.desc, row.description, row.typeDescription, row.type, row.t]
    .filter(Boolean).join(" ");
  return /\b(?:UAV|UAS|UNMANNED AERIAL|UNMANNED AIRCRAFT|DRONE)\b/i.test(description);
}
async function fetchFlyItaly(lat: number, lon: number, radiusNm: number, apiKey: string) {
  const radiusKm = Math.min(500, Math.ceil(radiusNm * 1.852));
  const url = FLYITALY_ROOT + "lat/" + lat.toFixed(4) + "/lon/" + lon.toFixed(4) + "/dist/" + radiusKm;
  const response = await fetch(url, {
    headers: {
      accept: "application/json",
      "X-Api-Key": apiKey,
      "user-agent": "BridgePoint-Intelligence/1.0 (+https://bridgepointintelligence.online)",
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error("FlyItalyADSB HTTP " + response.status);
  const payload = await response.json();
  if (!payload || !Array.isArray(payload.ac)) throw new Error("FlyItalyADSB returned an invalid aircraft response");
  const accepted = payload.ac.filter(flyItalyUavRecord).map((row: any) => ({
    ...row,
    _bpSourceName: "FlyItalyADSB ADS-B/OGN",
    _bpUavEvidence: String(row.category || row.emitter_category || row.ecat || row.flarm_ecat || row.type || row.t || "UAV record"),
  }));
  return {
    records: accepted,
    received: payload.ac.length,
    total: Number.isFinite(Number(payload.total)) ? Number(payload.total) : payload.ac.length,
    url,
    radiusKm,
    plan: response.headers.get("x-fia-plan"),
    limitPerMinute: response.headers.get("x-fia-limit-per-min"),
    remainingMonthlyQuota: response.headers.get("x-fia-quota-month") && response.headers.get("x-fia-used-month")
      ? Math.max(0, Number(response.headers.get("x-fia-quota-month")) - Number(response.headers.get("x-fia-used-month")))
      : null,
  };
}
async function fetchLayer400(lat: number, lon: number, radius: number, apiKey: string) {
  const bbox = bboxForRadius(lat, lon, radius);
  const records: any[] = [];
  let cursor: string | null = null;
  let pages = 0;
  let truncated = false;
  let quotaRemaining: string | null = null;
  while (pages < MAX_REMOTE_ID_PAGES) {
    const url = new URL(LAYER400_ROOT);
    url.searchParams.set("bbox", bbox);
    url.searchParams.set("limit", "1000");
    if (cursor) url.searchParams.set("cursor", cursor);
    const response = await fetch(url, {
      headers: {
        accept: "application/json",
        authorization: "Bearer " + apiKey,
        "user-agent": "BridgePoint-Intelligence/1.0 (live Remote ID map)",
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    quotaRemaining = response.headers.get("x-ratelimit-remaining") ||
      response.headers.get("x-dailyLimit-remaining") || quotaRemaining;
    if (!response.ok) throw new Error("Layer400 Remote ID HTTP " + response.status);
    const payload = await response.json();
    if (!payload || !Array.isArray(payload.data)) throw new Error("Layer400 Remote ID returned an invalid data response");
    records.push(...payload.data);
    pages++;
    cursor = typeof payload.next_cursor === "string" && payload.next_cursor ? payload.next_cursor : null;
    if (!cursor) break;
  }
  if (cursor) truncated = true;
  return {
    records: remoteIdRows(records),
    received: records.length,
    pages,
    truncated,
    quotaRemaining,
    bbox,
  };
}
async function loadRegion(lat: number, lon: number, radius: number) {
  const providers: Record<string, any> = {
    adsb_lol: { name: "ADSB.lol public ADS-B", status: "pending", recordsReceived: 0, url: null, error: null },
    layer400_remote_id: {
      name: "Layer400 network Remote ID",
      status: Deno.env.get("LAYER400_API_KEY") ? "pending" : "not_configured",
      configured: !!Deno.env.get("LAYER400_API_KEY"),
      recordsReceived: 0,
      recordsAccepted: 0,
      pages: 0,
      truncated: false,
      error: null,
      quotaRemaining: null,
    },
    flyitaly_adsb: {
      name: "FlyItalyADSB ADS-B / MLAT / OGN",
      status: Deno.env.get("FLYITALYADSB_API_KEY") ? "pending" : "not_configured",
      configured: !!Deno.env.get("FLYITALYADSB_API_KEY"),
      recordsReceived: 0,
      recordsAccepted: 0,
      radiusKm: null,
      plan: null,
      limitPerMinute: null,
      remainingMonthlyQuota: null,
      error: null,
    },
  };
  let adsbRecords: any[] = [];
  let ridRecords: any[] = [];
  let flyitalyRecords: any[] = [];
  let adsbTotal = 0;
  let flyitalyTotal = 0;
  const tasks: Promise<void>[] = [];
  tasks.push((async () => {
    try {
      const adsb = await fetchAdsb(lat, lon, radius);
      adsbRecords = adsb.records;
      adsbTotal = adsb.total;
      providers.adsb_lol = { ...providers.adsb_lol, status: "ok", recordsReceived: adsb.records.length, url: adsb.url };
    } catch (error) {
      providers.adsb_lol = { ...providers.adsb_lol, status: "error", error: String((error as any)?.message || error).slice(0, 180) };
    }
  })());
  const flyItalyKey = Deno.env.get("FLYITALYADSB_API_KEY") || "";
  if (flyItalyKey) {
    tasks.push((async () => {
      try {
        const source = await fetchFlyItaly(lat, lon, radius, flyItalyKey);
        flyitalyRecords = source.records;
        flyitalyTotal = source.total;
        providers.flyitaly_adsb = {
          ...providers.flyitaly_adsb,
          status: "ok",
          recordsReceived: source.received,
          recordsAccepted: source.records.length,
          radiusKm: source.radiusKm,
          plan: source.plan,
          limitPerMinute: source.limitPerMinute,
          remainingMonthlyQuota: source.remainingMonthlyQuota,
          url: source.url,
        };
      } catch (error) {
        providers.flyitaly_adsb = {
          ...providers.flyitaly_adsb,
          status: "error",
          error: String((error as any)?.message || error).slice(0, 180),
        };
      }
    })());
  }
  const ridKey = Deno.env.get("LAYER400_API_KEY") || "";
  if (ridKey) {
    tasks.push((async () => {
      try {
        const rid = await fetchLayer400(lat, lon, radius, ridKey);
        ridRecords = rid.records;
        providers.layer400_remote_id = {
          ...providers.layer400_remote_id,
          status: rid.truncated ? "partial" : "ok",
          recordsReceived: rid.received,
          recordsAccepted: rid.records.length,
          pages: rid.pages,
          truncated: rid.truncated,
          quotaRemaining: rid.quotaRemaining,
          bbox: rid.bbox,
        };
      } catch (error) {
        providers.layer400_remote_id = {
          ...providers.layer400_remote_id,
          status: "error",
          error: String((error as any)?.message || error).slice(0, 180),
        };
      }
    })());
  }
  await Promise.all(tasks);
  const successCount = Number(providers.adsb_lol.status === "ok") + Number(["ok", "partial"].includes(providers.layer400_remote_id.status)) + Number(providers.flyitaly_adsb.status === "ok");
  const records = [...adsbRecords, ...flyitalyRecords, ...ridRecords];
  if (!successCount) {
    return {
      status: 502,
      body: {
        ok: false,
        error: "ALL_DRONE_SOURCES_UNAVAILABLE",
        ac: [],
        total: null,
        providers,
        msg: "No source returned a valid live response. A zero count is not available.",
      },
    };
  }
  return {
    status: 200,
    body: {
      ok: true,
      ac: records,
      total: adsbTotal + flyitalyTotal + ridRecords.length,
      providers,
      upstreamUrl: ADSB_ROOT + "lat/" + lat.toFixed(4) + "/lon/" + lon.toFixed(4) + "/dist/" + radius,
      servedAt: new Date().toISOString(),
      partial: providers.adsb_lol.status !== "ok" || providers.layer400_remote_id.status === "error" || providers.layer400_remote_id.status === "partial" || providers.flyitaly_adsb.status === "error",
      simulatedFleet: false,
    },
  };
}
Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin") || "";
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: validateOrigin(origin) ? 204 : 403,
      headers: {
        "access-control-allow-origin": ALLOWED_ORIGINS.has(origin) ? origin : "https://bridgepointintelligence.online",
        "access-control-allow-methods": "GET, OPTIONS",
        "access-control-allow-headers": "apikey, authorization, x-client-info, content-type",
        "access-control-max-age": "86400",
        vary: "Origin",
      },
    });
  }
  if (req.method !== "GET") return json({ ok: false, error: "GET_REQUIRED" }, 405, origin, 0);
  if (!validateOrigin(origin)) return json({ ok: false, error: "ORIGIN_NOT_ALLOWED" }, 403, origin, 0);
  if (req.headers.get("apikey") !== PUBLISHABLE_KEY) return json({ ok: false, error: "PUBLISHABLE_KEY_REQUIRED" }, 401, origin, 0);
  if (!checkRateLimit(req)) return json({ ok: false, error: "RATE_LIMITED", retryAfterSeconds: 60 }, 429, origin, 0);
  const params = new URL(req.url).searchParams;
  const lat = Number(params.get("lat"));
  const lon = Number(params.get("lon"));
  const radius = Number(params.get("radius") || 250);
  if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lon) || lon < -180 || lon > 180 ||
      !Number.isInteger(radius) || radius < 1 || radius > 250) {
    return json({ ok: false, error: "VALID_LAT_LON_RADIUS_REQUIRED" }, 400, origin, 0);
  }
  const key = lat.toFixed(3) + ":" + lon.toFixed(3) + ":" + radius;
  const cached = cache.get(key);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    const response = json(cached.body, 200, origin, 20);
    response.headers.set("x-bridgepoint-cache", "HIT");
    return response;
  }
  try {
    let task = inflight.get(key);
    if (!task) {
      task = loadRegion(lat, lon, radius);
      inflight.set(key, task);
    }
    const result = await task;
    if (result.status === 200) cache.set(key, { at: Date.now(), body: result.body });
    if (inflight.get(key) === task) inflight.delete(key);
    const response = json(result.body, result.status, origin, result.status === 200 ? 20 : 0);
    response.headers.set("x-bridgepoint-cache", result.status === 200 ? "MISS" : "BYPASS");
    return response;
  } catch (error) {
    inflight.delete(key);
    return json({ ok: false, error: "DRONE_FEED_PROXY_FAILED", detail: String((error as any)?.message || error).slice(0, 180) }, 502, origin, 0);
  }
});
