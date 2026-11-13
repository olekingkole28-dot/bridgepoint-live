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

Implemented in V1 source:
- WGS84 geodetic validation and ECEF conversion.
- UTC simulation clock with pause, forward time scaling and historical reverse playback.
- Explicit environmental evidence classes.
- Provenance and data-range validation before samples enter the runtime cache.
- Location/time-aware nearest environmental sample lookup.
- Planetary/regional/local/street simulation budget selection.
- Cesium UE 5.8 source-plugin installer with archive hash verification.
- Runtime Cesium georeference centered on the existing Connecticut Horizon start coordinate.
- Runtime Cesium ellipsoid tileset as the global planetary surface.
- NASA GIBS / NOAA-20 VIIRS true-color daily satellite browse imagery, using the provider's default time selector.
- Cesium source credits enabled for the tileset, with bounded imagery tile concurrency and cache settings.

Important visual boundary: the VIIRS layer provides global context only. It is not aerial photography, street-level imagery, building photogrammetry or a verified roof/facade texture source. No city geometry has been fabricated by this stage.

Not yet implemented or locally verified:
- A successful Unreal 5.8 C++ build and editor launch with the Cesium plugin installed.
- A camera/first-frame experience that opens with a cinematic whole-Earth view.
- Production provider adapters and data endpoints for imagery, terrain, buildings and environmental observations.
- High-resolution terrain, bathymetry and global building 3D Tiles.
- Photogrammetric Manhattan and other city reality meshes.
- Live cloud/radar/weather ingestion into the Earth subsystem.
- Rain/water/fire/vegetation materials and Niagara systems bound to validated source data.
- Pixel Streaming host deployment and browser handoff.
- A production website entrypoint cutover.

The website production entrypoint is not switched by this foundation branch.


## Global terrain, mapped buildings and native navigation

The native Earth actor supports a local Cesium ion path:

- Cesium World Terrain asset 1 supplies quantized-mesh terrain and water-mask information. Its resolution varies geographically; it is not uniform survey-grade terrain around the whole planet.
- Cesium OSM Buildings asset 96188 supplies globally streamed OSM-derived 3D building geometry and metadata. This is mapped massing, not photogrammetric facade reconstruction.
- NASA GIBS VIIRS imagery is overlaid on whichever terrain surface is active.
- Without a local Ion token, the actor falls back to the WGS84 ellipsoid and NASA imagery.
- The native default GameMode is now BridgePointEarthGameMode, using a Cesium globe-aware camera pawn with altitude-adaptive movement. Horizon retains its own GameMode.
- Standard XInput left-stick movement, right-stick look, and trigger lift/lower mappings are included.

The token is read only from the local Windows user environment variable BRIDGEPOINT_CESIUM_ION_TOKEN. The repository never stores it. Cesium ion Community is personal/non-commercial evaluation; the public terms do not permit commercial sublicensing of Ion inside an app sold to external organizations. This opt-in path must remain personal/local until a commercial integration license or another independently licensed delivery route is available.

## Current implementation status — locally unverified gates

Implemented in source:
- Shared WGS84/time/evidence runtime and source-aware environmental sample cache.
- Cesium georeference, ellipsoid fallback and NASA global daily satellite browse imagery.
- Optional Cesium World Terrain and OSM Buildings from locally configured Ion token.
- Globe-aware camera pawn, planetary startup position, altitude-adaptive speed and gamepad mappings.
- Separate Earth Intelligence default GameMode; Horizon GameMode remains available.
- Local secure token setup script and repository source guards.

Still requires the actual Unreal 5.8 machine test:
- Install/compile Cesium for Unreal in the local project.
- Open the native project and confirm the first-frame Earth view, terrain, imagery attribution and camera navigation.
- Test controller movement and look on the user's controller.
- Confirm Ion asset access and quotas on the user's own account; no token is present in the repository.
- Acquire independently licensed photogrammetry/reality meshes for Manhattan and other cities.
- Add high-resolution local terrain and LiDAR/photogrammetry adapters.
- Bind live cloud/radar/weather and regional hazard observations into Niagara, Water, SkyAtmosphere and foliage systems.
- Add Pixel Streaming GPU host and website bridge.

The production browser globe, space renderer and planetary modules remain untouched on this branch.


## Astronomical lighting and atmosphere

CesiumSunSky is spawned against the same Cesium georeference as the Earth surface. Its solar position is driven by `UBridgePointEarthSubsystem::GetSimulationClockUtc()` and recomputed on a bounded update interval.

This creates a single coherent planetary sun direction and SkyAtmosphere. UTC is passed directly to Cesium's sun-position calculation with DST disabled, avoiding a local civil-time offset being applied twice. The shared simulation clock therefore also drives sunrise/sunset and historical day/night playback.

CesiumSunSky's atmospheric adjustment follows camera position/altitude. It does not supply clouds, precipitation, wind, or storm data; those are separate weather inputs to be added later.


## Observed cloud field — NOAA GOES ABI

The first near-real-time cloud observation pipeline combines two complementary NOAA/NESDIS products from each operational geostationary view:

- ABI-L2-ACMF: Enterprise Cloud Mask, four-level classification plus optional probability and quality flags.
- ABI-L2-ACHA2KMF: 2 km Cloud Top Height (HT, metres) plus data quality flags.

GOES-19 supplies the East view and GOES-18 supplies the West view. Full-disk products are nominally generated every ten minutes. The pipeline matches mask and height observations by their UTC scan start time, retains only quality-valid pixels, transforms the geostationary grid to WGS84, and samples a bounded number of points per satellite.

The output is an observed cloud-point field containing geographic position, cloud-top height, mask class, probability, opacity hint and source metadata. It is stored outside Git under the ignored Unreal ExternalAssets directory.

UBridgePointEarthCloudSubsystem loads those local point fields, rejects unsupported schemas, unsafe paths, malformed coordinates, invalid atmospheric heights and missing provenance, and marks feeds older than 30 minutes stale. It does not synthesize missing satellite coverage.

This is source data for the next volumetric/Niagara rendering stage. It is not yet a photorealistic cloud-volume renderer, and 2 km source sampling does not resolve fine cloud filaments or street-level weather.
