# Earth-Scale Water, Clouds, Storms, and Sky Camera Backlog

**Status: OPEN / NOT COMPLETE.** This is a durable owner-requested implementation ledger. Keep it current across coding sessions. Do not mark an item complete because a button, prototype, synthetic shape, or passing source-code check exists; require working data, visual inspection, and production verification.

## Working hypothesis: underwater zoom-through and shoreline problems

The suspected failure is that BridgePoint's vertical world model may not yet have consistent, source-backed elevations for the ocean floor and inland water bodies. If bathymetry is missing at a tile, mixed with an incompatible vertical datum, or not participating in the camera ground guard, the camera may zoom through the apparent underwater floor and coastlines may look rough or misaligned.

**This is a hypothesis to test, not a proven root cause.** Also inspect map camera/zoom clamps, terrain tile resolution and overzoom, land/sea masks, source transitions, and vertical-datum conversions before attributing every shoreline defect to missing bathymetry. The user believes deep-ocean data may already be available; inventory and validate the current data first rather than re-ingesting blindly.

## 1. Continuous Earth surface and water volume

- [ ] Inventory all currently materialized bathymetry/depth sources, tiles, extents, resolution, units, vertical datum, provenance and refresh date. Verify deep-ocean depth and whether coast/near-shore resolution is sufficient; do not assume worldwide completeness from a dataset being present.
- [ ] Compare bathymetry with the same terrain/elevation system used by the map and camera. Normalize vertical datums and signs; define unambiguous elevation_m / depth_below_surface_m semantics and preserve null where depth is unknown.
- [ ] Validate land/sea masks and LOD transitions at coastlines, islands, reefs, estuaries, deltas, fjords, harbors and shelves. Fix cracks, cliffs, displaced shorelines, shallow-water gaps and zoom-through caused by mismatched source tiles.
- [ ] Add source-backed inland hydrography coverage for rivers, streams, canals, lakes, reservoirs, ponds and other mappable water bodies, including geometry/width where available. Bathymetry alone does not provide the inland-water outlines, beds, water levels or flow.
- [ ] Materialize water-bed depth and water-surface elevation/level separately where credible sources support them. Track source, timestamp, units, uncertainty and whether each value is observed, modelled or unknown.
- [ ] Derive water-surface Z from an appropriate documented reference: sea level/tide observations for coasts and estuaries; observed/modelled stage for rivers, lakes and reservoirs; do not assign a fictitious uniform level to every inland water body.
- [ ] Build continuous water-surface rendering for oceans and inland water bodies, using consistent coordinates with terrain and bathymetry. Water is pass-through for the camera; the physical terrain or verified water-body bed is the hard stop, including under the ocean.
- [ ] After static geometry/depth alignment is validated, increment to sourced tides/currents, flow direction and speed, surface waves, storm surge, flood extent/depth and building-ground/water contact. Clearly distinguish live observations, model output and visual approximation.

## 2. Global cloud field — current gap, not complete

- [ ] Replace the current purely procedural global fill with a source-backed, georeferenced global cloud mask/composite from lawful satellite cloud observations. The target is a realistic global distribution with large cloud decks, mid-latitude frontal systems, equatorial cloud bands, open-sky gaps, wispy cirrus and dense convective towers. Do not use a static picture as a substitute for volumetric clouds.
- [ ] Use successive satellite observations/cloud-motion vectors where available; otherwise use a source-backed atmospheric wind model appropriate to each cloud altitude. Remove the random per-puff direction as the claimed real-world driver.
- [ ] Connect height-resolved cloud-base/top observations or model data where actually available. Every cloud should retain a world coordinate, height, thickness, source/fallback classification and timestamp. Unknown heights must not be presented as measured.
- [ ] Tune global silhouettes and density against full-disk NASA/NOAA-style imagery, then inspect regional, city and street-level scales. Rounded thin cloud puffs must remain thin but billowy rather than polygonal; broad clouds should be connected where real cloud decks are connected, not a random set of equally weighted blobs.
- [ ] Keep global coverage persistent through globe motion and zoom changes. Cull or simplify geometry safely for mobile; no disappearance on drag, close zoom, map-style refresh or camera tilt.
- [ ] Keep the formation-budget and GPU/index-buffer limits explicit in tests. Never raise geometry resolution past the current index format's limits or by silently exhausting the local storm/cloud budget.

## 3. Hurricane eyes and large storm systems

- [ ] Use the latest source-backed storm center, track, intensity, eye radius and available gale-/storm-force radii/cloud-shield bounds. Prefer provider values and timestamps; clearly mark modelled/fallback dimensions when a feed omits them.
- [ ] Render a genuinely clear central eye surrounded by a defined eyewall, multiple curved spiral rainbands and the large high cloud shield. At full-globe zoom the eye and spiral should still read as a hurricane, not a small circle, an opaque blob, or randomly arranged puffs.
- [ ] At regional zoom, represent wide frontal/convective systems and connected storm shields over multi-state distances only when supported by cloud observations, radar/forecast geometry or a clearly labelled model. Do not invent a real storm over clear sky.
- [ ] Keep storm cloud tops at a plausible/source-backed altitude and anchor lower cloud bases over the correct terrain or water-surface datum. The ocean-floor elevation is not the sea-surface elevation.
- [ ] Validate a current source-backed storm at full globe, regional, city and close zoom; test eye clearance, spiralling geometry, source freshness, motion direction and mobile performance.

## 4. Street-level sky / look-up camera

- [ ] Solve the existing inability to tilt the street-level camera above the visible horizon and look up into the sky. The current MapLibre map camera's pitch cap has been observed clamping at 85 degrees even though source code requests 110; simply raising the numeric setting is not a fix.
- [ ] Design/test a real sky-facing camera mode that preserves the current geographic world position and links to the same georeferenced cloud layer and cloud heights. Clouds, sky, and future Sun/light effects must be visible overhead at minimum street zoom; do not fake this by stretching clouds across a screen-space overlay.
- [ ] Ensure the user can return to the ordinary map view without losing location, selected property, layers, cloud state or LOD. Keep this scoped to the world camera / clouds rather than adding unrelated UI.

## Acceptance checks before marking complete

1. At full-globe zoom, compare the actual production result against global satellite reference imagery: no arbitrary empty-ocean patches where cloud decks should be; no repeating hexagon/square silhouettes; recognizable tropical-cyclone eyes/spirals only when supported by a current storm source.
2. Confirm cloud silhouettes, decks and storm extent persist while the user drags, rotates, changes projection and zooms from orbit to street level.
3. Confirm cloud heights/motion report their source or fallback honestly; height-aware clouds are not allowed to use seabed elevation as the ocean surface.
4. Dive through the ocean surface and stop at the verified bathymetric bed; pan/zoom through shorelines, river channels, lakes and estuaries without vertical cracks or false ground.
5. Run clean build, global cloud checks, real storm/eye checks with a source-backed fixture, map camera/sky tests, mobile tests and the production cutover. Record failures separately; the known ground-camera/terrain readiness timeout remains a separate unresolved test.
6. Confirm the live site is serving the version tested. A merged branch or successful static assertion alone is not deployment proof.

## Current known state

- Cloud renderer v6076 is deployed and uses a persistent procedural global field with enlarged rounded banks, fine isolated puffs and a thin high layer. It is **not yet driven by a complete global satellite cloud mask**.
- Current diagnostics say source-backed cloud-top samples are not connected unless a matching sample is present, and live altitude-resolved wind coupling is not yet source-backed. Existing procedural cloud motion is not evidence of real atmospheric motion.
- The cloud-specific toggle/persistence checks passed on the recent production workflow. The later ground-camera/retained-LOD smoke timed out after the Gold/Silver/Bronze tier checks passed; Android testing was skipped after that failure.
- Latest production smoke detail (2026-10-22): the Gold/Silver/Bronze controls passed and facade-detail thresholds changed in order, but the ground-clamp test then timed out after 25 seconds waiting for a finite terrain elevation at central NYC around zoom 16.8. The diagnostic reported `styleLoaded: false`; `getMaxPitch()` reported 85 even though the owner map setup asks for 110. The current source uses Mapzen Terrain Tiles (`raster-dem`, `maxzoom: 15`) for terrain; the test does not establish complete bathymetry or a working sky-facing camera. Fix/test terrain readiness and actual elevation sample availability separately; then test the sky camera so it can look above the horizon. Do not count the pitch target recorded in `__BP_CAMERA_GROUND_GUARD_V6017__` as the actual MapLibre pitch limit.
