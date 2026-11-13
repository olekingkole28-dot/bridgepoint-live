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
