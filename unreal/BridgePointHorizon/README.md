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
