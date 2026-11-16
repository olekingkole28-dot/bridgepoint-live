# BridgePoint 3D Underground — Paris Catacombs v5

This additive release keeps the existing Paris Catacombs scan and adds a second public LiDAR capture: **Le Bar des Rats**. Both source models are archived as public Zenodo GLB files and verified as CC BY 4.0 before the publisher downloads them. BridgePoint hosts the compressed GLBs and renders them locally through its existing Three.js + MapLibre native 3D layer. There are no Sketchfab runtime embeds, iframes, account tokens, or Supabase requests.

## Globe workflow

- The existing bottom-card layer is renamed **3D underground** and retains its cave icon and original control IDs.
- Enabling the control displays the Catacombs district marker. Selecting it opens the native BridgePoint popup.
- The popup has a scan selector:
  - **Large Gallery** — the existing triangle mesh, preserved.
  - **Le Bar des Rats** — a dense LiDAR point cloud reported by its creator as approximately 9.1 million vertices.
- **Show selected scan below terrain** loads the chosen GLB into the existing underground map layer. **Open selected 3D model** opens the independent full-screen viewer with drag-to-orbit, scroll/pinch zoom, reset and close.
- The second scan is lazy-loaded only when it is selected and opened. It is not fetched at globe startup.
- The viewer calculates model-space bounds from the loaded GLB geometry and shows those dimensions alongside the creator-published vertex/triangle stats. The bounds describe the exported scan file, not an independently surveyed chamber footprint.

## Location precision

The Bar des Rats marker is improved from a district-only location to an **address-level room reference**: 69 Rue de Notre-Dame-des-Champs, 75006 Paris, France, with a published room-depth reference of approximately 20 m. The independent Catacombes.xyz room archive names the same room, gives the address and depth, and links a separate 3D record. A public Paris address-coordinate dataset supplies the surface anchor used by the map: longitude 2.3314794209, latitude 48.8432369808. Sources: https://catacombes.xyz/rooms/rats and https://www.cahier-snt.fr/livecsvmap/?csv=s8e1.

The original Emm/Zenodo point-cloud GLB does **not** publish its own surveyed GPS origin or chamber transform. BridgePoint uses the independent room address/depth as an approximate placement reference beneath the terrain, not as proof that each point in the cloud is georeferenced. This is materially better than the former district marker, but not a survey-grade placement. The old Large Gallery keeps its separate regional anchor and visualization offset.

## Scan and rights

### Large Gallery
- Creator: Emm (@edemaistre)
- Capture: iPhone 12 Pro · Scaniverse LiDAR
- License: CC BY 4.0
- Sketchfab source: https://sketchfab.com/3d-models/paris-catacombs-large-gallery-39e7050d272f4aac8493497621b86f39
- Zenodo record: https://doi.org/10.5281/zenodo.10287234

### Le Bar des Rats
- Creator: Emm (@edemaistre)
- Capture: iPhone 12 Pro · Scaniverse LiDAR point cloud
- Published geometry: approximately 9.1 million vertices, no triangle faces
- License: CC BY 4.0
- Sketchfab source: https://sketchfab.com/3d-models/paris-catacombs-the-bar-of-the-rats-sitescape-f4232f8f91e54b0a8aa92365d6ea7b7a
- Zenodo record: https://doi.org/10.5281/zenodo.10232541
- Public GLB archive size: 26.5 MB before gzip

The publisher uses the public Zenodo API with no authentication token, verifies each record title and CC BY 4.0 license, selects its expected GLB file, checks the GLB header and Zenodo MD5 when provided, compresses the file for Pages, and records attribution plus a SHA-256 digest in the catalog.

## Scope and regression protection

The release overlays only the underground module, its GLB assets and catalog, the matching entrypoint imports/cache keys, the existing bottom-card markup, and related tests/docs. The publisher fingerprints the deployed Pages baseline and refuses to publish if unrelated production files change or are removed. It does not modify the existing terrain, weather, buildings, satellites, Sun/Moon/planets, aircraft, tracking, communications infrastructure, wells, or other globe layers.
