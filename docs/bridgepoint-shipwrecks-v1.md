# BridgePoint Shipwrecks v1 — RMS Titanic

This isolated, opt-in layer adds one wreck to the existing globe dock: **Shipwrecks → RMS Titanic**. It maps three NOAA Expedition 2004 waypoint centers (bow, stern and debris field) and opens a 3D viewer card when one of the markers is selected. It does not change any other BridgePoint layer.

## Waypoints

- Bow center: 41° 43′ 57″ N, 49° 56′ 49″ W
- Stern center: 41° 43′ 35″ N, 49° 56′ 54″ W
- Debris-field center: 41° 43′ 32″ N, 49° 56′ 49″ W
- NOAA describes the operating area as roughly 3,800 m water depth.

Coordinates are decimal WGS84 in the map source and are converted from the exact published NOAA degree/minute/second waypoints. These are centers/waypoints, not surveyed outlines or a georeferenced 3D model footprint.

## 3D viewer sources and limits

The card includes two independent Sketchfab listings for the bow and stern. Their public listings are tagged "photogrammetry", but do not publish survey-grade model scale, georeferenced origin, or proof that they are exports of Magellan's official Titanic dataset. BridgePoint embeds them from Sketchfab and does not download or redistribute the models.

A third viewer option is The Wreck Explorer's 1:1 historical reconstruction (1 unit = 1 metre). The creator explicitly describes it as an interpretive model, not a scan or wreck survey; its wreck view also uses a bow/stern spacing different from the NOAA waypoints. It is shown as a clearly labeled reference, not as the true georeferenced wreck.

The official Magellan full-size digital twin and Voyis project pages are linked in the card. The public Magellan page describes the full-size survey, while Voyis describes the survey imagery and limited laser-model exports. A complete, licensed, embeddable Magellan mesh was not available from those public pages during this implementation. Consequently, this feature does not claim that a community model is Magellan's official scan or that either community mesh is metrically georeferenced.

## Performance and behavior

- The Shipwrecks button is off by default and lives in the existing `bpv-dock-actions` dock.
- Turning it on creates only the Titanic source and marker/halo/label layers.
- All three markers use zoom range 0–24, symbol-overlap settings and style-reload restoration.
- Selecting a marker opens a card; the high-detail third-party viewer loads only after a wreck marker is opened.
- The debris-field waypoint is mapped separately; no unverified debris mesh is fabricated.
- All external 3D content remains hosted by its original publisher.


---

# BridgePoint Shipwrecks v2 — Robert Gaskin native photogrammetry

The same **Shipwrecks** toggle now controls four persistent locations together: the existing Titanic bow, stern and debris-field NOAA waypoints, plus the Robert Gaskin wreck in the St. Lawrence River near Brockville, Ontario, Canada.

## Robert Gaskin — second wreck

- Approximate wreck-site center: 44° 35′ 21.54″ N, 75° 40′ 37.50″ W
- Published hull depth range: approximately 18.3–21.3 m (60–70 ft); the displayed model reference is 19.8 m below the water surface
- Historical vessel length: 40.42 m (132.6 ft); beam: approximately 8.02 m (26.3 ft)
- Photogrammetry: approximately 49,000 underwater photographs; the public GLB lists about 598,600 triangles and 322,800 vertices
- Creator: Christian Rémillard
- Asset licence: Creative Commons Attribution 4.0 (CC BY 4.0)
- Source record: [Zenodo 10.5281/zenodo.10288556](https://doi.org/10.5281/zenodo.10288556)

The publish workflow checks the Zenodo title, creator, CC BY 4.0 licence, expected GLB filename and MD5 before mirroring the model to BridgePoint. It then gzip-compresses the GLB and publishes a local catalogue. The card opens a credited Sketchfab viewer and provides a separate **Place 3D scan at its wreck depth** action. That action loads the locally hosted GLB through BridgePoint's local Three.js/GLTFLoader runtime and draws it through an isolated MapLibre 3D custom layer.

**Placement limitation:** the original photogrammetry mesh does not contain a GPS-georeferenced origin or survey-control heading. BridgePoint places its center at the published wreck-site coordinate, calibrates its long axis to the published historical length, aligns that axis approximately north/south based on the description that the bow faces inland, and uses the approximate Brockville water-surface reference (74.64 m IGLD85 on 16 Nov 2026) minus the published 19.8 m midpoint depth to calculate map altitude. This water level varies. The site publishes a depth range of about 18.3–21.3 m, so the model should be treated as an approximate wreck-site placement rather than a survey-grade seabed registration. The Robert Gaskin is a freshwater river wreck, not an open-ocean wreck.

## Combined marker persistence

- One Shipwrecks toggle controls all four icons together. All icons use one GeoJSON source, a zoom range of 0–24 and collision-overlap settings.
- The control explicitly opts into the shared `shipwrecks` optional-overlay category, separately from general vessel tracking.
- The renderer restores the marker/halo/label layers after map style loads and settled idle, move, zoom, rotate and pitch events.
- Toggling Shipwrecks OFF hides the four icons and hides the native Robert Gaskin seabed mesh without changing unrelated BridgePoint layers.

## Titanic mesh status

The two Titanic bow/stern photogrammetry listings remain embedded from their original publisher. Their public pages do not document a redistribution licence or GPS-georeferenced scale/origin, so this release does not download or position those meshes as if they were survey-grade seabed assets. The 1:1 Titanic historical reconstruction remains a clearly labelled interpretive reference, not an authentic wreck scan.


---

# BridgePoint Shipwrecks v3 — HMS Grafton native scan

An additional persistent icon is added to the existing Shipwrecks control for **HMS Grafton (H89)** off Oostende, Belgium. The existing Titanic bow/stern/debris markers and the Robert Gaskin native riverbed model are retained.

- Belgian maritime-plan position: 51° 24.4260′ N, 2° 49.1030′ E
- The DTU Aqua dataset records the Grafton underwater reconstruction at an approximate 19 m capture depth (19 May 2025) and provides a GLB mesh.
- Dataset contributors: DTU Aqua, Patrizio Mariani, Fletcher Thompson and Javier Alonso Fernández.
- Rights: CC BY 4.0, as indexed for this DOI by the U.S. National Library of Medicine Dataset Catalog.
- The card embeds the DTU Aqua viewer and offers a separate action to load the local GLB into the globe as a MapLibre native 3D layer.

**Placement limitation:** the individual Grafton GLB does not publish a verified GPS origin or per-model geodetic/bathymetric transform. BridgePoint preserves its source scale and orientation, recenters the mesh at the published Belgian wreck coordinate and places its center approximately 19 m below the water surface, using the dataset's capture-depth reference. This provides an inspectable underwater site visualization; it is not a survey-controlled registration of the full scan to the actual seabed. The card labels this limitation and links to the official position, original dataset and license record.

The single Shipwrecks toggle now controls five persistent map markers and two independently loaded native 3D meshes. The native meshes are hidden when Shipwrecks is off and restored with the same shared 3D layer when enabled again.
