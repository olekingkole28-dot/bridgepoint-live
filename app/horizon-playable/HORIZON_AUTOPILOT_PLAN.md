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


## Authoritative game-mode contract (V4243)

The automated Horizon side MUST treat `HORIZON_GAME_MODES_V4243.json` as authoritative.

- Exactly three modes: YEAR ONE SURVIVAL, INFINITE TEAM DEATHMATCH, OUTBREAK RAID.
- YEAR ONE SURVIVAL is solo-only. Players may customize in the shared lobby, but no party enters Year One together.
- INFINITE TEAM DEATHMATCH supports duo, trio, and squad parties and uses the infinite dense-arena switcher.
- OUTBREAK RAID supports one-to-four-player cooperative PvE missions with objectives, elite creatures, bosses, rare loot, and extraction.
- One shared lobby owns mode selection, characters, skins, loadouts, emotes, sprays, friends/invites, ready state, voice settings, and audio settings.
- Premium audio is a release gate: spatial audio, occlusion, reverb zones, material footsteps, layered weapon audio, infected/creature vocals, dynamic ambience, and mode-correct voice chat.
- Do not connect Stripe until the owner explicitly gives the final go-ahead.


## AAA source promotion order (V4244)

Use this order when the automated asset side has available capacity. Do not replace a working system merely because a pack is newer.

1. Game Animation Sample + MetaHuman 5.8
   - Target: responsive locomotion, traversal, high-fidelity survivors, retargeting.
   - Unreal-only pipeline.
2. City Sample Buildings + City Sample Crowds
   - Target: dense city visual quality, entrances, modular multi-level city dressing, crowd reference.
   - Unreal-only pipeline; BridgePoint remains the authority for real-world placement/geometry.
3. City Sample Vehicles
   - Target: realistic cars/trucks/bus/van foundations and driving behavior.
   - Unreal-only pipeline.
4. Poly Haven + ambientCG
   - Target: photoreal HDRIs, PBR surfaces, ground, concrete, wood, metal, roofing, siding and environment props.
   - Prefer these CC0 sources for engine-agnostic material upgrades.
5. Sonniss GDC 2026 audio
   - Target: layered weapons, footsteps, foley, impacts, infected/creatures, weather, interiors/exteriors and horror ambience.
   - Never redistribute standalone source audio.
6. Valley of the Ancient
   - Reference/selective reuse for mountain terrain, ruins, Nanite/Lumen and World Partition patterns.
7. Paragon Minions / Rampage
   - Evaluate only for original Horizon hostile/boss implementations inside Unreal; never use PARAGON naming/branding.
8. Shooter Game + Vehicle Game
   - Architecture/reference lanes for combat, AI, physics and audio patterns, not visual identity.

Promotion gates for every source:
- explicit license recorded
- correct engine restriction recorded
- source provenance retained
- no ripped/proprietary third-party game assets
- performance profile completed
- gameplay or visual improvement demonstrated
- browser/client separation respected
- smoke test passes before production promotion


## Time-sensitive Fab acquisition watch (2026-09-12)

Current Fab Limited-Time Free page shows these packs free until September 22:
- Sharur's Normandy Village + PCG Plants
  - Strong fit for ruined rural/village cells, broken stone structures, grass/trees/bushes and PCG vegetation.
  - Status: CLAIM/EVALUATE ONLY until the exact selected Fab license/acquisition evidence is retained.
- Industrial Infrastructure by Sierra Division
  - Strong fit for factories, warehouses, transit hubs, construction sites, catwalks, ladders, railings, pipes, stairs, doors and industrial interiors.
  - Status: CLAIM/EVALUATE ONLY until the exact selected Fab license/acquisition evidence is retained.
- RPG - Crafting & Environment VFX by VRhinoFX
  - Strong fit for forge/crafting effects, heat distortion and environment Niagara effects.
  - Status: CLAIM/EVALUATE ONLY until the exact selected Fab license/acquisition evidence is retained.

Do not auto-promote any limited-time pack merely because its price is temporarily zero. The acquisition/license snapshot must be preserved first, then normal performance and regression gates apply.

Additional free evaluation candidates:
- Zombie Animation Pack: Standard — 50 horror/zombie animations; evaluate retarget quality and license snapshot before use.
- MC Sample Animation Pack — 120+ mocap animations on UE5 mannequin; evaluate against Game Animation Sample before adding duplicate animation weight.
- TEUTHISAN Alien Predator — cinematic-quality free rigged creature; evaluate only as an original Horizon creature/boss role, not as a core infected replacement.
- Weapon Pack 03 animated revolver — high-quality free weapon/animations; useful as a rare/period weapon candidate, not a core modern firearm replacement.
