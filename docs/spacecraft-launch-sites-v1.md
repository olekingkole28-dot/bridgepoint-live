# BridgePoint Spacecraft & Launch Sites v1

## First release: SLS Block 1 + Mobile Launcher 1, Launch Complex 39B

This additive layer introduces one persistent launch-site marker and a BridgePoint-hosted, interactive 3D card viewer. The first scene combines:

- NASA's original textured **Mobile Launcher (assembled)** GLB, mirrored into BridgePoint at \`/assets/spacecraft/nasa-mobile-launcher.glb\`.
- A **BridgePoint-built, dimensions-based SLS Block 1 visualization** beside the launcher. NASA's published overall and major-stage dimensions are used; small details, finish, exact part geometry and vehicle/tower registration are illustrative.

**This first release is not photogrammetry.** NASA identifies the Mobile Launcher source as a 3D model, not a photogrammetry scan. No exact SLS Block 1 GLB or scan was available in the NASA public collection that could be mirrored and checked for this release. The card states these limitations explicitly.

## Source dimensions and placement

- SLS Block 1 height: 322.4 ft / 98.3 m
- Core stage: 212 ft / 64.6 m long; 27.6 ft / 8.4 m diameter
- Each solid rocket booster: 177 ft / 54 m long; 12 ft / 3.66 m diameter
- Mobile Launcher 1 height used for scale: 380 ft / 115.824 m
- Mobile Launcher base plan dimensions used for reference: 165 ft × 135 ft (50.292 m × 41.148 m)

The site marker uses an approximate Launch Complex 39B / Pad 39B center reference. The NASA Mobile Launcher GLB does not publish a geodetic origin or survey-grade true-north alignment. BridgePoint scales the launcher using NASA's published overall height, centers its footprint on the approximate site marker, detects the tower centroid from its upper mesh geometry and places the SLS adjacent to the tower on the launch platform. Terrain elevation is queried from the live map when available. This is a visualization-grade registration, not survey-control placement.

## Viewer and runtime

The popup contains a local Three.js viewer for both the hosted textured launcher and BridgePoint SLS visualization. The viewer does not embed a third-party website. The native globe model uses a MapLibre custom 3D layer; its persistent DOM marker is independent of style-layer zoom ranges and remains available at global and close zoom. The model is loaded on demand when the layer is enabled and the camera reaches the site.

The NASA GLB uses Draco geometry compression and embedded WebP/JPEG textures. BridgePoint uses its same-origin GLTFLoader and DRACOLoader/decoder assets.

## Credits

- Mobile Launcher 3D model: NASA / Samuel H. Neblett, from the NASA-3D-Resources public repository.
- SLS dimensions: NASA Space Launch System reference material and NASA SLS 3D resource page.
- Launch system context and Mobile Launcher 1: NASA Exploration Ground Systems.

Source URLs:
- https://science.nasa.gov/3d-resources/mobile-launcher/
- https://github.com/nasa/NASA-3D-Resources
- https://science.nasa.gov/3d-resources/space-launch-system-sls/
- https://www.nasa.gov/humans-in-space/exploration-ground-systems/mobile-launcher/
- https://www.nasa.gov/reference/space-launch-system/


## Second entry: Apollo 11 Command Module “Columbia” — Smithsonian exterior 3D scan

The existing **Spacecraft** toggle now also controls a second persistent icon for the Apollo 11 Command Module Columbia at the National Air and Space Museum in Washington, DC. Selecting the icon opens a BridgePoint-hosted local Three.js viewer with rotation, zoom and reset controls, object details, attribution and source links. The card's “Show 3D scan on the globe” action flies to the museum and enables the model's native 3D map layer.

BridgePoint hosts the Smithsonian's combined exterior GLB distribution file, `apollo_exterior-150k-4096.glb`, a single combined 150k-face exterior mesh. It is the official Smithsonian download entry for the Apollo 11 Command Module exterior, not a BridgePoint-built CAD approximation.

The Smithsonian exterior GLB is documented as a centimetre-scaled scan. Because the captured model is not aligned to the raw X/Y/Z axes, BridgePoint computes a principal-axis frame from the scan vertices (an oriented bounding box), aligns the fitted spacecraft axis upright, and converts the original centimetres to metres. The source mesh envelope is kept distinct from the catalogue's artifact dimensions (2.718 × 3.912 m) and its separately listed on-stand height (3.276 m).

**Rights:** Smithsonian Open Access, CC0 / public domain. Smithsonian attribution and the original object and model links remain in the card.

**Globe placement limits:** The marker is an approximate pin for the National Air and Space Museum building, where the Smithsonian lists Columbia on display. The scan has no geodetic origin or survey alignment; the model's position on the globe is a visual placement, not a survey-controlled indoor location. The pin remains available at global and close zoom while the shared Spacecraft toggle is enabled.

Source links:

- Smithsonian object record: https://airandspace.si.edu/collection-objects/command-module-apollo-11/nasm_A19700102000
- Smithsonian 3D object page: https://3d.si.edu/object/3d/command-module-apollo-11:d8c63e8a-4ebc-11ea-b77f-2e728ce88125
- Smithsonian exterior package manifest: https://3d-api.si.edu/content/document/3d_package:d8c6457e-4ebc-11ea-b77f-2e728ce88125/document.json


## Third entry: Space Shuttle Orbiter OV-103 “Discovery” — Smithsonian 3D scan

The existing **Spacecraft** toggle now also controls a third persistent icon for Space Shuttle Discovery at the Steven F. Udvar-Hazy Center in Chantilly, Virginia. Selecting the icon opens a BridgePoint-hosted local Three.js viewer with rotation, zoom and reset controls, detailed flight history, dimensions, mass, attribution and Smithsonian source links. The card's “Show 3D scan on the globe” action flies to the museum and enables Discovery's native 3D map layer.

BridgePoint hosts the Smithsonian's official high-resolution GLB distribution, Orbiter_Space_Shuttle_OV-103_Discovery-150k-4096.glb, a 150,000-face scan with a 4096-pixel texture. The package manifest declares model units in metres. BridgePoint fits the principal 3D axes from the scan vertices so the 17.768 m overall height is aligned vertically while preserving the source metre scale. The catalogue dimensions are 24.314 m × 17.768 m × 38.03 m and the listed mass is 73,176.5 kg.

**Rights:** Smithsonian Open Access, CC0 / public domain. The Smithsonian states that this media is free of copyright restrictions and may be copied, modified and distributed without contacting the institution. BridgePoint retains Smithsonian attribution and source links.

**Globe placement limits:** The persistent marker identifies the Steven F. Udvar-Hazy Center, where Discovery is on display. The source model has no geodetic origin or survey alignment, so globe placement is approximate and is not an exact indoor position or survey-controlled registration.

Source links:
- Smithsonian 3D object page: https://3d.si.edu/object/3d/d8c636ce-4ebc-11ea-b77f-2e728ce88125
- Smithsonian collection record: https://www.si.edu/object/orbiter-space-shuttle-ov-103-discovery%3Anasm_A20120325000
- Smithsonian model package manifest: https://3d-api.si.edu/content/document/3d_package:d8c636ce-4ebc-11ea-b77f-2e728ce88125/document.json


## Fourth entry: Saturn V + Launch Complex 39 gantry — NASA 3D Resources

The existing **Spacecraft** toggle also controls a fourth persistent rocket marker for the historic Launch Complex 39A area at Kennedy Space Center, Florida. Clicking it opens a BridgePoint-hosted local Three.js card viewer with drag-to-rotate, scroll-to-zoom and reset controls, object details, source links and a button to show the combined scene on the globe.

BridgePoint mirrors NASA's official Saturn V GLB and the NASA Launch Complex 39 gantry GLB to its own `/assets/spacecraft/` paths. The Saturn V is scaled to NASA's published 111 m / 363 ft overall height. The gantry is proportionally normalized for the scene. BridgePoint composes the two models on a generated, simplified concrete apron to create an upright launch-vehicle-and-platform presentation similar in spirit to the SLS + Mobile Launcher scene.

**Source-model distinction:** these files are NASA 3D-resource models, not photogrammetry scans. The generated apron, gantry-to-rocket spacing, orientation and LC-39A globe placement are illustrative; the source packages do not provide geodetic origins or survey-control transforms. NASA's source pages and attributions are retained inside the BridgePoint card.

Source links:
- NASA Saturn V 3D Resource: https://science.nasa.gov/3d-resources/saturn-v/
- NASA Launch Complex 39 gantry 3D Resource: https://science.nasa.gov/3d-resources/gantry/
- NASA Apollo 11 Pad 39A launch history: https://www.nasa.gov/history/50-years-ago-apollo-11-to-launch-from-pad-39a/
