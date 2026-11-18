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
