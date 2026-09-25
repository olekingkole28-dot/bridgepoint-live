import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const SUPA = process.env.BRIDGEPOINT_SUPABASE_URL || "https://xdfsjztwgsbmabshzsjw.supabase.co";
const KEY = process.env.BRIDGEPOINT_PUBLISHABLE_KEY || "sb_publishable_lM9oWQeHjBmgOIiteeOicQ_PTyAeF25";

async function rpc(name, payload = {}) {
  const r = await fetch(SUPA + "/rest/v1/rpc/" + name, {
    method: "POST",
    headers: { apikey: KEY, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(payload)
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d?.message || d?.error || ("HTTP " + r.status));
  return d;
}

const server = new McpServer({ name: "bridgepoint-intelligence", version: "0.1.0" });

server.tool("search_property", "Resolve an exact U.S. street address through BridgePoint's public property graph.", {
  query: z.string().min(4),
  limit: z.number().int().min(1).max(8).default(4)
}, async ({ query, limit }) => ({
  content: [{ type: "text", text: JSON.stringify(await rpc("bridgepoint_public_search_v5200", { p_query: query, p_limit: limit }), null, 2) }]
}));

server.tool("property_detail", "Read public-safe BridgePoint property detail around a coordinate.", {
  lng: z.number(), lat: z.number(), radius_m: z.number().min(20).max(500).default(120)
}, async ({ lng, lat, radius_m }) => ({
  content: [{ type: "text", text: JSON.stringify(await rpc("bridgepoint_public_property_detail_v5001", { p_lng: lng, p_lat: lat, p_radius_m: radius_m }), null, 2) }]
}));

server.tool("building_detail", "Read public-safe building detail around a coordinate.", {
  lng: z.number(), lat: z.number(), radius_m: z.number().min(20).max(500).default(120)
}, async ({ lng, lat, radius_m }) => ({
  content: [{ type: "text", text: JSON.stringify(await rpc("bridgepoint_public_building_detail_v5000", { p_lng: lng, p_lat: lat, p_radius_m: radius_m }), null, 2) }]
}));

server.tool("parcel_cutout", "Read BridgePoint's public-safe parcel cutout around a coordinate.", {
  lng: z.number(), lat: z.number(), radius_m: z.number().min(20).max(300).default(90)
}, async ({ lng, lat, radius_m }) => ({
  content: [{ type: "text", text: JSON.stringify(await rpc("bridgepoint_public_parcel_cutout_v5411", { p_lng: lng, p_lat: lat, p_radius_m: radius_m }), null, 2) }]
}));

server.tool("integrity_index", "Read public BridgePoint Integrity Index publication status for a canonical property ID.", {
  property_id: z.string().uuid()
}, async ({ property_id }) => ({
  content: [{ type: "text", text: JSON.stringify(await rpc("bridgepoint_public_integrity_index_v5200", { p_property_id: property_id }), null, 2) }]
}));

server.tool("live_context", "Read public source-backed hazard/environment context around a coordinate.", {
  lng: z.number(), lat: z.number(), radius_km: z.number().min(1).max(250).default(50)
}, async ({ lng, lat, radius_km }) => ({
  content: [{ type: "text", text: JSON.stringify(await rpc("bridgepoint_public_context_v5003", { p_lng: lng, p_lat: lat, p_radius_km: radius_km }), null, 2) }]
}));

server.tool("bridgepoint_status", "Read current public BridgePoint platform counters and coverage status.", {}, async () => ({
  content: [{ type: "text", text: JSON.stringify(await rpc("bridgepoint_frontend_status_v5000", {}), null, 2) }]
}));

const transport = new StdioServerTransport();
await server.connect(transport);
