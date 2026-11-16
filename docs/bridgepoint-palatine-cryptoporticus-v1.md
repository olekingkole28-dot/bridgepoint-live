# BridgePoint 3D Underground — Palatine Neronian Cryptoporticus photo scan

This release adds a Rome underground scan marker to the existing **3D underground** toggle without changing the Paris Catacombs collection or the Jenolan Caves layer.

## Photogrammetry source

**Palatine Neronian Cryptoporticus Tunnel** by artfletch is a scan segment near the House of Livia on Palatine Hill, Rome. The creator states it was reconstructed from **568 Sony a7R V photographs** using RealityScan. The published Sketchfab mesh metadata reports **1,845,375 faces and 936,915 vertices**. The matching SuperSplat scene is listed at approximately **68.5 MB and five million Gaussian splats**.

- [Original photogrammetry model and creator attribution](https://sketchfab.com/3d-models/palatine-neronian-cryptoporticus-tunnel-827278527982425799ddbc0ec6bcc81d)
- [Interactive SuperSplat scan](https://superspl.at/scene/096380c2)
- [Neronian Cryptoporticus historical site context](https://colosseo.it/en/marvels/the-neronian-cryptoporticus/)

**License:** Creative Commons Attribution 4.0 (CC BY 4.0). Commercial use is permitted with attribution to artfletch.

## Globe marker and viewer

The scan appears as its own cave/tunnel icon when the existing **3D underground** button is enabled. The marker is synchronized to the existing button's pressed state and is reinstalled after MapLibre style reloads. Clicking the marker flies to the Palatine Hill site reference and opens the creator-hosted full-screen interactive SuperSplat viewer with orbit, pan and zoom.

The approximate marker anchor is 41.89005° N, 12.48718° E, near the House of Livia / north entrance area. The creator has **not** published a survey-grade scan origin, surveyed tunnel control points, or exact underground depth.

## Important placement limitation

The model's 68.5 MB Gaussian-splat package is served by the creator-hosted SuperSplat viewer. It is **not** bundled as a native BridgePoint mesh and is **not** registered beneath the globe terrain. The globe icon is anchored to the real underground site's approximate surface location; the viewer displays the original scan segment independently. The marker and viewer are not represented as an exact georeferenced underground tunnel placement.

The source model describes a **small separate section** of the larger Neronian Cryptoporticus corridor; the 130 m length associated with the archaeological corridor must not be mistaken for the dimensions of this individual scan.

## Regression boundary

The publisher starts from the current deployed Jenolan Pages artifact, then overlays only this module, its app-route copy, and the two entry-script/cache-key updates required to load it on root and app routes. It fails if unrelated deployed files change or disappear. Paris Catacombs, Jenolan Caves, weather, terrain, imagery, aircraft, utilities, and every other BridgePoint layer remain in the baseline.

## Validation

`node --check rebuild-v5000/bridgepoint-palatine-cryptoporticus-v1.js`

`node tests/palatine-cryptoporticus-v1.test.mjs`
