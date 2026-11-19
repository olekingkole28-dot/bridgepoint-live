# BridgePoint Caves & Underground Sites v1

An additive, opt-in map layer for real photogrammetry and terrestrial/mobile-LiDAR records of caves and subterranean heritage sites. It is separate from existing Subsurface Wells and underground utility layers.

## User experience

- Adds one **Caves & Sites** button to the existing bpv-dock-actions card in both the website globe and signed-in app.
- When enabled, site icons are visible at map zoom 0–24; the layer does not change the globe, terrain, wells, utilities, weather, celestial objects or other overlays.
- Selecting an icon opens the original hosted interactive Sketchfab 3D viewer, with per-model creator, displayed license, capture method and source link.
- Site markers carry explicit location precision. A marker can be a site/region anchor when a scan creator has not published exact chamber coordinates.
- Meshes are not downloaded, cached, georegistered or redistributed. The viewer-first integration does not claim that a model is a metrically aligned underground mesh tile.

## Curated first-release catalog

| Site | Models | Method / source | Location treatment |
|---|---:|---|---|
| Paris Catacombs, France | 3 | Creator's iPhone scanning; Sketchfab creator Emm | Approximate district anchor; exact chamber coordinates not published |
| Vrlovka Cave, Croatia | 1 | Center for Geospatial Technologies (GAL), GeoSLAM | Published cave-site anchor; featured model is a high-detail cave segment |
| Hohlenstein-Stadel Cave, Germany | 1 | Nature-témoin, 27-photo photogrammetry | Published archaeological cave-site coordinate; model is the entrance |
| Treak Cliff Cavern, England | 1 | 9of9, phone-photo RealityCapture photogrammetry · real stalactite formation | Approximate public cave entrance; interior formation is not separately georeferenced |
| Gruta dos Palhares, Brazil | 1 | Paulo Rodrigo Simões (@rollingdrone), textured cave photogrammetry · CC Attribution | Approximate published entrance coordinate, not a georeferenced underground surface |
| Gruta dos Sete Salões, Brazil | 1 | Paulo Rodrigo Simões / Rolling Drone, textured quartzite-cave photogrammetry · CC Attribution | Approximate published cave area in Parque Estadual dos Sete Salões; partial, not georeferenced |
| Øm Jættestue, Denmark | 1 | Azad Balabanian, 610-image photogrammetry | Published GPS site coordinate; passage tomb, not a natural cave |

The Gruta dos Sete Salões scan is a textured photogrammetry model, not a LiDAR point cloud. The source's openly displayed CC Attribution license permits creator-attributed embedding. Model by Paulo Rodrigo Simões / Rolling Drone Geotecnologias. Reported public coordinates vary; the marker is an approximate site anchor, and the original mesh is still creator-hosted on Sketchfab. No globe renderer, previous marker, icon size, or other feature changes are intended.

Gruta dos Palhares is a photo-based textured cave mesh, not a LiDAR point cloud. Its site marker uses a published approximate entrance coordinate near Sacramento, Minas Gerais. Model by Paulo Rodrigo Simões, displayed license CC Attribution. The viewer is embedded in the existing BridgePoint-styled card; the mesh remains hosted on the creator's Sketchfab page. No globe, rendering, or icon-size changes.

The Treak Cliff Cavern addition displays **CC Attribution**, is an original textured photogrammetry scan, and is embedded in the BridgePoint card via its creator-hosted Sketchfab viewer (the model file is **not** stored on BridgePoint). All Cave & Sites map icons are enlarged while the layer is active, with unchanged zoom range and click behavior.

Every included Sketchfab record displayed **CC Attribution** on its model page at review time. Model metadata and attribution remain visible in the popup. Recheck the original page's license before redistribution or incorporation into a BridgePoint-hosted asset pack.

## Rights and source holds

- Sketchfab's **Ice cave — Lester paints the world** model is displayed as CC Attribution-NonCommercial-ShareAlike and is not included in this commercial app layer.
- **Tomb of San Gennaro and Mosaics** is displayed as CC Attribution-NonCommercial and is not included.
- The first release does not invent a Carlsbad Caverns scan or coordinate: no individually verified openly licensed Sketchfab scan with a defensible location anchor was confirmed.
- Other university / agency cave-survey collections remain candidates until each individual model's download status, creator, license and location precision are checked.

## Sketchfab API / file handling constraint

The current integration uses the hosted Sketchfab viewer. Sketchfab's Download API requires end-user authentication/OAuth unless a separate agreement permits application-side downloads. Current API documentation lists glTF, GLB and USDZ download options; do not assume OBJ/PLY are available through this API. Do not cache temporary download URLs or copy model files without applicable rights and authorization.

## Validation

Run:

\`\`\`sh
node --check rebuild-v5000/bridgepoint-underground-scan-sites-v1.js
node tests/underground-scan-sites-v1.test.mjs
\`\`\`
