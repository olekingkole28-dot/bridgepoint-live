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
| Øm Jættestue, Denmark | 1 | Azad Balabanian, 610-image photogrammetry | Published GPS site coordinate; passage tomb, not a natural cave |

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
