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
- The card now renders the locally hosted CC BY 4.0 GLB in a BridgePoint-hosted interactive WebGL viewer (drag to rotate; pinch or scroll to zoom). The card no longer embeds or redirects to the DTU Aqua viewer. A separate action can also show the same local GLB in the globe as a MapLibre native 3D layer.

**Placement limitation:** the individual Grafton GLB does not publish a verified GPS origin or per-model geodetic/bathymetric transform. BridgePoint preserves its source scale and orientation, recenters the mesh at the published Belgian wreck coordinate and places its center approximately 19 m below the water surface, using the dataset's capture-depth reference. This provides an inspectable underwater site visualization; it is not a survey-controlled registration of the full scan to the actual seabed. The card labels this limitation and links to the official position, original dataset and license record.

The single Shipwrecks toggle now controls five persistent map markers and two independently loaded native 3D meshes. The native meshes are hidden when Shipwrecks is off and restored with the same shared 3D layer when enabled again.


## Kanonvraget — Cannon Wreck, Øresund

The Shipwrecks layer also maps **Kanonvraget (Cannon Wreck)** east of Saltholm in the Øresund. Its verified WGS84 wreck-site point is **55.6448° N, 12.8688° E** from the Danish Vraguiden wreck record (ID 4643). The record gives a 14–16 m top-to-bottom depth range, at least 16 large 12–14-pound iron cannons, and an estimated vessel length of about 48 m. The vessel identity remains unknown; suggested identifications are hypotheses, not confirmed facts.

The dedicated card renders BridgePoint's locally hosted copy of the original CC BY 4.0 Cannon GLB in an interactive BridgePoint WebGL viewer (drag to rotate; pinch or scroll to zoom); it does not embed or redirect to DTU Aqua's external viewer. The card links the source dataset for attribution and provenance (Zenodo DOI 10.5281/zenodo.19592377). BridgePoint also mirrors the **Cannon.glb** file after validating the source record, creator attribution, licence metadata when supplied, GLB header and published MD5 checksum. The native mesh is centered at the wreck-site point and displayed at the 15 m midpoint of the wreck database's 14–16 m depth range.

DTU Aqua describes the 12 June 2025 model capture as approximately 11 m deep. That capture-depth description is distinct from Vraguiden's 14–16 m wreck depth range and both are shown separately. The single GLB does not include a published GPS origin / survey-control transform, so its placement at the site is approximate; the original mesh scale and orientation are preserved. This is a map visualization, not survey-controlled registration or navigation data.

Sources:
- [DTU Aqua / Zenodo model record](https://zenodo.org/records/19592377)
- [DTU Aqua interactive viewer](https://obstek.aqua.dtu.dk/demos/viewer/cannon)
- [Vraguiden Kanonvraget record](https://www.vragguiden.dk/vrag/4643)
- [Vraguiden position, depth and historical information](https://www.vragguiden.dk/api/WreckPdf/4643)
- [NLM Dataset Catalog rights record — CC BY 4.0](https://datasetcatalog.nlm.nih.gov/dataset?q=0000776569)


---

# BridgePoint Shipwrecks v6 — HNLMS K XI full-length submarine photogrammetry

The existing **Shipwrecks** control now includes a seventh persistent marker for **HNLMS K XI**, a Dutch K XI-class patrol submarine off Wadjemup / Rottnest Island, Western Australia. The model is a full-length photogrammetry reconstruction of the visible wreck, not a generic ship model or an external viewer.

- Published site coordinate: **32° 09.0234′ S, 115° 29.9682′ E** (WGS84; WreckSploration)
- Wreck depth: approximately **38–40 m** (WreckSploration / Western Australian Museum)
- Photogrammetry measurement: **66.63 ± 0.22 m** bow-to-stern
- Survey: **6,733 underwater images**, recorded 11 January 2025
- Identified by the Western Australian Museum in January 2025
- History: decommissioned in 1946; scuttled in 1949 (Western Australian Museum)
- Model credit: **© WreckSploration and Western Australian Museum**, CC BY 4.0

The publishing workflow mirrors the WreckSploration VR repository GLB from a pinned source commit and refuses to package it if the expected byte length, GLB header or Git blob SHA-1 differs. The card opens the locally hosted GLB in BridgePoint's Three.js/GLTFLoader viewer. Drag, pinch and scroll rotate/zoom the model; the reset button restores its initial view. The same local GLB can be rendered as a native MapLibre 3D layer beneath the water at the wreck location, and is loaded automatically when Shipwrecks is enabled and the camera is zoomed into the site.

**Placement limits:** the model's long axis is calibrated to the published 66.63 m photogrammetry measurement and its center is placed at the published WGS84 wreck point, approximately 40 m below the water surface. The source mesh does not publish a georeferenced origin or survey-grade true-north heading. Its center/depth/heading placement is therefore an inspectable visualization, not survey-controlled seabed registration or navigation data. The wreck is substantially buried, so the scan records visible/exposed structure rather than recreating buried components or a pristine original submarine.

**Heritage:** HNLMS K XI is a protected historic shipwreck under Australia's Underwater Cultural Heritage Act 2018. The card identifies the protection status and states not to damage, disturb or remove any part of the wreck.

Sources:
- [Western Australian Museum — Maritime Report 356 and photogrammetry site plan](https://museum.wa.gov.au/maritime-archaeology-db/maritime-reports/dutch-k-xi-submarine-1925-1946-discovered-wadjemup-rottnest-island-perth)
- [WreckSploration — HNLMS K XI history, location and survey](https://wrecksploration.au/projects/kxi/)
- [Western Australian Museum — official K XI 3D model listing](https://sketchfab.com/3d-models/kxi-submarine-rottnest-deepwater-graveyard-7899b257a0274c93becf69676482531f)
- [WreckSploration VR — model repository](https://github.com/patrick-morrison/below-wrecksploration)


---

# BridgePoint Shipwrecks v10 — Timaru / Site 42 native photogrammetry

The existing **Shipwrecks** toggle now includes a persistent icon for **Timaru (Site 42)**, also recorded as Naval Dredger 4 / Commonwealth Naval Dredge 4 (CND4), southwest of Rottnest Island, Western Australia. The card and globe layer both use a BridgePoint-hosted copy of the WreckSploration GLB; no external viewer is embedded or opened.

- Vessel: steel steam hopper barge, built in 1893 by Lobnitz & Co.; the Western Australian Museum record lists it as dismantled/sunk in 1930.
- Wreck-site depth: approximately 50 m, per WreckSploration dive notes.
- Photogrammetry: approximately 750,000 triangles and 374,800 vertices; site survey measurement about 44.9 m × 9.17 m. The Museum's historic register separately gives overall vessel dimensions of 44.20 m × 9.20 m.
- Discovery / model record: 28 March 2025 / 1 June 2025.
- Source: [WreckSploration Site 42 / Timaru](https://wrecksploration.au/projects/timaru/) and [Sketchfab source model](https://sketchfab.com/3d-models/site-42-timaru-2d8c988bfd3048858c752b9fa4095f66).
- Rights: Creative Commons Attribution 4.0 (CC BY 4.0). The publishing workflow pins the source repository revision and Git blob SHA-1 before mirroring the GLB.

The source model represents the **actual broken-up wreck remains**, not a restored intact ship. The dive notes describe scattered/collapsed structure and a boiler standing on end. The BridgePoint card contains the survey notes, attribution, original model link and Western Australian Museum register link.

**Placement limits:** BridgePoint uses an approximate public wreck-layer point and places the model center about 50 m below the water surface. The long axis is calibrated to the WreckSploration site measurement of 44.9 m; the official register's overall vessel length is recorded separately. The source GLB does not include a GPS origin, bathymetric transform or survey-grade heading, so the 3D map placement is a visualization rather than survey-controlled registration of individual fragments to the seabed. The local BridgePoint viewer still allows rotation, pinch/scroll zoom and view reset.

The Shipwrecks renderer v10 now maintains **nine persistent wreck icons** and **six native, locally hosted seabed GLBs** (the three Titanic waypoints remain separate markers; the five earlier wreck scans are retained).
---

# BridgePoint Shipwrecks v11 — HMS Loo / Looe Key native photogrammetry

The Shipwrecks layer adds **HMS Loo**, a separate persistent wreck-site icon at Looe Key Reef in the Lower Florida Keys, Florida, USA. The card uses a locally hosted GLB and the BridgePoint-native viewer; the same source mesh can be materialized in the globe at the recorded point and a 6.75 m display-depth reference.

- History: HMS Loo was a British 44-gun Fifth-Rate that grounded on the reef on 5 February 1744. NOAA records that 274 sailors escaped in boats and a captured Spanish sloop.
- Archaeology: the 2023 NOAA / East Carolina University photogrammetry records the actual coral-encrusted wrecksite, including ballast blocks, scattered structure and artifacts. It is **not** a reconstructed intact ship hull.
- Model: 4,099,999 triangles and 2,051,535 vertices; source attribution to NOAA's Florida Keys National Marine Sanctuary and East Carolina University's Maritime Studies Program; CC BY 4.0.
- Sources: [NOAA HMS Loo history](https://floridakeys.noaa.gov/shipwrecks/hms-loo.html), [NOAA / ECU 3D photogrammetry model](https://sketchfab.com/3d-models/hms-loo-shipwreck-fc5901d8556743458c40aa4a096f01b6), [public ScanSceneverse GLB archive](https://huggingface.co/datasets/Stable-X/ScanSceneverse), [NOAA planning report with 4.5–9 m depth range](https://library.oarcloud.noaa.gov/noaa_documents.lib/NOS/CZIC/EIS_Looe_Key_1980.pdf), and [approximate public wreck-position record](https://shipwrecksmap.com/wrecks/hms-looe-1741/).
- Placement limits: the map point is approximate, not a survey-grade wreck waypoint. NOAA's planning report describes wreckage at 4.5–9 m; BridgePoint uses 6.75 m as the range midpoint for visualization. The source GLB has no GPS origin or published georeferenced heading, so its original scale/orientation is preserved and its visual center is aligned to the approximate map point. This is not survey-controlled registration of individual artifacts to the seabed.

The Shipwrecks renderer v11 now maintains **ten persistent wreck icons** and **seven native, locally hosted seabed GLBs** (the three Titanic waypoints remain separate markers; the six earlier wreck scans are retained). The publishing workflow checks the local source GLB, attribution metadata, root/app module cache keys, live model asset and final deployment.

