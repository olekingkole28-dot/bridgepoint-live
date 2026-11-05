# Global 3D Bridge Materializer v2

## What changed
BridgePoint now materializes bridge geometry through the existing MapLibre bpBridge3D GeoJSON source and native 3D fill-extrusion layers. No second Three.js renderer is installed on the map canvas.

The refresh reads the ofm / transportation source features directly, rather than querying the visible 2D bridge layer. This avoids the old self-erasure cycle where the renderer hid the 2D layer and then queried that hidden layer on the next refresh.

Both source geometry forms are supported:
- Polygon and MultiPolygon bridge outlines are preserved as the deck footprint.
- LineString and MultiLineString bridge centerlines are buffered into deck/surface geometry when no matching source outline already covers the line.

Polygon principal axes are derived only to place display supports and rail profiles. They do not replace the source deck footprint. Centerline and polygon-derived display widths/heights are clearly identified as estimates where no measured value is available.

## Dimensions and coverage
For Connecticut viewports, BridgePoint loads the compact FHWA 2026 National Bridge Inventory extract from the same origin. It contains 4,352 geolocated Connecticut records. The inventory provides bridge total length, maximum span, out-to-out width, curb-to-curb width, and maximum bridge height in feet. These fields are converted to metres at runtime and matched to nearby source bridge geometry. Implausible or missing measurements are not used.

Outside Connecticut, mapped OpenFreeMap/OpenStreetMap bridge geometry is used globally. Road class and polygon dimensions provide display estimates when explicit measurements are not available. This does not mean every bridge worldwide is mapped, and it does not make inferred supports or rails certified engineering geometry.

## Parts and truth labels
- Decks and road surfaces come from mapped polygons or buffered centerlines.
- Piers/supports are positioned from a mapped bridge polygon axis or centerline. If FHWA maximum-span data matches, it informs support spacing; otherwise spacing is a display estimate.
- Rail profiles are shown as estimated standard roadside/bridge barriers unless a source explicitly marks railings absent. Their dimensions are display profiles, not measured bridge components.
- Cable systems are not fabricated merely from a bridge centerline. A cable system requires a reliable source-specific structural classification or component geometry before it can be represented as a factual feature.

Every generated feature carries source and truth metadata. FHWA dimensions are used only for nearby Connecticut records; elsewhere estimate fields remain explicitly identified.

## Stability
- Missing/in-flight source tiles preserve the last valid 3D bridge mesh.
- The previous 2D bridge styling remains available when no valid 3D geometry is available or the renderer has to truncate its bounded feature budget.
- Bridge refreshes do not alter authentication, account state, app navigation, the globe shell, or unrelated map layers.
- The old experimental Three.js bridge script is no longer loaded by either public or signed-in product entry.

## Validation
Run node tests/bridge-materializer-v2.test.cjs and node --input-type=module --check < release-v2300/world-v2300-map.js>. The production workflow also verifies the FHWA extract and copies it to the site root as /bridgepoint-ct-nbi-2026.json.
