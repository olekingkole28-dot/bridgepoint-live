# BridgePoint Reality Asset Pipeline

This directory defines the first controlled import path for localized photogrammetry meshes. It does not download or generate imagery, and the empty catalog means no drone capture is currently being represented as available.

## Supported catalog format

The website reads \`/assets/reality-assets/manifest.json\`. The corresponding source file is \`rebuild-v5000/assets/reality-assets/manifest.json\`. Each catalog entry must point to a **same-origin GLB** hosted below \`/assets/reality-assets/\` and include:

- \`id\`, \`title\`, \`modelUrl\`
- \`boundsWgs84\`: \`[west, south, east, north]\` coverage bounds
- \`longitude\`, \`latitude\`: calibrated model anchor inside those bounds
- \`targetHeightMeters\`: known/calibrated model height in meters
- \`minZoom\`, \`upAxis\` (\`Y\` or \`Z\`), and optional \`rotationDegrees\` / \`groundOffsetMeters\`
- \`capturedAt\`, \`source\`, \`sourceUrl\`, \`license\`, \`attribution\`
- optional \`notes\`

The browser will reject entries that do not satisfy these requirements. It allows at most 40 catalog entries, downloads no mesh until a person selects one, allows only one active mesh, unloads the mesh when the camera leaves its bounds / close zoom, and caps each model at 35 MiB. The GLB must embed textures so a model cannot silently fetch unrelated external files.

## From drone photographs to a real mesh

1. Use images you own or have explicit authorization to process and display. Preserve their capture date, source, licence, and any data-use restrictions.
2. Process a **small test area first** with WebODM / OpenDroneMap. Request the textured model and orthophoto; retain the processing report, coordinate reference information, control points, and quality/error measures.
3. Validate the orthophoto against known location/ground-control points. Confirm coordinate system, vertical datum, units, axis orientation, the GLB's local origin, scale and facing before placing a model over BridgePoint.
4. Calibrate the mesh anchor and bounds against identifiable ground control. Do not assume every ODM/WebODM GLB or 3D Tiles transform is correctly aligned without testing: there are public OpenDroneMap reports of orientation/georeferencing issues in 3D Tiles output.
5. Place the GLB in \`rebuild-v5000/assets/reality-assets/\`, add its reviewed manifest entry and run:

   \`\`\`bash
   python tools/reality_assets/validate_manifest.py
   python -m unittest tools.reality_assets.test_manifest_validator
   node --check rebuild-v5000/bridgepoint-reality-assets-v5968.js
   \`\`\`

6. Review the change, deploy to a preview, then inspect alignment at close zoom on a desktop **and** phone before enabling it on the public product.

## Important distinctions

- An orthophoto is a georeferenced image; a GLB is a 3D model. They are different asset types.
- A 3D model centered at an anchor is not automatically georeferenced. Its origin, axes, scale and orientation must be calibrated.
- No property boundary, roof material, damage, utility line, or measured dimension is inferred solely from a textured mesh.
- Source/licence terms apply to imagery, mesh, textures and derivative assets independently. A permissive viewer licence does not make third-party imagery redistributable.
- The viewer uses BridgePoint's existing MapLibre canvas / WebGL context; it does not start another globe renderer.

## References

- WebODM: https://webodm.org/
- OpenDroneMap option definitions (\`--gltf\`, \`--3d-tiles\`): https://github.com/OpenDroneMap/ODM/blob/master/opendm/config.py
- OpenDroneMap coordinate alignment issue example: https://github.com/OpenDroneMap/ODM/issues/2073
- MapLibre custom 3D model pattern: https://maplibre.org/maplibre-gl-js/docs/examples/globe-3d-model/
- BridgePoint's current main map and scan integration: \`release-v2300/world-v2300-map.js\`, \`rebuild-v5000/bridgepoint-landmarks-v5940.js\`
