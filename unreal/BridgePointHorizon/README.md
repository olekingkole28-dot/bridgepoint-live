# BridgePoint Horizon — Unreal Client

This is the Unreal Engine 5.8 client track for the same **continuous BridgePoint Horizon universe** used by the browser client.

## Non-negotiable architecture

- One persistent U.S./jurisdiction world identity; no 50-map product.
- BridgePoint APIs remain the geospatial authority for parcels, structures, roads, terrain and verified public/open layers.
- Unreal streams local cells using World Partition/HLOD and never attempts to load the national dataset into memory at once.
- PCG fills survival dressing according to biome/road/building context while preserving the distinction between verified real-world geometry and fictional gameplay objects.
- StateTree + Mass systems handle scalable infected/creature/raider simulation.
- Chaos Vehicles handles repairable road vehicles.
- Water handles swimming, boats and underwater gameplay.
- Niagara handles fire, smoke, weather and impact VFX.
- Enhanced Input supports mouse/keyboard, touch/gamepad mappings, crouch/prone/sprint/slide/vault/ADS.
- Pixel Streaming 2 is the browser path when a GPU host is available; the current Three.js client remains the no-GPU web fallback.

## Content policy

Do not import proprietary Call of Duty, Resident Evil, World War Z, GTA, The Sims or Lord of the Rings assets. Those titles are visual/mechanical references only. Use BridgePoint-original content or assets whose license was verified for commercial project use.

## First Unreal milestones

1. HorizonPersistent World Partition map and georeferenced cell origin.
2. BridgePoint cell-stream client matching the existing Supabase world endpoint contract.
3. Character locomotion/ADS/IK/motion-matching pass.
4. Source-backed buildings + generated interiors/elevators/stairs.
5. PCG apocalypse dressing and no-empty-traversal rules.
6. StateTree infected with patrol/aggro/pack variants and armored hit zones.
7. Seven-slot inventory/backpack and weapon wall cases.
8. Repairable Chaos vehicles, then boats/aircraft.
9. Water/swim/underwater/fishing/hunting/campfire/building.
10. 150-tier monthly season system.
11. Performance gate: HLOD/Nanite/instancing/AI significance/network relevancy.
12. Pixel Streaming deployment only after a GPU budget exists.


## Automated content intake

The Unreal project has the built-in Python Editor Script and Editor Scripting Utilities plugins enabled for asset-pipeline automation.

For legally acquired engine-agnostic source files:

1. Put source files in a staging folder outside the Unreal Content directory.
2. Set the environment variable `HORIZON_ASSET_STAGING` to that folder.
3. Run `Scripts/horizon_batch_import.py` from the Unreal Editor Python environment.
4. The importer routes files into isolated `/Game/Horizon/.../Imported` folders and never overwrites existing content.
5. Review visuals, collisions, materials, animation compatibility, memory, draw calls and runtime cost before promotion.
6. Only after review should assets be moved into production Horizon folders using Unreal asset-management APIs.

Epic/Fab UE-only packs do not go through this raw-file importer. Acquire them through Epic/Fab, retain the acquisition/license evidence, then evaluate their Unreal content in isolated project folders before promotion.

Current promotion order is recorded in `app/horizon-playable/HORIZON_AUTOPILOT_PLAN.md` and provenance rules are recorded in `AAA_SOURCE_LEDGER_V4244.md`.


## Shared BridgePoint Earth runtime

The project now includes a shared Earth runtime subsystem. It is separate from Horizon gameplay code so the same geographic and environmental state can serve BridgePoint Intelligence and Horizon.

- WGS84 coordinates convert to Earth-Centered, Earth-Fixed meters.
- A UTC simulation clock supports live time, pause, accelerated playback and reverse historical scrubbing.
- Environmental inputs retain explicit Observed, Forecast, Modelled or Simulated classifications.
- Source identity, version, license, attribution, retrieval time, validity window and commercial-clearance status stay attached to each sample.
- Input validation rejects missing provenance, invalid physical ranges, malformed coordinates and inverted validity windows.
- Camera altitude selects planetary, regional, local or street effect budgets.

### Install the pinned Cesium plugin

The project enables Cesium for Unreal v2.31.0. Install the official Unreal 5.8 source-only plugin locally before opening the project.

Run this from the BridgePointHorizon project directory:

    powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\Scripts\install_cesium_ue58.ps1

The script verifies the official release SHA-256 and installs into the project Plugins folder, which is intentionally excluded from Git. Existing plugin folders are preserved rather than silently overwritten. The first editor launch will compile the plugin modules.

Cesium's plugin license does not grant rights to every imagery, photogrammetry or 3D building dataset. Review each data source independently and keep ion tokens or credentials out of Git.

See BRIDGEPOINT_EARTH_FOUNDATION_V1.md for the architecture and current implementation boundary. This branch does not switch the production website entrypoint.


## First native Earth globe

The Horizon game mode now creates BridgePointEarthWorld automatically at startup. The actor:

- Creates a Cesium WGS84 georeference using the existing Connecticut start coordinate.
- Creates a Cesium ellipsoid tileset as the planetary surface.
- Adds NASA GIBS / NOAA-20 VIIRS Corrected Reflectance True Color daily imagery using the provider's default time selector.
- Enables Cesium source credits, caps the imagery tile level, limits concurrent tile requests and keeps a bounded sub-tile cache.
- Does not create generic city blocks or invented building geometry.

This is the first real planetary imagery layer, not the finished high-detail Earth. The VIIRS layer is a global daily browse image; it does not provide photogrammetric building facades, roof details or street-level textures. The next imagery/geometry work must use independently verified terrain, aerial, LiDAR and reality-mesh sources.

The Earth actor is part of the native Unreal client only. The production browser globe and its solar-system/planet modules remain unchanged.


## Native Earth startup, terrain and navigation

The default native project now launches into BridgePointEarthGameMode. Horizon remains a separate gameplay mode and can be selected on a Horizon map in World Settings.

- The globe-aware camera starts approximately 16,000 km above the Connecticut georeference origin for a whole-Earth opening view.
- The pawn preserves a local East/South/Up camera frame while moving over the curved planet.
- Movement speed scales with altitude: deliberate near-surface movement becomes faster at regional and planetary heights.
- DefaultInput.ini adds XInput left-stick movement, right-stick look, and trigger lift/lower while retaining the engine's desktop keyboard/mouse controls.

### Optional high-resolution terrain and mapped buildings

When BRIDGEPOINT_CESIUM_ION_TOKEN is present in the local Windows user environment:

- Cesium World Terrain (Ion asset 1) can replace the ellipsoid with globally streamed quantized-mesh terrain.
- Cesium OSM Buildings (Ion asset 96188) can add global OSM-derived 3D building geometry and metadata.
- NASA GIBS VIIRS imagery is draped over the selected Earth terrain surface.
- If no token is present, the world still starts using the ellipsoid and NASA imagery; missing credentials do not block the app.

Run this locally to securely set a read-only token without sharing it in chat or committing it:

    powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\\Scripts\\set_cesium_ion_token.ps1

Restart Unreal after setting the Windows user environment variable.

**Personal-use licensing boundary:** Cesium ion Community is for personal/non-commercial evaluation. Its public terms prohibit including Ion inside a product commercially made available to other organizations without the appropriate commercial integration rights. Keep these Ion-hosted layers local/personal until the applicable rights are secured. Do not route them to BridgePoint customers.

OSM building geometry is not photogrammetry. It supplies mapped massing and metadata, with variable local completeness; it does not supply verified photographic facades, windows, roof machinery or sidewalk objects.


## Global day/night and atmosphere

The Earth runtime creates CesiumSunSky and binds its solar time to BridgePointEarthSubsystem's shared UTC simulation clock.

- The global directional sun is calculated from the WGS84 georeference, UTC date and UTC time.
- The SkyAtmosphere and SkyLight are provided by CesiumSunSky.
- The actor updates the solar position on a bounded interval, not every rendered frame.
- Historical playback, paused time and accelerated simulation all affect the sun position because the runtime uses the shared simulation clock.
- DST is deliberately disabled for the global solar calculation; UTC is used consistently so a local timezone setting cannot shift the planet-wide sun.
- CesiumSunSky updates atmospheric parameters as the camera changes altitude and location.

This delivers real astronomical day/night lighting. It is not a weather effect and does not imply a cloud layer or real-time weather feed.
