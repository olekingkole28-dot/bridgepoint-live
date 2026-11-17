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
