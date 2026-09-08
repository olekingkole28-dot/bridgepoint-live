# BridgePoint Immersive Weather Engine — Production Direction

## North-star experience
BridgePoint's map should feel like a living Earth simulation, not a dashboard covered in weather markers. The map remains readable at every zoom. Weather becomes physically present only where the source says the event exists, and the visual fidelity rises as the camera approaches it.

## Non-negotiable visual rules
- No nationwide carpet of weather dots.
- At macro zoom, use thin source-backed boundaries, translucent interior shading, tracks/cones/fields and restrained atmospheric motion.
- At regional zoom, add motion vectors, streamlines, storm-cell direction, wind fields and animated source geometry without hiding roads, labels, parcels or buildings.
- At close zoom, instantiate localized cinematic 3D effects only inside source-supported event geometry.
- At ground/near-building zoom, weather may interact visually with 3D terrain/buildings, but never imply damage unless separate evidence proves damage.
- Weather effects must be clipped to the best available source geometry, camera-frustum culled, LOD controlled and GPU-budgeted.

## Truth model
Every event carries distinct observed/current geometry, modeled/forecast geometry, source time, uncertainty and render permission. Never convert a warning, forecast polygon, probabilistic storm object, satellite lightning detection or flood model into observed physical truth.

Important corrections to common weather-engine prompts:
- A live tornado warning does not provide a live EF rating. Do not morph a tornado using EF unless an authoritative observed/post-event source actually provides it.
- A DEM plus a river gauge does not by itself produce precise building-level flood depth. Render exact/quantified water depth only when a compatible inundation/depth/hydraulic product supports it.
- NOAA GLM is satellite total-lightning detection, not an exact ground-strike network.

## Multi-scale LOD
### Continental/state
Render only lightweight context: subtle hazard polygons, radar/precipitation fields, hurricane cloud/vortex context, current center/eye, track/cone and large-scale wind/precipitation fields when source-backed. No event markers unless required as a temporary fallback for data QA.

### Regional/county
Add storm-cell motion, wind streamlines, hurricane inflow/rain bands, wildfire plume direction, flood extent surface and source-supported projected paths. Keep all effects semi-transparent enough to preserve the underlying world.

### City/property/street
Instantiate high-fidelity particles/volumes inside visible event geometry: rain, hail, snow, lightning flashes, volumetric tornado funnel, wildfire smoke/fire/embers, wind-borne particles and water surfaces. Intensity comes from normalized source measurements where available.

### Ground/near-building
Enable building/terrain interaction only where 3D geometry and elevation exist. Rain/hail impact, water surface contact, smoke occlusion and wind interaction are visual simulations, not proof of physical damage.

## Weather asset protocols
- Tornado: observed/current tornado evidence can instantiate a volumetric funnel tied to source position/path/motion. Warning/forecast geometry remains a contextual boundary/path, not proof of a tornado throughout the polygon.
- Hurricane/tropical cyclone: source-backed current center/eye, wind radii, translation vector, track/cone and spiral/inflow rendering. Keep current observed storm state distinct from forecast cone.
- Wildfire: perimeter-constrained flame/smoke/ember rendering; physical effects stay inside mapped current perimeter. Smoke drift may use source-backed wind context.
- Rain: radar/source precipitation volume clipped to the precipitation field. Rain rate controls density/velocity when available.
- Hail: observed/radar storm-object geometry gates the effect. MESH/probability can control visual size/intensity bands but never gets relabeled as ground truth at every point.
- Wind: regional streamline/vector field first; local particles/foliage/building interaction only where data supports it.
- Flood: low-opacity source-backed inundation footprint at macro/regional zoom; local water surface/displacement at close zoom. Z-height requires a valid depth/inundation product.
- Lightning: render flashes inside the supported satellite/radar detection footprint. Exact ground-strike placement requires an actual strike-location source.
- Snow/ice: effect density and surface state follow source-supported area, type and recency.
- Power outage: source-backed affected area/service territory shading; local emissive/flicker effects only where outage state is actually known.

## Rendering architecture
Progressively enhance from WebGPU -> WebGL2 -> CPU/canvas fallback. Use quadtree/tile world partitioning, camera-frustum culling, distance-based LOD, pooled GPU buffers, instancing, adaptive particle budgets and temporal interpolation. Never allocate nationwide cinematic particles.

## Building/terrain requirements
Continue nationwide source-backed 3D building coverage. Store each enrichment independently with provenance and null when unknown: footprint/geometry, height, minimum height, floors/levels, address count, roof shape, roof height, roof pitch/slope, roof direction/aspect, roof material, building class/use and source timestamp. Never infer an exact roof material/age/pitch only from a generic footprint. Terrain/elevation should remain source-backed (for example 3DEP where lawful/available).

## Environmental data translator
Normalize provider-specific data into render parameters without changing semantics: wind speed/direction -> flow vector; rain rate -> particle density; hail MESH -> particle size/intensity band; flood depth -> water-surface Z only when valid; wildfire perimeter -> clipping mask; hurricane radii -> vortex/rain-band bounds. The renderer consumes the normalized scene contract, not raw provider payloads.

## Performance target
The visual goal is a high-end playable Earth/weather simulation, but every effect remains subordinate to source truth, provenance, uncertainty, camera distance and frame-time budgets.