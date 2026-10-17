const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// The CelesTrak endpoint returned HTTP 403 from the Supabase worker environment.
// Use the separately published, paginated TLE API feed (NASA API catalogue project;
// the service reports its data is refreshed daily from CelesTrak). Do not hammer
// either upstream source: BridgePoint's schedule is daily and the database claim
// function also enforces its own cooldown and pressure gates.
const SOURCE_KEY = "TLE_API_IVANSTANOJEVIC";
const SOURCE_URL = "https://tle.ivanstanojevic.me/api/tle/";
const PAGE_SIZE = 500;
const MAX_SOURCE_ROWS = 40000;
const PROJECT_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SECRET_KEY") ?? "";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

async function rpc(name: string, body: Record<string, unknown>) {
  const response = await fetch(PROJECT_URL + "/rest/v1/rpc/" + name, {
    method: "POST",
    headers: {
      "apikey": SERVICE_KEY,
      "Authorization": "Bearer " + SERVICE_KEY,
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
    body: JSON.stringify(body),
  });
  const raw = await response.text();
  let data: unknown = null;
  try { data = raw ? JSON.parse(raw) : null; } catch { data = raw; }
  if (!response.ok) throw new Error("RPC_" + name + "_HTTP_" + response.status + ": " + String(raw).slice(0, 500));
  return data;
}

async function fetchPage(page: number) {
  const url = SOURCE_URL + "?page=" + page + "&page-size=" + PAGE_SIZE;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);
  try {
    const response = await fetch(url, {
      headers: { "Accept": "application/ld+json, application/json", "User-Agent": "BridgePoint-Intelligence-Satellite-Catalog/5926" },
      cache: "no-store",
      signal: controller.signal,
    });
    if (!response.ok) throw new Error("TLE_API_HTTP_" + response.status + " page=" + page);
    const payload: any = await response.json();
    const member = Array.isArray(payload?.member) ? payload.member : (Array.isArray(payload) ? payload : null);
    if (!member) throw new Error("TLE_API_RESPONSE_SHAPE_UNEXPECTED page=" + page);
    return { member, total: Number(payload?.totalItems || payload?.total_items || 0) };
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeRecord(item: any, now: string) {
  const rawId = item?.satelliteId ?? item?.NORAD_CAT_ID ?? item?.NORAD_CATID ?? item?.NORAD_ID;
  const id = rawId == null ? "" : String(rawId).trim();
  if (!/^\d{1,8}$/.test(id)) return null;
  const line1 = String(item?.line1 ?? item?.TLE_LINE1 ?? "").trim();
  const line2 = String(item?.line2 ?? item?.TLE_LINE2 ?? "").trim();
  if (!line1.startsWith("1 ") || !line2.startsWith("2 ")) return null;
  const dateValue = item?.date ?? item?.EPOCH ?? null;
  const epoch = dateValue && !Number.isNaN(Date.parse(String(dateValue)))
    ? new Date(String(dateValue)).toISOString() : null;
  // Keep the original TLE lines inside the JSON payload. BridgePoint uses
  // satellite.js twoline2satrec to propagate these standard, source-published elements.
  const tle = {
    ...item,
    NORAD_CAT_ID: id,
    OBJECT_NAME: String(item?.name ?? item?.OBJECT_NAME ?? item?.OBJECT_ID ?? ("NORAD " + id)).trim().slice(0, 180),
    OBJECT_TYPE: String(item?.OBJECT_TYPE ?? "UNKNOWN").slice(0, 64),
    EPOCH: epoch,
    line1,
    line2,
    source_key: SOURCE_KEY,
    source_url: SOURCE_URL,
  };
  return {
    norad_cat_id: id,
    object_name: tle.OBJECT_NAME || ("NORAD " + id),
    object_type: tle.OBJECT_TYPE,
    epoch,
    omm: tle,
    source_key: SOURCE_KEY,
    source_url: SOURCE_URL,
    last_seen_at: now,
    updated_at: now,
  };
}

async function upsertRows(rows: any[]) {
  let batches = 0;
  for (let start = 0; start < rows.length; start += 350) {
    const batch = rows.slice(start, start + 350);
    const response = await fetch(PROJECT_URL + "/rest/v1/bridgepoint_satellite_catalog_v5926?on_conflict=norad_cat_id", {
      method: "POST",
      headers: {
        "apikey": SERVICE_KEY,
        "Authorization": "Bearer " + SERVICE_KEY,
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify(batch),
    });
    if (!response.ok) throw new Error("CATALOG_UPSERT_HTTP_" + response.status + ": " + (await response.text()).slice(0, 600));
    batches++;
  }
  return batches;
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ ok: false, error: "POST_REQUIRED" }, 405);
  if (!PROJECT_URL || !SERVICE_KEY) return json({ ok: false, error: "SERVER_SECRET_MISSING" }, 500);

  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return json({ ok: false, error: "INVALID_JSON" }, 400); }
  const taskToken = typeof body.task_token === "string" ? body.task_token : "";
  if (!taskToken) return json({ ok: false, error: "WORKER_TOKEN_REQUIRED" }, 401);

  let claim: any;
  try {
    claim = await rpc("bridgepoint_satellite_claim_refresh_v5926", {
      p_task_token: taskToken,
      p_force: body.force === true,
    });
  } catch (error) {
    return json({ ok: false, error: "REFRESH_CLAIM_FAILED", detail: String(error).slice(0, 500) }, 502);
  }
  if (!claim?.ok) {
    const status = claim?.error === "UNAUTHORIZED" ? 401 : 202;
    return json({ ok: false, ...claim }, status);
  }

  let pagesRead = 0;
  let sourceRows = 0;
  let batchesSucceeded = 0;
  let expectedTotal = 0;
  try {
    const first = await fetchPage(1);
    expectedTotal = Math.min(MAX_SOURCE_ROWS, Math.max(first.total, first.member.length));
    if (first.member.length === 0) throw new Error("TLE_API_EMPTY_FIRST_PAGE");
    const pageCount = Math.min(80, Math.ceil(expectedTotal / PAGE_SIZE));
    const now = new Date().toISOString();

    for (let startPage = 1; startPage <= pageCount; startPage += 3) {
      const pages = [startPage, startPage + 1, startPage + 2].filter(p => p <= pageCount);
      const pagePayloads = await Promise.all(pages.map(p => p === 1 ? Promise.resolve(first) : fetchPage(p)));
      for (const p of pagePayloads) {
        const normalized = p.member.map((row: any) => normalizeRecord(row, now)).filter(Boolean);
        if (normalized.length) {
          batchesSucceeded += await upsertRows(normalized);
          sourceRows += normalized.length;
        }
        pagesRead++;
      }
    }
    if (sourceRows < 100) throw new Error("TLE_API_VALID_RECORD_COUNT_TOO_LOW");
    const finished: any = await rpc("bridgepoint_satellite_finish_refresh_v5926", {
      p_task_token: taskToken, p_success: true, p_group_count: sourceRows, p_error: null,
    });
    return json({
      ok: true, version: 5926, source_key: SOURCE_KEY, source_url: SOURCE_URL,
      pages_read: pagesRead, page_size: PAGE_SIZE, source_rows: sourceRows,
      source_reported_total: expectedTotal, batches_succeeded: batchesSucceeded,
      total_known_objects: finished?.total_known_objects ?? null,
      source_fetched_at: finished?.source_fetched_at ?? new Date().toISOString(),
      refresh_policy: "Daily; source records state the underlying TLE feed is refreshed daily.",
      truth_note: "These are public orbital-element records. Ground-track locations are propagated estimates from TLEs, not onboard live telemetry or guaranteed visual observations.",
    });
  } catch (error) {
    const message = String(error).slice(0, 900);
    try {
      await rpc("bridgepoint_satellite_finish_refresh_v5926", {
        p_task_token: taskToken, p_success: false, p_group_count: null, p_error: message,
      });
    } catch { /* retain the original source error */ }
    return json({
      ok: false, error: "SOURCE_REFRESH_FAILED", detail: message,
      pages_read: pagesRead, source_rows: sourceRows, batches_succeeded: batchesSucceeded,
    }, 502);
  }
});