# Horizon Upgrade Autopilot

BridgePoint Horizon is **one continuous streamed U.S./jurisdiction survival world**, not a set of 50 demo maps.

## Runtime architecture

- BridgePoint remains the geospatial authority for parcels, boundaries, buildings, building parts, roads, terrain and verified/open real-world layers.
- The browser Three.js/PWA client is the immediate zero-fixed-cost playable client.
- The Unreal Engine 5.8 client is the AAA rendering/gameplay target using the same BridgePoint world APIs.
- Unreal browser delivery may use Pixel Streaming 2 only if a genuinely zero-cost GPU route exists. Do not provision a paid GPU host or paid DigitalOcean resource.
- Never load the national dataset into memory at once. The nation is one logical universe made of streamed cells, LOD/HLOD and persistent player/world state.
- Horizon systems and commerce must remain namespace-separated from BridgePoint B2B systems so game work cannot corrupt the business app.

## Owner-locked zero-budget rule

Owner-funded fixed spend is **$0**.

Do not:
- buy assets
- buy plugins
- provision billable DigitalOcean droplets/services
- provision paid GPU hosting
- add paid SaaS dependencies
- treat a paid service as required for completion

Prefer:
- existing GitHub/static/PWA delivery
- local development/runtime when available
- free/open/public-domain/CC0 sources
- Epic/Fab content only when its license is verified for the intended Unreal use and acquisition itself costs $0
- deterministic automation, tests, source generation, asset preparation, and streamed clients that can run without fixed hosting spend

Stripe transaction fees that occur only when a player voluntarily makes a purchase do not authorize any fixed owner-funded infrastructure.

## Promotion gates

A candidate is never promoted merely because it looks better. It must pass:
1. explicit reusable license
2. commercial-project compatibility
3. engine/content restriction review
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
- original dark-fantasy raiders/creatures, spiders, hounds, bears and regional wildlife
- drivable/repairable cars and trucks, then boats/aircraft
- dense no-boring-space traversal dressing while keeping fictional props separate from property evidence
- real exterior building envelopes with fictional generated full layouts, floors, stairs and elevators
- physical room doors and true doorway openings instead of teleport/card doors
- transparent/open windows that are real wall openings and expose the outside streamed world
- roof access and building-to-building ziplines
- hunting, food, campfires and survival resources
- base construction using wood, fences, barbed wire, brick barricades, generators and electric fencing
- local day/night lighting with city streetlights switching on at night
- clear weapon wall cases that show the weapon, stats and in-game cost before purchase

## IP rule

Call of Duty, Resident Evil, World War Z, GTA, The Sims, Fortnite and The Lord of the Rings are references for feel/mechanical expectations only. Horizon must use original or properly licensed content and must never ship ripped models, animations, audio, code, logos, characters, UI or copied branded presentation.

## Authoritative game modes

HORIZON_GAME_MODES_V4243.json remains the base mode contract:

- YEAR ONE SURVIVAL — solo-only persistent survival event
- INFINITE TEAM DEATHMATCH — duo/trio/squad dense-arena combat
- OUTBREAK RAID — one-to-four-player cooperative PvE objectives, elite creatures, bosses, rare loot and extraction
- shared lobby for mode selection, characters, skins, loadouts, emotes, sprays, friends/invites, ready state, voice and audio settings
- premium audio remains a release gate: spatial audio, occlusion, reverb zones, material footsteps, layered weapon audio, infected/creature vocals, dynamic ambience and mode-correct voice chat

Commerce authorization in V4251 supersedes the older V4243/V4250 "do not connect Stripe" hold.

## Current legal AAA seeds

See HORIZON_ASSET_CANDIDATES.json and unreal/BridgePointHorizon/AAA_SOURCE_LEDGER_V4244.md.

Priority evaluation order:
1. Epic Game Animation Sample + MetaHuman 5.8
2. City Sample Buildings + City Sample Crowds
3. City Sample Vehicles
4. Poly Haven + ambientCG
5. Sonniss GameAudioGDC material
6. Valley of the Ancient as selective Unreal reference/reuse where license permits
7. Paragon Minions/Rampage only as Unreal evaluation seeds for original Horizon hostile roles; never use PARAGON branding
8. Shooter Game + Vehicle Game as architecture/reference lanes, not Horizon visual identity

Every asset must retain provenance and license evidence. No unclear-license package may be auto-promoted.

## Year One owner contract — V4251

The automated Horizon side MUST treat HORIZON_YEAR_ONE_V4251.json as the latest owner-locked Year One contract.

Core rules:
- Year One lasts 365 days.
- It starts only when Kole explicitly gives the live start command.
- Preseason remains Day 0 and does not consume event lives.
- Every player has exactly 3 Year One lives.
- The world is continuous across the U.S. and its jurisdictions.
- Exterior geography/building placement should feel locally recognizable where source-backed data allows.
- Real interior floor plans are prohibited.
- Interior layouts are fictional and procedural but physically traversable.
- Interiors require actual floors, stairs, functional room doors, true doorway/window holes, outside visibility through windows, roof access and multi-floor navigation.
- Rooftop/building-to-building ziplines are core traversal.
- Zombies begin easier/slower overall and become progressively denser, faster, more specialized, armored and coordinated over the year.
- Difficulty varies by event day, geography, population density, survivor pressure and endgame phase.
- Other creatures/infected animals are distributed by biome/geography and must be original or properly licensed.
- Strategic NPCs offer contextual challenges that can reward free items, cosmetics and survival resources.
- A massive infected/zombie wall begins around the outer playable perimeter and progressively contracts inward, pushing remaining survivors toward larger cities for the final Year One showdown.
- The zombie wall is an original Horizon mechanic/presentation, not copied Fortnite content.

## Retention, battle pass and store

- Daily free rewards are enabled throughout all 365 days.
- Free progression remains meaningful and the game must not be pay-to-win.
- Battle pass: 150 levels, USD $9.99, one-time purchase per pass.
- The owner explicitly authorizes use of the **existing BridgePoint Stripe account** for Horizon commerce.
- Horizon products, prices and entitlements must use a separate Horizon namespace and must not alter B2B packages.
- Store categories may include characters, character skins, weapon wraps, balance-safe weapon variants, emotes, sprays, dances, finishers, profile cosmetics and bundles.
- Reasonable target bands:
  - sprays/small cosmetics: $0.99–$2.99
  - emotes/dances: $1.99–$4.99
  - weapon wraps: $1.99–$4.99
  - character skins: $4.99–$9.99
  - bundles: $6.99–$14.99
- Any paid weapon variant must be cosmetic or a balance-safe sidegrade. Meaningful combat power must remain obtainable through free gameplay.
- Free daily items stay available even when the premium store is active.

## Five live Horizon workers — V4251

The previous five hourly BridgePoint worker tasks have been repurposed to Horizon and are recorded in HORIZON_FIVE_WORKERS_V4251.json.

1. **Horizon World & Interiors** — minute :05 each hour
   - world streaming
   - source-backed exteriors
   - fictional physical interiors
   - stairs/doors/window openings
   - rooftops/ziplines
   - regional apocalypse dressing

2. **Horizon Year-One Director** — minute :17 each hour
   - 365-day event state
   - three lives
   - infected progression
   - regional creatures
   - challenge NPC/free rewards
   - zombie-wall endgame

3. **Horizon Gameplay & Combat** — minute :29 each hour
   - locomotion/facing
   - ADS/reticle/weapons
   - inventory/loot
   - enemy pathing/attacks
   - vehicles/traversal
   - gameplay performance/regression fixes

4. **Horizon Content & Economy** — minute :41 each hour
   - free/legal asset intake
   - daily rewards
   - battle pass/store
   - Stripe catalog/entitlements
   - non-pay-to-win enforcement

5. **Horizon QA & Release Governor** — minute :53 each hour
   - browser smoke
   - Unreal source validation
   - mobile/desktop regression
   - performance/collision checks
   - release verification
   - known-good rollback protection

Hard rules for every worker run:
- make measurable implementation/data/test progress when connected tools permit or record the exact blocker
- owner-funded fixed spend stays $0
- do not provision billable DigitalOcean/GPU services
- do not buy assets/plugins
- never ship ripped or unclear-license content
- keep B2B and Horizon state/commerce isolated
- do not start Year One without Kole's explicit live start command
- do not weaken release gates to force a build green
- do not call a build published until the same commit is verified on the live route
