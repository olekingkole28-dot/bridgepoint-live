# Horizon Upgrade Autopilot

BridgePoint Horizon is now defined as **one continuous streamed U.S./jurisdiction survival world**, not a set of 50 demo maps.

## Runtime architecture

- BridgePoint remains the geospatial authority for parcels, boundaries, buildings, building parts, roads, terrain and verified/open real-world layers.
- The browser Three.js client is the immediate low-cost playable client.
- The Unreal Engine 5.8 client is the AAA rendering/gameplay target using the same BridgePoint world APIs.
- Unreal browser delivery is Pixel Streaming 2 when a GPU host is available; do not pretend a static GitHub Pages site can run the full UE renderer.
- Never load the national dataset into memory at once. The nation is one logical universe made of streamed cells, LOD/HLOD and persistent player/world state.

## Automatic asset scouting

The background governor has a low-resource Horizon lane that scouts Fab/Epic and other reputable sources without starving cadastral #5.

Candidate categories:
- motion matching, locomotion, traversal and combat animation
- realistic survivors, infected/horror creatures, animals and original dark-fantasy raiders
- weapons, scopes, recoil/reload systems and VFX
- city/building/interior kits and procedural generation
- repairable vehicles, boats and aircraft
- survival crafting/building, hunting/fishing and camp systems
- audio, UI/inventory/backpack, lighting, weather and performance systems

## Promotion gates

A candidate is never promoted just because it looks better. It must pass:
1. explicit reusable license
2. commercial-project compatibility
3. engine/content restriction review (including UE-only)
4. no ripped/proprietary IP
5. visual-quality improvement
6. memory/GPU/network budget
7. gameplay integration test
8. regression test against movement, weapons, terrain grounding, interiors and world streaming
9. production release verification

## Gameplay target

- seven-slot quick bar with colored item/rarity icons
- starter flashlight that can occupy a usable slot
- walk, sprint, crouch, prone/army crawl, slide, vault, jump, lean, swim and underwater traversal
- ADS, scopes/snipers, recoil, reloads, weapon switching, melee and armor hit zones
- walker/runner/sprinter/screamer plus helmeted and police/SWAT armored infected
- original orc-like highway raider packs, spiders, hounds, bears and regional wildlife
- drivable/repairable cars and trucks, then boats/aircraft
- dense no-boring-space traversal dressing while keeping fictional props separate from property evidence
- real building envelopes with generated full layouts, floors, stairs and elevators
- hunting, food, campfires and survival resources
- base construction using wood, fences, barbed wire, brick barricades, generators and electric fencing
- local day/night lighting with city streetlights switching on at night
- 150-level monthly rotating season with strongest game rewards late in the track
- clear weapon wall cases that show the weapon, stats and in-game cost before purchase

## Current legal AAA seeds

See `HORIZON_ASSET_CANDIDATES.json`. Epic's free Game Animation Sample, City Sample family and Electric Dreams are evaluation seeds for the Unreal client. UE-only content stays UE-only.

## IP rule

Call of Duty, Resident Evil, World War Z, GTA, The Sims and The Lord of the Rings are references for feel only. Horizon must use original or properly licensed content and must never ship ripped models, animations, audio, logos or characters from those games/films.
