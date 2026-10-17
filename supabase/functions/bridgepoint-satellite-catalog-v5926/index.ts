const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SOURCE_URL = "https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=JSON";
const SOURCE_KEY = "CELESTRAK_GP_ACTIVE_OMM";
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

  let sourceRows: any[] = [];
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 65000);
    let response: Response;
    try {
      response = await fetch(SOURCE_URL, {
        headers: { "Accept": "application/json", "User-Agent": "BridgePoint-Intelligence-Satellite-Catalog/5926" },
        signal: controller.signal,
        cache: "no-store",
      });
    } finally {
      clearTimeout(timeout);
    }
    if (!response.ok) throw new Error("CELESTRAK_HTTP_" + response.status);
    const data = await response.json();
    if (!Array.isArray(data) || data.length < 100) throw new Error("CELESTRAK_RESPONSE_SHAPE_UNEXPECTED");
    const now = new Date().toISOString();
    sourceRows = data.flatMap((item: any) => {
      const rawId = item?.NORAD_CAT_ID ?? item?.NORAD_CATID ?? item?.NORAD_ID;
      const id = rawId == null ? "" : String(rawId).trim();
      if (!/^\d{1,8}$/.test(id)) return [];
      const objectName = String(item?.OBJECT_NAME ?? item?.OBJECT_ID ?? ("NORAD " + id)).trim().slice(0, 180);
      const epoch = item?.EPOCH && !Number.isNaN(Date.parse(String(item.EPOCH)))
        ? new Date(String(item.EPOCH)).toISOString()
        : null;
      return [{
        norad_cat_id: id,
        object_name: objectName || ("NORAD " + id),
        object_type: item?.OBJECT_TYPE ? String(item.OBJECT_TYPE).slice(0, 64) : null,
        epoch,
        omm: item,
        source_key: SOURCE_KEY,
        source_url: SOURCE_URL,
        last_seen_at: now,
        updated_at: now,
      }];
    });
    if (sourceRows.length < 100) throw new Error("NO_VALID_OMM_OBJECTS");
  } catch (error) {
    const message = String(error).slice(0, 900);
    try {
      await rpc("bridgepoint_satellite_finish_refresh_v5926", {
        p_task_token: taskToken, p_success: false, p_group_count: null, p_error: message,
      });
    } catch { /* preserve original source error */ }
    return json({ ok: false, error: "SOURCE_REFRESH_FAILED", detail: message }, 502);
  }

  let batchesSucceeded = 0;
  try {
    const batchSize = 350;
    for (let start = 0; start < sourceRows.length; start += batchSize) {
      const batch = sourceRows.slice(start, start + batchSize);
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
      if (!response.ok) {
        const detail = (await response.text()).slice(0, 600);
        throw new Error("CATALOG_UPSERT_HTTP_" + response.status + ": " + detail);
      }
      batchesSucceeded++;
    }
    const finished: any = await rpc("bridgepoint_satellite_finish_refresh_v5926", {
      p_task_token: taskToken, p_success: true, p_group_count: sourceRows.length, p_error: null,
    });
    return json({
      ok: true, version: 5926, source_key: SOURCE_KEY, source_url: SOURCE_URL,
      source_rows: sourceRows.length, batches_succeeded: batchesSucceeded,
      total_known_objects: finished?.total_known_objects ?? null,
      source_fetched_at: finished?.source_fetched_at ?? new Date().toISOString(),
      source_policy: "Public GP OMM catalogue refreshed no more often than every 110 minutes by default.",
      truth_note: "These are orbital-element catalog records. Propagated positions are estimates, not real-time onboard telemetry or guaranteed observations.",
    });
  } catch (error) {
    const message = String(error).slice(0, 900);
    try {
      await rpc("bridgepoint_satellite_finish_refresh_v5926", {
        p_task_token: taskToken, p_success: false, p_group_count: null, p_error: message,
      });
    } catch { /* preserve original persistence error */ }
    return json({
      ok: false, error: "CATALOG_PERSIST_FAILED", detail: message,
      source_rows: sourceRows.length, batches_succeeded: batchesSucceeded,
    }, 502);
  }
});