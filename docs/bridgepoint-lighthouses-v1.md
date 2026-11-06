# BridgePoint Materialized 3D Lighthouses v1

The lighthouse layer is additive to the existing BridgePoint globe and reuses the map's existing MapLibre/Three.js WebGL context. It does not replace the map, globe, terrain, roads, bridges, buildings, authentication, app shell, utility renderer, or bottom card.

## Source and coverage

Locations are discovered from OpenStreetMap contributors using the lighthouse-specific tags \`man_made=lighthouse\`, \`building=lighthouse\`, and \`seamark:type=light_major\`. The renderer materializes only returned source features; it does not invent lighthouse coordinates or turn generic navigation buoys into lighthouses. OSM coverage is global in geographic scope, not complete in every country or coastline. A missing source feature remains absent until mapped upstream.

The initial source query is global and bounded to 10,000 records. If that request is unavailable, the renderer can request the current viewport while zoomed in. Data is cached in memory for the active map session. OpenStreetMap data is © OpenStreetMap contributors and is available under the Open Database License (ODbL).

## Geometry and dimensions

Each model is a solid, faceted 3D structure: tapered tower body, base plinth, top gallery, guard rail, glass lantern room, internal lamp, roof/cap and finial. The model is fixed to its geographic coordinate and terrain elevation and is not a camera-facing billboard. Its world anchor follows BridgePoint's globe-aware model transform through globe and Mercator projection changes.

Tagged height and diameter/width values are parsed and used when available. If either is absent or unusable, the fallback is an estimated 22 m tower and a 5.28 m diameter (24% of estimated height), with a conventional ivory-and-red painted finish. The fallback is a visually grounded generic model, not a surveyed measurement or a claim about the particular tower. Explicit OSM colour tags override the fallback palette.

## Light behavior

The glass lantern and lamp remain part of every 3D model. A rotating horizontal beam is enabled only when the calculated solar elevation at that lighthouse is at or below -6 degrees (nautical twilight). The calculation uses the lighthouse's own latitude/longitude and UTC date/time, independent of device time zone and camera heading. A mapped light period is used when present; otherwise the beam defaults to a 5-second revolution. The beam rotates; the lighthouse body, lantern glass and geographic anchor do not.

## Level of detail

Small source-backed markers keep lighthouses findable when the globe is zoomed far out. On approach, these are replaced by meter-scale polygon models from zoom 9.2 onward. The number of active 3D structures is bounded (18 on small/touch devices, 64 on desktop) to protect map responsiveness; the model set is refreshed as the user pans or zooms.
