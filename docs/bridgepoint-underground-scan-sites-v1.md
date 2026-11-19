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
| Jackson Blue Spring Cavern, Florida, United States | 1 | Matthew Hardman / Divers Atlas, 1,017 underwater Insta360 photos · Agisoft Metashape · CC Attribution | Florida Geological Survey spring vent coordinate; submerged mesh is not independently survey-georeferenced |
| Ellora Caves, Maharashtra, India | 1 | Graphic solutions (@hermes3), photogrammetry · approx. 136.5k textured mesh triangles · CC Attribution | Official Ministry of Culture coordinates for the UNESCO cave complex; not an individual cave/chamber survey anchor |
| Te Henga / Bethells Beach Sea Cave, New Zealand | 1 | b_nealie, 46-photo 3DF Zephyr photogrammetry · approximately 698.4k triangles · CC Attribution | Approximate Bethells Beach coastal site anchor only; exact cave-entrance position and mesh registration not published |
| Anchor Church Caves, Derbyshire, England | 1 | Shiro Morturn / Sudbury Digital Imaging, 122-image RealityScan photogrammetry · ~1.3M triangles · CC Attribution | Approximate published cave-complex coordinate; naturally eroded and later human-enlarged sandstone chambers |
| Øm Jættestue, Denmark | 1 | Azad Balabanian, 610-image photogrammetry | Published GPS site coordinate; passage tomb, not a natural cave |

The Anchor Church Caves addition captures real sandstone chambers near Ingleby, Derbyshire. The cavities originated by River Trent erosion and were later artificially enlarged to form a dwelling with openings. The creator Shiro Morturn (@morturn) uploaded a merged photogrammetry scan produced with RealityScan from 122 photographs (~1.3 million triangles), displayed CC Attribution. The persistent marker is an approximate cave-complex location at 52.84167 N, 1.49750 W, not a georeferenced scan boundary. The model is still creator-hosted on Sketchfab; the existing BridgePoint card embeds the interactive viewer with attribution, not the raw model asset. Sources: https://sketchfab.com/3d-models/anchor-church-caves-derbyshire-merged-c7125417f09e43229288316c8144e625 ; https://historicengland.org.uk/listing/the-list/list-entry/1096534 . No prior cave asset, globe code, marker sizing, or unrelated site file is changed.

The Te Henga / Bethells Beach addition is a real textured photogrammetry scan of a natural sea cave on Auckland's west coast. Creator b_nealie used 46 photos with 3DF Zephyr v4.353 to make a 698.4k-triangle cave mesh; the Sketchfab page displays CC Attribution. An arm of the cave opens toward a forested area. The map icon uses a Bethells Beach coastal area anchor (OpenStreetMap via Mapcarta, 174.44382 E, 36.89555 S); the creator has not provided a surveyed, georeferenced entrance position. The model remains creator-hosted on Sketchfab, embedded in the existing BridgePoint-style 3D viewer card. Sources: https://sketchfab.com/3d-models/sea-cave-3-ce71dc2848984acfb11d8002a48a6043 and https://mapcarta.com/W154982151 . No other caves, marker sizing, globe features, or rendering changes.

The Ellora Caves addition is a photogrammetry-based textured 3D reconstruction of the real basalt rock-cut cave-temple complex in Maharashtra. It is man-made rock-cut cave heritage rather than a natural cave system. Sketchfab creator Graphic solutions (@hermes3) lists CC Attribution and approximately 136.5k triangles. The icon uses the Ellora complex's official Ministry of Culture site coordinate, not an invented exact cave-chamber location. The existing BridgePoint popup embeds the creator-hosted Sketchfab model, never downloading or redistributing it. Sources: https://sketchfab.com/3d-models/ellora-caves-india-1a5ec1e212f9451e80dc051e97164d17 and https://culture.gov.in/ellora-caves . No other cave assets, marker sizing, globe features or site rendering changes are intended.

The Jackson Blue Spring addition is an original textured underwater cave photogrammetry scan (roughly 6.3 million triangles), not a LiDAR point cloud. The creator documents 1,017 photos taken May 24, 2026 and model processing in Agisoft Metashape, with a displayed CC Attribution license. The map icon is anchored to Jackson Blue Spring's documented Florida Geological Survey surface vent coordinate (30°47′25.9″ N, 85°08′24.3″ W), not an invented precise underground chamber location. The existing BridgePoint in-card viewer embeds the creator-hosted Sketchfab model without republishing or downloading the mesh. Source: https://sketchfab.com/3d-models/jackson-blue-cavern-and-down-the-chimney-c0ecd1020c794a9a83771d7957517438 ; Florida Geological Survey: https://lake.wateratlas.usf.edu/upload/documents/FirstMagnitudeSprings-OpenFileReport85-FGS.pdf . No existing renderer, icon sizes, other catalog entries, or unrelated globe files change.

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
