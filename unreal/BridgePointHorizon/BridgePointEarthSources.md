# BridgePoint Earth source intake rules

This is the source registry contract, not a declaration that any individual dataset has already been acquired or cleared.

## Required metadata for every imported layer

- Stable source identifier and human-readable source name.
- Provider/source version and retrieval timestamp.
- License identifier and attribution string.
- Valid-from / valid-until times for time-varying evidence.
- Geographic coverage and spatial resolution.
- Evidence kind: Observed, Forecast, Modelled or Simulated.
- Commercial-clearance status, default false.
- Personal/research-use permission and internal-use permission tracked separately where a license distinguishes them.
- Derivative-data, display, caching, export, API and redistribution permissions tracked separately.

## Source families

1. Global elevation, bathymetry and terrain.
2. Aerial/satellite imagery and photogrammetry.
3. Buildings, footprints, roof geometry and facade/reality meshes.
4. Streets, paths, bridges, rail and transport features.
5. Vegetation, land cover, soil, geology and hydrology.
6. Water bodies, drainage, floodplains and inundation.
7. Weather, radar, lightning, wind, clouds and historical events.
8. Fire perimeters, smoke and burn severity.
9. Power, communications and other infrastructure.
10. Property identity, parcels, permits and other jurisdictional records.

## No-fabrication rule

A missing roof mesh is not permission to claim an inferred roof as surveyed truth. A forecast flood extent is not an observed flood. A game-only fire is not a real wildfire. When an asset is reconstructed or simulated, its classification remains explicit in metadata and UI.

## Delivery and storage

Source archives, LiDAR, photogrammetry, 3D Tiles, splats, imagery pyramids and cooked Unreal content are external assets. Git tracks code, manifests, compact indexes, reproducible build scripts and source/license evidence. Never commit private or restricted raw datasets into this public repository.


## Initial global imagery layer — NASA GIBS / NOAA-20 VIIRS

Implementation reference: VIIRS_NOAA20_CorrectedReflectance_TrueColor

- Provider: NASA Global Imagery Browse Services (GIBS), Earthdata.
- Product: NOAA-20 VIIRS Corrected Reflectance True Color.
- Service: WMTS, EPSG:3857 Web Mercator, GoogleMapsCompatible Level 9.
- Temporal selector: default, which resolves to the imagery service's latest available default time.
- Runtime URL pattern:
  https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_NOAA20_CorrectedReflectance_TrueColor/default/default/GoogleMapsCompatible_Level9/{z}/{reverseY}/{x}.jpeg
- Display attribution: NASA GIBS / NOAA-20 VIIRS Corrected Reflectance True Color.
- Intended role: global planetary visual context, not property-level evidence.
- Spatial/detail boundary: coarse global browse imagery. It does not reveal individual building facades, windows, doors, rooftop equipment, hydrants, cars or sidewalks.
- Temporal boundary: imagery is a daily satellite composite; cloud cover, capture timing and processing can affect what is visible. It is not guaranteed to show a current live picture at every location.
- Commercial gate: record the current product/service citation and attribution in the source ledger and complete source-specific terms review before making any derived imagery package or downloadable tile cache available to customers. The default commercial-clearance flag remains false until that review is recorded.
- Do not use this source as a substitute for orthophotos, photogrammetry, LiDAR or building reality meshes.


## Optional global terrain — Cesium World Terrain

- Ion asset ID: 1.
- Format: quantized-mesh terrain.
- Coverage: global.
- Source resolution is uneven: Cesium lists approximately 1–30 m for the United States, around 30 m for much of Canada/Europe/Mexico, 30–90 m across many mid-latitudes, and around 1 km for full-Earth coverage.
- Role: terrain relief, broad elevation context and water-mask support.
- Limitation: it is not uniformly high-resolution or a substitute for newer local LiDAR/DEMs.
- Access: local Cesium ion token only; the token is never committed.
- Commercial gate: Cesium ion Community is for personal/non-commercial evaluation. Commercial delivery to external organizations requires the applicable integration rights.

## Optional global buildings — Cesium OSM Buildings

- Ion asset ID: 96188.
- Format: 3D Tiles.
- Source: OpenStreetMap-derived mapped building geometry.
- Coverage: global; provider says it is updated quarterly.
- Provider-reported volume: more than 350 million mapped buildings with metadata such as name, height, building type and some part-level attributes.
- Limitations: OSM completeness varies by place. A missing OSM building or property is not evidence that the physical building does not exist. This layer is not photogrammetry and does not guarantee photographic facade/roof detail.
- Required attribution: © OpenStreetMap contributors.
- Access: local Cesium ion token only; the token is never committed.
- Commercial gate: satisfy both the Cesium ion service terms and the underlying OpenStreetMap attribution/ODbL obligations before any customer-facing integration.


## Astronomical lighting — CesiumSunSky

- Component: Cesium for Unreal `ACesiumSunSky`.
- Role: global directional sunlight, skylight and SkyAtmosphere.
- Position/time source: shared BridgePoint UTC simulation clock and the WGS84 Cesium georeference.
- Update policy: one bounded update interval; not a per-frame astronomical recomputation.
- DST: disabled for the global solar calculation; the clock input is UTC.
- Temporal behavior: live time, pause, accelerated playback and reverse historical playback all affect the solar position.
- Limitation: this is astronomical lighting only; it does not provide weather, clouds, rain or storm observations.
