# BridgePoint Earth — Unreal Engine 5 runtime

This is a **new project** under \`unreal/BridgePointEarth\`. It does not depend on, copy, or modify the legacy \`unreal/BridgePointHorizon\` project.

Target engine association: Unreal Engine 5.8. The project enables Enhanced Input, PCG, and Procedural Mesh Component.

## What's implemented in this branch

### Geospatial Earth runtime
- WGS84 latitude/longitude to a region-local metric coordinate frame, Web Mercator slippy-tile lookup, and per-tile geographic bounds.
- Runtime tile requests for the BridgePoint public building MVT endpoint (\`bridgepoint-public-building-tile-v5019\`), BridgePoint city-structure MVT (\`bridgepoint-public-city-structures-v5375\`), BridgePoint city-roof MVT (\`bridgepoint-public-city-roofs-v5376\`), OpenFreeMap vector tiles, and Terrarium elevation PNG tiles.
- PBF/Mapbox Vector Tile decoding into per-source-layer feature arrays with source properties and reported height/base-height/width values retained.
- A bounded tile window around the player. The subsystem cancels in-flight HTTP requests and destroys its transient tile actor when the tile leaves the desired window. It retries failed sources with a per-tile backoff and continues filling the request queue while the player is stationary.
- A per-tile procedural mesh proxy. It samples the decoded elevation grid for vector geometry so terrain, roads, points and building bases share the same local ground surface.
- Independent layer visibility for the feature classes the runtime decoder understands.

The initial projection is **a local regional play space**, not a planet-sized spherical globe. Set a geographic origin before play, then place the player relative to that origin. For long-distance travel across continents, add a floating-origin/rebase strategy or use separately anchored regional World Partition maps; do not expect a single flat tangent plane to preserve Earth curvature globally.

### World Partition and Nanite
\`ABPWorldPartitionAnchor\` follows a chosen actor and carries a \`UWorldPartitionStreamingSourceComponent\`. Use it to request editor-authored World Partition cells around the player. The data-tile proxies are separate transient runtime actors.

Important engine constraint: the live GIS decoder emits procedural mesh sections, not Nanite runtime meshes. Nanite should be used for **prebuilt/imported static meshes** (city blocks, hero buildings, bridges, detailed props) cooked into World Partition cells. Do not expect arbitrary PBF polygons or a freshly generated runtime mesh to become Nanite simply by setting a flag. See Epic's [Nanite technical details](https://dev.epicgames.com/documentation/en-us/unreal-engine/nanite-virtualized-geometry-in-unreal-engine) and [World Partition streaming-source API](https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Runtime/Engine/UWorldPartitionStreamingSourceComponent).

### Earth layer controls
\`UBPWorldLayerMenuWidget\` builds the feature-layer menu from the runtime catalog. Connected sources can be toggled; missing adapters remain visible as **SOURCE PENDING** and disabled. This is deliberate: the UI does not invent data or display empty/fake features as if they were live.

Connected in this initial branch:
- Elevation / terrain (Terrarium)
- BridgePoint buildings
- BridgePoint city structures
- BridgePoint roofs
- Roads / carriageways
- Sidewalk / footpath classes
- Rail classes
- Water and land-cover/vegetation source layers from OpenFreeMap

Visible but still pending a full adapter in this branch:
- Satellite/orthophoto imagery draped as a material
- Bridge-specific geometry and engineered bridge assets
- Tree species/individual tree models, street furniture and streetlights
- Wells, utility towers, power poles, powerline sag/cables and subsurface networks
- Live weather, radar, storm tracks, wind, wildfire and flood overlays
- Aircraft, drones, ships, satellites and orbital history
- Property opportunities, listings and 30-day history
- Lunar elevation/vector tiles and lunar environment asset sets

The current Earth application has more intelligence feeds than the first Unreal adapter set. The catalog deliberately preserves those feature controls, but they are not represented as integrated until their specific data adapters are added and verified.

### Procedural interiors
\`ABPProceduralInteriorActor\` accepts a local XY footprint in **centimetres**, total height in centimetres, and floor count. It computes per-floor heights, clips floor cells against the footprint, leaves a continuous central shaft, reserves a corridor band, generates interior partitions only (no outer perimeter walls), and places one configured stair mesh per floor transition.

The stair asset must have its pivot at its lower landing and be authored to fit the configured shaft width. Irregular footprints are approximated using a cell grid; this is a procedural starter, not an architectural/BIM wall solver. Add door openings, egress/occupancy rules, column grids and polygon triangulation before using it for production interiors.

### PCG data export
\`UBPPCGBridgeComponent::BuildStructuralCollection()\` returns a real \`FPCGDataCollection\` with:
- \`WorldFeatures\` pin: per-source-layer \`UPCGPointData\`, with oriented line samples and collection tags.
- \`ClearanceZones\` pin: separate per-layer point sets tagged \`NoScatter\`, sampled along roads, sidewalks, rails, towers, power/line features, wells and bridges.

Assign the currently loaded feature array to \`SourceFeatures\` and the same longitude/latitude world origin used by the tile subsystem. In the PCG graph, consume the collection through a custom PCG source node or a Blueprint/C++ graph-input adapter. This branch exports the collection; it does **not** silently rewrite a graph asset's input-node configuration at runtime.

### FPS character and combat
- \`ABPExplorerCharacter\` uses Enhanced Input and the custom movement component.
- Locomotion has jogging, sprinting, crouching and prone stances, stamina drain/regeneration, interpolated capsule height, camera-height transitions and velocity-based turn lean.
- \`UBPInventoryComponent\` enforces backpack weight and stack-slot capacity. Carried load scales sprint speed, stamina drain and braking.
- \`UBPModularCharacterComponent\` loads modular body slots (head/torso/legs/backpack/vest, etc.) using a JSON array of soft skeletal-mesh and material paths; each follower mesh uses the master skeleton pose.
- \`UBPWeaponComponent\` traces from the camera to find the aim point, then fires a muzzle-origin trace with spread and recoil/recovery. The hit delegate is broadcast and the struck \`ABPGeoTileProxyActor\` receives \`OnTileImpact\`. MetaSound impact audio is spawned at the contact point and receives \`SurfaceType\` and \`ImpactIntensity\` float parameters.

Configure a skeletal-mesh socket matching \`MuzzleSocket\`, Enhanced Input actions/mapping context, compatible skeleton assets, and physical materials. The example surface names are in \`Config/DefaultEngine.ini.example\`; create and assign Concrete and LunarSoil physical materials and make the MetaSound expose the named parameters.

### Earth / Moon environment
\`UBPEnvironmentManagerSubsystem\` switches world gravity to -980 cm/s² (Earth default) or -162 cm/s² (Moon), scales the jump velocity using the configured Moon curve, and adjusts registered exterior ambience using MetaSound parameters \`VacuumDamping\` and \`AmbientAirGain\`. Do not register suit/intercom audio in the exterior ambience list. The lunar environment **gravity/audio switch is implemented; the lunar DEM, texture and vector tile source is still pending**.

## Editor setup

1. Open \`BridgePointEarth.uproject\` in UE 5.8 and allow project files/build to regenerate. Enable the bundled Enhanced Input, PCG and Procedural Mesh plugins if the editor prompts.
2. Create a new **World Partition** map for this project. Do not migrate or open the old Horizon map as the replacement world.
3. Set a GameMode's default pawn to a Blueprint child of \`ABPExplorerCharacter\`. Create an Enhanced Input Mapping Context and Input Actions, then assign them on the character Blueprint (Move/Look are Vector2D; the other actions are digital).
4. Place \`ABPWorldPartitionAnchor\` in the persistent level. On BeginPlay, call \`FollowActor\` with the possessed pawn. Configure the source's target grids/loading range to match your World Partition runtime grids.
5. Before the player moves, get \`UBridgePointEarthStreamingSubsystem\` from the world and call \`ConfigureWorldOrigin(Longitude, Latitude)\`. The pawn's XY world position is interpreted as east/north metres from this origin, converted to Unreal centimetres.
6. Copy \`Config/DefaultGame.ini.example\` to your project's \`Config/DefaultGame.ini\` and supply the BridgePoint **public/publishable** project key. Do not put a service-role or other secret key in the client. Keep any private credentials out of Git.
7. Create a PCG graph with input pins named \`WorldFeatures\` and \`ClearanceZones\`, then connect a small PCG source/input adapter to the returned \`FPCGDataCollection\`. Use the \`NoScatter\` tag to subtract/avoid clearances before foliage and street-prop sampling.
8. Create your concrete/lunar-soil physical materials and a MetaSound source with float inputs \`SurfaceType\`, \`ImpactIntensity\`, \`VacuumDamping\` and \`AmbientAirGain\` as appropriate.

## Current validation status

- Geographic round-trip, tile-bounds and empty-MVT automation tests are included under \`Private/Tests\`.
- This branch has **not been compiled or run in an installed Unreal Editor in this session**. Treat it as a draft integration baseline until it is generated, compiled and exercised in UE 5.8. In particular, verify the exact BridgePoint endpoint response headers/payloads and check collision, mesh winding, PCG graph input wiring and multiplayer movement replication before production use.
