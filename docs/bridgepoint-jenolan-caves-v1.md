# BridgePoint 3D Underground — Jenolan Caves

This is a separate, BridgePoint-hosted 3D underground asset. It does not modify the Paris Catacombs renderer or catalog.

## Source and scale

The model is derived from **Jenolan Caves: 3D Data Collection**, a public CSIRO collection by Robert Zlot and Michael Bosse. The collection describes 3D laser scans of the natural caves and the surface above them, with roughly 2.3 billion points in the full-resolution collection and an approximately 28.4 km scanner trajectory. The associated cave survey paper describes 17.1 km of cave traverse.

- Collection / source attribution: <https://doi.org/10.4225/08/55911F74299DC>
- Source file: \`ProcessedData/jenolan_2010_2014_V.ply\` (CSIRO file ID 48134791)
- Source file size in the collection inventory: approximately 837 MiB
- License: Creative Commons Attribution-ShareAlike 3.0 Unported (CC BY-SA 3.0)
- Materialized asset: deterministic sample of up to 2.5 million points from across the full PLY, hosted by BridgePoint as a compressed point cloud

The source PLY is parsed and a compact, color-preserving (when source colors exist) point cloud is produced for browser rendering. The full source is much denser than the deployed visualization sample. The UI and manifest report both the source point count and the materialized point count; they are not interchangeable.

## Placement accuracy

The map marker uses the CSIRO collection-level WGS84 site coordinate. The source cave points are locally registered scan geometry, not point-by-point GNSS observations. BridgePoint centers the local scan at the site marker and places its top below the terrain as a visualization anchor. **This is not a survey-grade georeferencing of every cave passage.** The manifest records that distinction.

## Runtime

The separate Jenolan control lives in the BridgePoint bottom-card dock. Its globe icon is independently toggled and remains visible across style/visibility refreshes while enabled. Clicking the Jenolan marker flies to the site and opens the full BridgePoint 3D point-cloud viewer. Enabling the layer also materializes the hosted point cloud in a native MapLibre custom 3D layer below terrain.

No Supabase dependency is used. The existing Paris Catacombs assets and renderer are left unchanged.

## Build and validation

\`\`\`bash
python3 tools/underground/build_jenolan_cloud.py --source jenolan_2010_2014_V.ply --output assets/underground/jenolan-caves-v1
node --input-type=module --check < rebuild-v5000/bridgepoint-jenolan-caves-v1.js
node tests/jenolan-caves-v1.test.mjs
\`\`\`
