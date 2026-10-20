# BridgePoint World Reality Stack — Audit and Incremental Plan

**Audit date:** 2026-10-19  
**Status:** research and implementation order only; this document does not claim that any new feature is deployed.

## Goal

Move BridgePoint from a convincing global geospatial view toward a source-backed, much more lifelike 3D world: detailed buildings, ground cover and trees, real satellite/aerial imagery, importable drone-derived meshes, smoother rendering, and live physical-world activity.

The governing rule is **real geometry and source data first; clearly labeled simulation only when simulation is intended**. A beautiful layer is not evidence that the real-world feature exists at that location.

## What the current repository already contains

The current source tree is not starting from zero:

- The primary world renderer is MapLibre. The current renderer code describes a single map canvas, source-backed building/roof layers, viewport/zoom level-of-detail (LOD), and device-tier limits.
- The world map has NASA Blue Marble, USGS imagery and OpenAerialMap imagery sources, plus a separate Landsat spectral-imagery tool using USGS/NASA Landsat Collection 2 assets via Microsoft Planetary Computer.
- Building fidelity styles handle material-aware facade/roof colors where those properties exist. This is still not the same as a photogrammetrically textured, surveyed 3D mesh for every building.
- Landcover colors distinguish grass, forest/wood, parks and farmland. A close-zoom, procedural tree LOD system is present; that does not mean globally complete tree locations, real species identification, or scanned branches/leaves.
- Performance guards already include a capped device pixel ratio, no default MSAA, building-tile caps, bounded tile cache, hover-query throttling, and optional fine detail being deferred during pressure.
- Satellite and aircraft controls are present in the global-motion module. The module describes satellite positions as propagated orbital estimates, not spacecraft telemetry; it also documents a CelesTrak HTTP 403/source-review pause. The aircraft source is ADSB.lol and is queried around the current map center, so it is not a complete all-world live track.
- The tracked gap ledger says rail/road features are currently static geometry, there is no authorized global vessel feed or global camera catalog connected, and the public subsurface utility inventory is currently empty in the referenced verified snapshot.

**Verification limitation:** these statements describe the inspected public source files. This audit did not launch the production site in an interactive browser or verify current production behavior. Keep source status, deployment status and live-data status separate.

## Architecture decision: don't replace the world renderer

Keep the existing MapLibre globe/map as the primary world surface. Do not embed God's Eye View wholesale or start a second continuously animated globe canvas as a quick fix. God's Eye View is built around CesiumJS and has a different application/server architecture; its ideas, adapters and individual code patterns may be useful, but a wholesale merge risks duplicate WebGL contexts, conflicting controls, different data models and extra memory pressure.

For advanced geometry, investigate an **additive, opt-in, region-scoped asset layer** that works with BridgePoint's existing map and can be disabled automatically on low-memory devices. MapLibre custom 3D layers can render in the map's own GL context, but a 3D Tiles/mesh renderer must be proven compatible and tested before it is made authoritative. No second renderer should be added without a measured reason.

## Recommended open-source and data stack

### A. Real drone/ground imagery → georeferenced geometry

**First tool to pilot: WebODM / OpenDroneMap.** It processes imagery into orthophotos, elevation models, point clouds, textured 3D models and, according to the current WebODM project site, Gaussian splats. It can export common GIS/CAD and 3D formats, including OGC 3D Tiles.

Intended pipeline:

1. Use drone/ground images BridgePoint owns or has explicit permission to process and publish.
2. Process a small test area in WebODM; retain camera metadata and ground-control points where available.
3. Validate coordinate reference system, vertical datum, scale, reprojection, alignment and geometry quality against known control points.
4. Export a georeferenced orthophoto plus a tiled 3D asset/mesh and source manifest.
5. Serve the asset only for the relevant viewport/zoom band, with a visible source/date/accuracy card and a clean fallback to the normal map.
6. Benchmark desktop and phone before widening coverage.

A drone-processing tool does **not** supply a free, global catalog of drone imagery. Imagery coverage, permission, resolution and acquisition date must be tracked separately. Don't advertise a location as photogrammetrically reconstructed unless the actual asset exists and passed spatial checks.

### B. High-detail city meshes and textured buildings

Use OGC 3D Tiles or another tiled/glTF asset format for dense, real 3D content, but maintain a clear provider/licence boundary:

- **Owned or permissively licensed meshes** are the best fit for long-term open-source and commercial distribution.
- **Google Photorealistic 3D Tiles** can provide a high-detail visualization path, but they are metered/credentialed and subject to Google Maps Platform terms, attribution, caching and content-use rules. They are not an open dataset to copy into BridgePoint's own database or redistribute.
- **Cesium ion** can stream terrain and third-party assets; each asset has its own terms, and Cesium's terms distinguish using streamed content in an application from sublicensing a commercial solution. Confirm current terms before commercial integration.
- Keep BridgePoint's own property/parcel/building evidence visibly distinct from provider-rendered background meshes. Never infer a property boundary, roof material or measured dimension from an imagery mesh alone.

No provider token, proprietary model or paid imagery should be hard-coded into public client code unless its use is explicitly designed for a public client token under that provider's terms.

### C. Vegetation and surface realism

Treat vegetation as three levels instead of trying to draw millions of blades globally:

1. **Global/medium zoom:** source-backed landcover and vegetation regions, styled naturally and cheaply.
2. **City zoom:** actual mapped tree points, building-adjacent greenery and canopy data where the source exists; cluster/declutter at distance.
3. **Close zoom:** instanced or batched licensed tree/grass assets, bounded to the visible area and selected device tier; remove detail while moving and restore it after the camera settles.

Start with real locations and appropriate LOD before adding heavier materials. Mark procedural foliage as a rendering approximation, not a scanned or botanically identified tree. Forest polygons do not prove an exact count of individual trees.

### D. Satellite/aerial imagery

Keep image provenance per layer:

- **Landsat** is useful for real, multi-band landscape and vegetation analysis but is medium-resolution Earth-observation imagery—not facade-level building photography.
- **USGS imagery** and **OpenAerialMap** can supply real imagery where available. Coverage, acquisition date, cloud condition, resolution and licence vary by region.
- Drone-derived orthophotos/meshes should have a visible date and spatial-quality record, and must never be silently blended into satellite imagery as if the sources were the same.

Use a source picker and acquisition metadata rather than a single “satellite” switch that conceals the differences among providers.

### E. Live activity

God's Eye View is valuable as a feature and adapter reference, not proof that every feed is universally available. Its source documentation explicitly separates code licensing from data/source terms, and documents feed-specific restrictions. Borrow the modular, source-labeled pattern; review every BridgePoint data provider separately.

| Layer | Current BridgePoint source finding | Next rule |
| --- | --- | --- |
| Aircraft | Nearby ADSB.lol feed; bounded around the current map centre | Keep region and freshness visible; offer refresh/backoff controls; do not claim universal global coverage |
| Satellites | Public orbital elements; latest inspected module reports CelesTrak HTTP 403/source-review pause | Restore only after endpoint/terms and fallback are checked; label propagated positions as estimates |
| Trains/transit | Static rail geometry; no live BridgePoint train positions verified in the gap ledger | Add an agency-by-agency GTFS-Realtime adapter where genuine vehicle positions exist; show report time, delay and mode; don't turn schedules into “live trains” |
| Ships | No authorized global AIS feed connected in the inspected gap ledger | Choose a provider after licensing, API-key, polling, retention and cost review; no fabricated tracks |
| Public cameras | No global camera catalogue/feed connected in the inspected gap ledger | Start with a small, officially published, terms-reviewed traffic-camera pack; show online/offline state and capture time. Do not use a feed requiring an agreement until BridgePoint has one |
| Road traffic | Can be modeled/simulated when no permitted live provider is active | Always distinguish **LIVE SOURCE** from **SIMULATED** |
| Weather, earthquakes, fire | Existing source-based layers/feeds vary by module and coverage | Keep attribution, update time and uncertainty per source |

Do not add named-person search, face recognition, license-plate recognition of camera imagery, or individual-person tracking. A public camera location is not necessarily a viewable live stream; camera bearings and coverage volumes may be estimates and must say so.

## Performance acceptance gates

Every visual/data addition should pass these gates before broader rollout:

- One primary map canvas remains authoritative; no duplicate layer install loops or extra canvas by default.
- Data and models are requested by viewport and zoom. Heavy meshes/point clouds are not loaded across the entire globe.
- All network requests have timeouts, bounded result sizes, cache policy, single-flight refresh where appropriate, and backoff on 403/429/5xx.
- Motion uses a low-cost representation; selected objects may show trails/detail while other objects remain simple.
- Low-memory/mobile tiers receive fewer objects, simpler materials and lower pixel ratio; fine detail is deferred while moving.
- A source failure preserves the last valid state or visibly reports unavailable; no blank/black map and no fabricated replacement features.
- Record before/after measurements for load time, frame rate where available, memory/asset count, request volume and camera-interaction responsiveness.
- Verify globe view, dateline crossing, close building inspection, property selection/cards, satellite/imagery toggles and phone viewport after each increment.

## Incremental execution order

Mark each step complete only after a code change, tests and an explicit production check—not because a plan or UI control exists.

1. **Audit baseline and guardrails (this document).** Preserve the existing map and record real implementation gaps.
2. **Photogrammetry proof of concept.** One small, authorized study area; WebODM output → georeferenced tile/mesh → lazy-loaded map layer behind a toggle. Validate coordinates, provenance and mobile performance before promoting it.
3. **Vegetation realism.** Improve one city viewport using source-backed tree/landcover information plus bounded, instanced asset LOD. Compare performance against baseline and keep a safe fallback.
4. **One live transit pilot.** Select a public GTFS-Realtime feed that actually reports vehicle positions; implement source freshness, route/mode metadata, timeout/backoff and a verified test.
5. **One authorized public camera pilot.** Use only an official source with terms that permit the intended display; do not enable agreement-gated feeds by default.
6. **Vessel feed and broader geographic coverage.** Decide only after provider terms, API key requirements, costs, caching, attribution and current-data availability are verified.
7. **World-wide expansion.** Add regions/providers incrementally; maintain a per-source coverage/freshness matrix and do not convert missing data into synthetic physical assets.

## References

- God's Eye View (MIT source code; third-party data retains its own terms): https://github.com/bilawalsidhu/gods-eye-view
- God's Eye View source/data licensing inventory: https://github.com/bilawalsidhu/gods-eye-view/blob/main/DATA_SOURCES.md
- WebODM / OpenDroneMap: https://webodm.org/
- MapLibre GL JS custom layers (render in the map's GL context): https://maplibre.org/maplibre-gl-js/docs/API/interfaces/CustomLayerInterface/
- Google Map Tiles API policies and attribution: https://developers.google.com/maps/documentation/tile/policies
- Cesium ion content and attribution: https://cesium.com/learn/ion/content-usage-and-attribution-guide/
- OpenStreetMap licence: https://www.openstreetmap.org/copyright
