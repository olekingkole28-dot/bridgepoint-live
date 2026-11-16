# BridgePoint 3D Underground — Paris Catacombs scan collection v7

This release preserves the two existing locally hosted native 3D scans and adds nine more selectable scans from the same creator's public **Scanning in the catacombs** collection. The catalog now contains **11 selectable scans**, each with its own globe marker.

## What appears in BridgePoint

The **3D underground** bottom-card button toggles the collection's markers. Each marker selects its own model and opens the same BridgePoint scan selector. The two original BridgePoint-hosted GLBs retain their native Three.js viewer and below-terrain rendering:

- **Paris Catacombs — Large Gallery** — Emm (@edemaistre), CC BY 4.0; iPhone 12 Pro / Scaniverse; 338,500 vertices and 668,900 triangles. The original public Zenodo GLB remains locally hosted by BridgePoint.
- **Paris Catacombs — Le Bar des Rats** — Emm (@edemaistre), CC BY 4.0; iPhone 12 Pro / Scaniverse point cloud; approximately 9.1 million vertices. The original public Zenodo GLB remains locally hosted by BridgePoint.

Nine additional creator-published scans are added to the selector and map as separate icons. They open in the creator's interactive Sketchfab viewer (orbit, pan and zoom); they are not downloaded or copied to BridgePoint in this release:

| Scan | Published geometry | Creator / capture | License |
|---|---:|---|---|
| **Salle Z (3DScannerApp)** — creator-described largest room, with about 15-foot ceilings | ~1,000,000 vertices / 2,000,000 triangles | Emm · iPhone 12 Pro / 3DScannerApp | CC BY 4.0 |
| **Salle Z (portion)** | 655,600 vertices / 1,300,000 triangles | Emm · iPhone 12 Pro / 3DScannerApp | CC BY 4.0 |
| **Level 1 to Level 2** — connecting stair passage | 568,000 vertices / 1,100,000 triangles | Emm · iPhone 12 Pro / 3DScannerApp | CC BY 4.0 |
| **German Bunker Interior** | 479,500 vertices / 957,100 triangles | Emm · iPhone 12 Pro / 3DScannerApp | CC BY 4.0 |
| **Bureau du Centre** — room described as beneath Montparnasse Cemetery | 332,600 vertices / 651,000 triangles | Emm · iPhone 12 Pro / Scaniverse | CC BY 4.0 |
| **The Flag Room** | 327,600 vertices / 647,200 triangles | Emm · iPhone 12 Pro / Scaniverse | CC BY 4.0 |
| **Our Lady of the Catacombs** — chapel chamber | 215,000 vertices / 424,600 triangles | Emm · iPhone 12 Pro / Scaniverse | CC BY 4.0 |
| **Seb Entering a Squeeze** — narrow connecting passage | 210,400 vertices / 408,500 triangles | Emm · iPhone 12 Pro / Scaniverse | CC BY 4.0 |
| **Pillar in Room Z** | 170,700 vertices / 330,200 triangles | Emm · iPhone 12 Pro / Scaniverse | CC BY 4.0 |

The added models are linked to their original creator pages and retain the creator name, capture method, displayed geometry statistics and license in the popup. Their interactive viewers are loaded only when the user selects and opens one.

## Map placement and precision

The two existing native scans keep their current placement metadata. The additional source pages identify the models as Paris Catacombs scans but do not publish georeferenced scan origins or survey-grade room coordinates. Their pins therefore use a regional Catacombs anchor. The visible fan-out between those pins is a screen-space spacing aid so each icon can be clicked; it is not a claimed underground coordinate or measured offset.

Only the two existing local GLB models can be rendered beneath the terrain in this version. The nine additional scans are interactive creator-hosted viewer entries; their mesh files are not redistributed or falsely positioned beneath the globe.

## Persistent marker behavior

The module creates one MapLibre feature per scan, with an individual model UID. A marker click opens the matching scan, not merely the first item in the list. The layer reasserts visibility while enabled on map style refreshes and settled camera/map events. Visibility changes are idempotent to avoid a styledata loop. The change remains confined to the existing 3D Underground module, its bottom-card labels/cache key, tests and this documentation; it does not modify the shared overlay controller or any other BridgePoint layer.

## Sources and attribution

- [Creator collection — Scanning in the catacombs (48 models)](https://sketchfab.com/edemaistre/collections/scanning-in-the-catacombs-a5ab0cf1b46d4e5192b9d785970395a7)
- [Salle Z (3DScannerApp)](https://sketchfab.com/3d-models/paris-catacombs-salle-z-3dscannerapp-96cc3e6942a7455382c49241c1a80915)
- [Salle Z (portion)](https://sketchfab.com/3d-models/paris-catacombs-salle-z-portion-d407fb1ba0414482a99ccd6567b29512)
- [Level 1 to Level 2](https://sketchfab.com/3d-models/paris-catacombs-from-level-1-to-level-2-27ae0d6041c54e2eab6638d197985842)
- [German Bunker Interior](https://sketchfab.com/3d-models/paris-catacombs-in-the-german-bunker-befe33ccb4cf4005a6f26c83629a9be6)
- [Bureau du Centre](https://sketchfab.com/3d-models/paris-catacombs-bureau-du-centre-e78831639a3a4000b2130457badfc34b)
- [The Flag Room](https://sketchfab.com/3d-models/paris-catacombs-the-flag-room-ca80de4ccfdd45d4a5b44dad31cb0da2)
- [Our Lady of the Catacombs](https://sketchfab.com/3d-models/paris-catacombs-our-lady-of-the-catacombs-c63534cc8b97437bb933b8eba87ffb0d)
- [Seb Entering a Squeeze](https://sketchfab.com/3d-models/paris-catacombs-seb-entering-a-squeeze-65ba91e03f34494a813ac864e857b51e)
- [Pillar in Room Z](https://sketchfab.com/3d-models/paris-catacombs-pillar-in-room-z-30e95b44aa244727889f7e4421c2a362)
- [Original Large Gallery source and open Zenodo record](https://doi.org/10.5281/zenodo.10287234)
- [Original Le Bar des Rats source and open Zenodo record](https://doi.org/10.5281/zenodo.10232541)

The nine new model files stay on Sketchfab. The existing two Zenodo CC BY 4.0 GLBs continue to be downloaded, checked, compressed and hosted by the existing publisher workflow. No Supabase, account token, new API credential or extra runtime service is introduced.

## Regression protection

The publisher fingerprints the deployed Pages artifact and aborts if files outside the expected underground overlay change or disappear. The existing globe, terrain, weather, imagery, celestial objects, aircraft, infrastructure, wells and other layers are not rewritten by this release.

Run the focused checks with:

`node --check rebuild-v5000/bridgepoint-underground-scan-scenes-v2.js`

`node tests/underground-scan-scenes-v2.test.mjs`
