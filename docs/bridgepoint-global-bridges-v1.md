# BridgePoint Global 3D Bridges v1

This is an additive renderer for the existing BridgePoint globe. It adds one MapLibre custom 3D layer and reuses the existing map's Three.js/WebGL context. It does not replace roads, buildings, terrain, login, the app shell, or the bottom card.

## Behavior
- Fetches source records for the visible viewport only, after zoom 12; requests are bounded, throttled, timed out, and cached in memory.
- Uses OpenStreetMap bridge outlines and bridge ways, support footprints/positions, guard-rail lines, and cable ways.
- Decks require mapped footprint/width and physical vertical placement (ele, ele:WGS84, bridge:height, or height). The relative OSM layer tag is never treated as a measurement.
- Supports, railings, and cables are omitted when their locations or required dimensions are not mapped. Decks without a thickness tag render as a mapped surface rather than receiving a fabricated slab depth.
- Missing terrain samples skip affected meshes instead of drawing floating structures.
- The previous 2D bridge-line styling remains unchanged as fallback.

## Coverage limits
The layer is global in geographic scope and follows the viewer as they navigate; it is not a claim that every bridge worldwide is mapped. OpenStreetMap coverage and dimensional tags vary by region. Some bridges will therefore remain 2D until reliable source dimensions and terrain are available. Public Overpass is community-operated and has no BridgePoint uptime guarantee; the bounded requests are rate-limited and failures leave the existing map unchanged. A later production dataset should use BridgePoint-managed regional tiles.

## Attribution
Bridge geometry and tags are from OpenStreetMap contributors, subject to the Open Database License (ODbL). Source measurements may be incomplete, approximate, or stale; BridgePoint does not certify structural engineering dimensions.

## Build
The checked-in source payload is gzip-compressed/base64 to keep the repository transport compact. The production workflow decodes it into rebuild-v5000/bridgepoint-global-bridges-v1.js before syntax checks, unit tests, and copying it into the published site.
