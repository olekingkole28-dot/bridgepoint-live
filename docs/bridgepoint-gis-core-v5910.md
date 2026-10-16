# BridgePoint GIS Core Orchestration Engine — v5910

This release introduces a capability-gated GIS task router inside the BridgePoint map, an on-demand real-world rendering toggle, and a per-user tamper-evident processing ledger.

## In-app controls

Open the 3D map at `/app/`.

- **REAL-WORLD MODE**: turns on available USGS/NASA/OpenAerialMap image context and existing source-aware, material-inspired facade/roof patterns, with close-range detail, source building parts where present, lighting-aware shadows, and nighttime window accents.
- **GIS CORE · TASK ROUTER**: accepts JSON task inputs, routes supported operations, and returns structured JSON containing the task type, capability status, source refs, limitations, elapsed time, and whether an authenticated audit event was stored.
- **FALSE-COLOR SATELLITE**: searches real Landsat scenes and supplies three spectral blends. The GIS Core routes into that existing source-backed layer.
- **WORLD ACTIVITY**: provides currently available source-reported weather/hazard context. The GIS Core can intersect locally loaded event geometries with a supplied GeoJSON geometry, but it does not claim complete global coverage from a viewport-only query.

## Example command payloads

These JSON objects can be submitted via `window.__BP_GIS_CORE_V5910__.route({task_type, payload})` after the map is ready.

### Geometry → WKT

```json
{
  "task_type": "GEOMETRY_WKT",
  "payload": {
    "crs": "EPSG:4326",
    "geometry": {
      "type": "Polygon",
      "coordinates": [[[-72.7, 41.5], [-72.69, 41.5], [-72.69, 41.51], [-72.7, 41.51], [-72.7, 41.5]]]
    }
  }
}
```

The conversion preserves supplied coordinate values. An EWKT SRID annotation is caller-supplied metadata; this route does not reproject the geometry or certify parcel ownership.

### Decimal degrees → DMS

```json
{
  "task_type": "COORDINATE_CONVERSION",
  "payload": { "latitude": 41.5623, "longitude": -72.6506 }
}
```

Decimal degrees and DMS are supported. UTM is returned as not computed because this browser implementation does not yet include a verified PROJ/UTM transformation engine.

### Hazard / property intersection

```json
{
  "task_type": "HAZARD_INTERSECTION",
  "payload": {
    "geometry": {
      "type": "Polygon",
      "coordinates": [[[-72.7, 41.5], [-72.69, 41.5], [-72.69, 41.51], [-72.7, 41.51], [-72.7, 41.5]]]
    }
  }
}
```

Only source-reported event features currently loaded in the map's activity source/time/viewport are checked. The result does not establish physical damage and does not claim that unloaded or remote events have been checked.

### Turn realistic map mode on

```json
{
  "task_type": "REAL_WORLD_RENDERING",
  "payload": { "enabled": true }
}
```

Turn it off with `{"enabled": false}`. The visual mode does not invent exact building geometry or transform material patterns into evidence of a particular building's true appearance.

### Satellite search

```json
{
  "task_type": "SATELLITE_ANALYSIS",
  "payload": { "composite": "earth" }
}
```

Supported values: `earth`, `water`, and `vegetation`. A successful command should return the selected real scene ID, platform, acquisition timestamp, reported scene cloud cover, and active composite.

## Capability registry and current limits

| Capability | Status in this release | Meaning |
|---|---|---|
| Satellite and spectral analysis | Ready with limits | Landsat 8/9 STAC search, false-colour display, preview export |
| Property/building ground truth | Partial | Operates on actual rendered building features; completeness depends on source coverage |
| Weather/hazard context | Partial | Source layers and currently loaded event observations; not a full hazard-model run |
| Geometry/coordinates | Partial | GeoJSON-to-WKT/EWKT and decimal-degree/DMS; no projection operation here |
| Field data ingestion | Not configured | No remote GPX/ODK/Kobo/Mergin endpoint or credential is assumed |
| Routing and isochrones | Not configured | No ORS key or routing request is assumed |
| Evidence ledger | Ready for authenticated events | Per-user, append-only for client roles, SHA-256 hash linked |
| Real-world rendering | Ready with limits | Available imagery + source-tag-aware, material-inspired 3D styling |

TUFLOW, UMEP, WhiteboxTools batch workflows, exact roof photogrammetry, universal parcel coverage, and other external plugin-equivalent capabilities are not represented as completed integrations unless a separately configured solver/dataset/service is actually run.

## Realism is not the same as photographic truth

This release improves visual context, but it is not a universal photorealistic city mesh. It uses real map imagery where available and renderer material patterns informed by published building/roof tags. Where source roof material, facade colour, building parts, roof geometry, or high-resolution imagery is unavailable, BridgePoint must show the best labeled fallback or disclose the gap. A material-inspired pattern is a visual approximation, not a photo of that building.

To achieve true per-building photographic realism globally, BridgePoint would still need licensed high-resolution orthophotography or photogrammetric mesh/texture datasets, coverage manifests, update dates, and a serving pipeline. Landsat's optical bands are approximately 30 m and cannot provide roof-detail imagery.

## Evidence ledger security

Migration: `20261016022500_bridgepoint_gis_core_audit_v5910.sql`.

The public-schema ledger is RLS-enabled. Authenticated users can select only their own events. Client roles have SELECT only and cannot directly INSERT/UPDATE/DELETE ledger rows; an authenticated, allow-listed RPC inserts a canonical per-user SHA-256-linked event with input/result manifests and source references. The chain is serialized per user using a transaction-scoped advisory lock.

The ledger is tamper-evident for app-role access, not absolutely immutable against privileged database administrators, backups rewrites, or a fully compromised server. For a stronger compliance boundary, periodically export signed/hash-anchored heads to independent WORM storage and retain the independent verification keys/policy outside the database.

## Audit payload limits and privacy

The stored payload omits raw imagery bytes and stores source references, identifiers, and bounded JSON summaries. Do not put API keys, passwords, session tokens, or sensitive owner/customer notes in task input JSON. Persistent history is available only to an authenticated user; anonymous map operations may execute but report that an audit event was not recorded.
