# BridgePoint Caves & Underground Sites v2 — in-scene GLB meshes

This version replaces the external Sketchfab viewer-only design with real GLB meshes rendered by BridgePoint's own Three.js / MapLibre custom 3D layer.

## Runtime behavior

- One static Caves & Sites button is inserted directly into the existing bpv-dock-actions markup by the narrow publisher. The module binds to that button and retains a dynamic fallback only if the static element is missing.
- Three site icons remain visible at map zoom 0–24 while the layer is enabled.
- Selecting a site opens a compact attribution card and loads the selected .glb.gz scan into BridgePoint's own MapLibre 3D scene. It does not create an iframe or redirect to Sketchfab. The popup explicitly names Sketchfab and shows the creator, CC BY license and source link.
- A selected scan is rendered through terrain at its selected site anchor. The configured vertical offset is a visualization position, not a surveyed depth. Location precision is stated because the scan files are not georeferenced to exact chamber coordinates.
- GLB files are gzip-compressed and parsed by the local /vendor/GLTFLoader.bundle.js. The custom 3D layer reattaches after a MapLibre style reload.

## Initial CC BY scan catalog

- Paris Catacombs: seven real creator scans by Emm (@edemaistre), including gallery, stair, chambers, Salle Z, flag room, Bureau du Centre and a German bunker passage.
- Vrlovka Cave: one GeoSLAM mobile-LiDAR detail segment by Center for Geospatial Technologies (GAL).
- Øm Jættestue: one 610-image photogrammetry scan by Azad Balabanian; it is a passage tomb, not a natural cave.

The source pages display CC Attribution. The build script independently rechecks each model through the Sketchfab Data API and refuses to download any model that is not downloadable or whose API license is outside the CC BY allow-list.

## Required repository secret

Sketchfab's current Download API requires an authenticated Sketchfab user/API token. Add a repository Actions secret named SKETCHFAB_API_TOKEN; do not put the token in source code, a commit, or this chat.

GitHub repository → Settings → Secrets and variables → Actions → New repository secret.

The publish workflow exits before Pages deployment if the secret is absent or any model fails the downloadable/license checks.

## Asset rights

The build preserves per-model creator username, source URL and API license slug in assets/underground-scan-scenes/catalog.json. Only CC BY models are accepted for this commercial product. Non-commercial cave scans remain excluded unless BridgePoint obtains separate written permission.

## Validation

Run node --check on rebuild-v5000/bridgepoint-underground-scan-scenes-v2.js, compile tools/underground/fetch_sketchfab_scans.py, and run tests/underground-scan-scenes-v2.test.mjs.
