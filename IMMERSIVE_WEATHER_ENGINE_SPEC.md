# BridgePoint Immersive Weather Engine — Execution Spec

## Core rendering rule
The map is a living geospatial world. Weather is not represented as nationwide dots, badges, or opaque heatmaps. At broad zoom levels, render only source-backed footprints, tracks, cones, radar fields, wind fields, and subtle atmospheric context. High-fidelity physical weather effects are instantiated only inside the camera frustum and only after the camera crosses the event-specific zoom threshold.

## Truth model
Every renderable event carries separate observed geometry, modeled/forecast geometry, measurement metadata, uncertainty, source timestamp, and render permission. Never upgrade a warning, forecast cone, probabilistic storm object, satellite lightning detection, or flood model into an observed physical fact. Exact-looking effects must stay inside the best source-supported geometry. Flood depth is shown only where a compatible elevation/inundation/depth source supports it. EF rating is never treated as live tornado intensity unless an authoritative observed/post-event source actually provides it.

## Multi-scale LOD
1. Continental/state view: no weather dots. Show thin luminous boundaries and low-opacity interior shading for source-backed hazard footprints. Hurricanes may show broad cloud/vortex context, eye/center, track and cone if source-backed. Radar remains translucent.
2. Regional/county view: add motion vectors, storm-cell motion, wind streamlines, wildfire plume direction, hurricane inflow bands, flood extent surface, and event-specific motion paths. Keep geometry visible beneath the effect.
3. City/property/street view: instantiate high-fidelity local effects only inside visible event geometry. Rain/hail/snow particles, lightning flashes, volumetric tornado funnel, smoke/fire, wind-borne particles and water surfaces scale with measured/source-backed values.
4. Ground/near-building view: use building/terrain interaction only when geometry and elevation data exist. Effects must not create a false claim of property damage.

## Weather asset protocols
- Tornado: source footprint/path + motion vector; volumetric funnel only for observed/current tornado evidence. Forecast or warning polygons remain contextual boundaries and direction/path graphics. No fake live EF morphing.
- Hurricane/tropical cyclone: source-backed center/eye, radius fields, track/cone, translation vector, spiral/inflow rendering. Keep current observed storm geometry distinct from forecast cone.
- Wildfire: perimeter-constrained flame/smoke/ember system. Effects are clipped to mapped incident perimeter and visible only when zoomed close enough. Smoke direction may use source wind context when available.
- Rain: radar-derived precipitation volume/particles clipped to radar/source field. Rate controls density/velocity where available.
- Hail: radar/observed report geometry controls eligibility. Hail particles appear only after close zoom; MESH/probability values modulate visual intensity without being relabeled as ground truth.
- Wind: vector field/streamline visualization with arrowless flow lines at regional zoom and local particles/foliage/building interaction only where data supports it.
- Flood: source-backed inundation boundary with low-opacity water shading at macro zoom; displaced/rippled water surface at close zoom. Water height requires a compatible depth grid/gauge+hydraulic relation and must not be invented from DEM alone.
- Lightning: satellite/radar lightning detections render flashes inside supported detection footprint; never as an exact ground strike unless the source actually is a ground-strike network.
- Snow/ice: precipitation/surface effects tied to source-supported area and recency.
- Power outage: utility/source-backed affected area or service territory shading; local emissive/flicker effects only where outage state is actually known.

## Rendering stack
Use progressive enhancement:
- WebGPU when available for compute/particle simulation and volumetric effects.
- WebGL2 fallback for compatible shaders/instancing.
- CPU/canvas fallback for thin geometry and minimal motion only.
- Quadtree/tile-based world partitioning, camera-frustum culling, distance-based LOD, effect budgets, pooled GPU buffers, instancing, and temporal interpolation.

## Performance budgets
- Never allocate nationwide high-fidelity particles.
- Maintain active effect tiles only for visible/near-visible cells.
- Use strict per-frame GPU budgets, adaptive particle counts, pooled buffers and offscreen suspension.
- Prefer source geometry simplification at low zoom and full geometry only near the camera.
- Preserve map legibility: atmospheric effects must not obscure parcel/building geometry or labels.

## Building/terrain integration
BridgePoint's building coverage lane should continue toward nationwide source-backed 3D geometry. Required enrichment fields are stored independently with provenance and null when unknown: height, minimum height, floors/levels, address count, roof shape, roof height, roof pitch/slope, roof direction/aspect, roof material, building class/use, and source timestamp. Do not infer exact roof material/age/pitch solely from a generic footprint. Terrain/elevation should use source-backed DEM/3DEP or equivalent legal sources.

## Data translator
Normalize raw weather values into render parameters without changing semantics. Examples: wind speed/direction -> flow vector; rain rate -> particle density; hail MESH -> particle size/intensity band; flood depth -> water-surface Z only when a depth source is valid; wildfire perimeter -> clipping mask; hurricane radius -> vortex/rain-band radius. The renderer reads the normalized scene contract, not raw provider-specific payloads.

## Product requirement
The experience should feel like entering a high-end Earth/weather simulation, but every visible effect remains subordinate to source truth, provenance, uncertainty, and camera-level detail rules.