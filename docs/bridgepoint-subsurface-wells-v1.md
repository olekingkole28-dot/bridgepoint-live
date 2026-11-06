# BridgePoint Global Subsurface Wells v1

An opt-in, additive globe layer for mapped groundwater wells, water-point well records, onshore boreholes, offshore hydrocarbon wells and tagged OSM boreholes. The module owns its own map source, visual layers, custom Three.js renderer, popup and button. It does not modify the base globe, offshore-energy, lighthouse, transportation, weather, utilities or other map layers.

## Coverage and record families

- **USGS Water Data — groundwater monitoring locations:** groundwater wells with source attributes including finished well depth, total drilled-hole depth, aquifer code, national aquifer code, aquifer type, construction date, location and elevation. Depths are published in feet and converted to metres for display. Initial global view sampling is supplemented with viewport queries within the United States.
- **BGS / NSTA Offshore Hydrocarbon Wells:** UK Continental Shelf offshore well records with well name, class, operational status, TVD, total depth, water depth, deviation, field and source record details. TVD is preferred; total depth is labelled TD and is not represented as TVD.
- **BGS Single Onshore Borehole Index:** Great Britain borehole locations, published borehole length, year, water-well reference and source scan/log links. A negative or missing length sentinel is not displayed as a measured depth.
- **NOAA OceanReports Oil and Gas Wells:** U.S. coastal and territorial-water well location, well type and reported status. This layer does not provide a drilled depth; a schematic shaft is shown until a measured depth is available from another source.
- **WPdx-Basic:** globally shared water-point records filtered to well/borehole categories. These are reported water points, not necessarily drilled borehole completion reports. The record may include source, technology, country, area, status and report date; no depth is fabricated when absent.
- **OpenStreetMap contributors:** global supplemental explicitly tagged water, oil, gas, geothermal and generic boreholes. Depth is used only when a numeric depth tag exists.

## Rendering and depth semantics

Type-specific icons are visible from globe scale. At close zoom the renderer displays a vertically anchored Three.js borehole/casing column, a cap for sealed/plugged/abandoned records, and the published depth label for records that contain a numeric source depth. Regional loading adds local USGS and BGS records and viewport-filtered WPdx data. The 3D model selects nearby records to limit device load.

The 3D casing diameter, wall thickness and colors are illustrative and not surveyed dimensions. The shaft length follows a source-reported depth only when the popup and label identify a numeric depth and its source definition. Records without a published depth use a short schematic stub and are explicitly labelled “Depth not reported.” BGS lithology logs are linked where the source makes scans/logs available; no unreported strata are fabricated.

Status is stored separately from asset class. Plugged, capped, abandoned and decommissioned records receive a sealed/capped visual treatment. A source status is not treated as a live sensor state.

## Validation

Run:

\`\`\`sh
node --check rebuild-v5000/bridgepoint-subsurface-wells-v1.js
node tests/subsurface-wells-v1.test.mjs
\`\`\`
