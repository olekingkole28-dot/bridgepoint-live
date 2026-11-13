# BridgePoint Earth — Shared Runtime Foundation V1

## Objective

BridgePoint Earth is the shared real-world runtime for BridgePoint Intelligence and Horizon. Unreal is the primary high-fidelity renderer and simulation host. The existing browser globe remains available as a fallback while the Unreal world is built and validated.

## Runtime responsibilities

- Cesium for Unreal supplies planetary-scale geospatial positioning and 3D Tiles streaming.
- BridgePoint data services remain authoritative for property identities, parcels, verified buildings, roads, infrastructure, source records and customer permissions.
- The Earth subsystem owns a UTC simulation clock, WGS84 coordinate conversion, evidence-aware environmental observations and distance-based rendering budgets.
- Niagara, Water, SkyAtmosphere, Volumetric Clouds, Chaos and foliage systems consume normalized scene inputs. They do not establish the truth of those inputs.
- Horizon owns its separate player, survival, combat, progression, multiplayer and fictional gameplay state.

## Evidence contract

Every environmental input is classified as one of four types:

- Observed: a source reports that the condition was observed.
- Forecast: a provider predicts a future condition.
- Modelled: a scientific or numerical model estimates a condition.
- Simulated: a BridgePoint/Horizon scenario or gameplay simulation creates a condition.

The renderer must not silently upgrade a forecast, model or simulation into observed truth. Each sample retains source identity, source name, source version, license identifier, attribution, retrieval time, validity window, confidence and commercial-clearance status.

Commercial clearance is false by default. Personal/research data and customer-cleared data must remain separately permissioned at service and storage layers. A renderer toggle is not an access-control boundary.

## Geographic and streaming policy

- Geographic identity is WGS84 latitude/longitude plus ellipsoid height.
- Geodetic coordinates convert to WGS84 Earth-Centered, Earth-Fixed (ECEF) meters before local Unreal transforms are resolved.
- Never use one enormous flat Unreal level for the whole planet.
- Stream tiles/cells around the camera; use 3D Tiles, World Partition/HLOD and distance-based loading.
- Real-world geometry and textures require source provenance. A generated building may only be explicitly marked as a visualization/gameplay placeholder, never as a verified real building.
- Large imagery, LiDAR, point clouds, reality meshes, photogrammetry, simulation caches and Unreal cooked content stay outside Git history. Store compact manifests, source ledgers, import scripts and application code in GitHub.

## Three distance tiers

The Earth subsystem resolves a rendering tier from camera altitude:

- Planetary: global cloud/weather fields and broad environmental context; no street-level particles or local physics.
- Regional: storm fields, moving weather fronts, wildfire/flood context and bounded regional effects.
- Local: city-scale buildings, terrain, water features, foliage and localized weather interaction.
- Street: high-detail rain/snow, local water interaction, wind-responsive foliage, smoke/fire and ground effects.

The render budget is a ceiling that adapts to hardware. It is not a promise to run every effect simultaneously across the globe.

## Shared products

### BridgePoint Intelligence

Uses the world for property discovery, inspection, claims, infrastructure, environmental analysis, historical review, risk and professional workflows. It retains data permissions, customer packages and the evidence/provenance UI.

### Horizon

Uses the same geographic cells, terrain, structures and environmental systems. Horizon adds gameplay characters, AI, vehicles, inventory, missions, survival state, fictional world events and multiplayer. Gameplay dressing remains distinguishable from surveyed/verified real-world assets.

## Cesium dependency

Project target: Unreal Engine 5.8.

Pinned plugin: Cesium for Unreal v2.31.0. The setup script downloads the official UE 5.8 source-only release, verifies the published SHA-256, and installs it under the local project Plugins directory. That directory is ignored by Git and is not redistributed by BridgePoint.

Cesium for Unreal is free for commercial and non-commercial use. Cesium ion account/token requirements and hosted-data service limits are separate from the plugin license. Do not commit ion tokens or credentials.

## Current implementation status

Implemented in V1:
- WGS84 geodetic validation and ECEF conversion.
- UTC simulation clock with pause, forward time scaling and historical reverse playback.
- Explicit environmental evidence classes.
- Provenance and data-range validation before samples enter the runtime cache.
- Location/time-aware nearest environmental sample lookup.
- Planetary/regional/local/street simulation budget selection.
- Cesium UE 5.8 source-plugin installation with archive hash verification.

Not yet implemented:
- A configured Cesium georeference and initial Earth tileset in a native Unreal level.
- Provider adapters and production data endpoints.
- Photogrammetric Manhattan and other city reality meshes.
- Live cloud/radar/weather ingest into the Earth subsystem.
- Rain/water/fire/vegetation materials and Niagara systems bound to validated source data.
- Pixel Streaming host deployment and browser handoff.

Those are the next build stages. The website production entrypoint is not switched by this foundation commit.
