# BridgePoint Paris Catacombs — native underground mesh + viewer

This inspection build contains **Paris Catacombs only**. It materializes one real iPhone 12 Pro / Scaniverse LiDAR gallery scan into BridgePoint's own assets and renders the mesh locally through the existing Three.js + MapLibre custom 3D scene. There are no iframes or external model viewers.

## Globe workflow

- A static **Paris Catacombs** button is injected into the existing bottom card.
- When enabled, its catacomb icon and label remain available from globe zoom through street-level zoom.
- Selecting the icon opens a BridgePoint popup with two separate actions:
  - **Show below terrain** loads the scan mesh into the globe's underground 3D layer.
  - **Open 3D model viewer** opens an independent full-screen Three.js viewer with drag-to-orbit, scroll/pinch zoom, reset and close.
- The map mesh is displayed at a below-terrain visualization offset. Its anchor is an approximate Paris Catacombs district coordinate, not a surveyed chamber position. The source scan is not georeferenced; the code and UI explicitly disclose this limitation.

## Scan and rights

- Model: Paris Catacombs — Large Gallery
- Creator: Emm (@edemaistre)
- Capture: iPhone 12 Pro · Scaniverse LiDAR
- License: CC BY 4.0
- Original model: https://sketchfab.com/3d-models/paris-catacombs-large-gallery-39e7050d272f4aac8493497621b86f39
- Public dataset: https://doi.org/10.5281/zenodo.10287234

The publisher obtains the public GLB from the Zenodo record, then independently checks that the record title refers to the Paris Catacombs Large Gallery and that its license remains CC BY 4.0 before downloading. It verifies the GLB header, compresses the file for Pages, and records source attribution and a SHA-256 digest in the catalog.

## Scope and regression protection

Only the module, its one GLB asset and catalog, entrypoint imports, and the existing bottom-card markup are overlaid. The publisher fingerprints the current deployed artifact and refuses to publish if any unrelated production file changes or is removed. Existing wells, terrain, weather, buildings, satellites, Sun/Moon/planets and other globe layers are not modified.
