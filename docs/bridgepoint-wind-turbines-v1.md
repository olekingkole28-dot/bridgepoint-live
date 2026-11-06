# BridgePoint USGS Wind Turbines v1

An opt-in, additive map layer for the U.S. Wind Turbine Database (USWTDB). It adds one Wind Turbines control and owns its own GeoJSON source, cluster/icon/label layers, Three.js custom renderer, click popup, and loading state. It does not replace or edit the base globe, buildings, roads, bridges, lighthouses, offshore energy, subsurface wells, weather, or other existing layers.

## Source and geographic coverage

- **USGS U.S. Wind Turbine Database (USWTDB), v9.1, released September 28, 2026.** The browser reads the official public API at https://energy.usgs.gov/api/uswtdb/v1/turbines.
- The USWTDB is a **United States inventory**, not a global inventory. The global globe view shows all records supplied by this source at their U.S. coordinates. It does not imply complete worldwide turbine coverage.
- USGS/LBNL/ACP source attribution is retained in the map source and each feature popup links to the official viewer and dataset.
- The layer is opt-in and starts off. The deploy workflow downloads the source server-side and publishes a same-origin JSON snapshot; the browser never makes a cross-origin USGS request.

## Source fields and display

The renderer requests source identifiers, project and turbine details, state/county/FIPS, year, project count/capacity, manufacturer, model, turbine capacity, hub height (t_hh), rotor diameter (t_rd), rotor swept area (t_rsa), total tip height (t_ttlh), offshore/retrofit fields, confidence fields, imagery provenance, and coordinates (xlong, ylat).

- Values in hub height, rotor diameter, rotor swept area, and total tip height are displayed in the source's metric units.
- Turbine capacity is displayed in kW and its kW-to-MW conversion.
- Missing or invalid source values remain “Not reported”; the popup does not substitute a guessed measurement.
- USGS attribute/location confidence codes are expanded using the source's published definitions. A confidence grade is not a field survey.
- A source record without hub height or rotor diameter can still receive a representative close-view model, but its popup explicitly identifies the missing dimension and warns that the model geometry is schematic.

## Map behavior

- At global zoom, turbine clusters expose location density without drawing tens of thousands of separate icons.
- As the user zooms in, clusters expand into individual map-anchored turbine icons and labels.
- At close zoom, nearby turbines render as Three.js models anchored at their geographic coordinates. When terrain elevation is available, the turbine base uses the map's terrain elevation.
- USGS states turbine locations were visually checked with an approximately ±10 m positional tolerance; technical specifications are not field verified.
- The rotor animates as a visual indicator. The database does not provide live rotor RPM, operating state, rotor yaw, or live wind speed; those model details are representative and animation is not represented as telemetry.
- Hub height, rotor diameter, and other published values remain the source-reported metrics; tower/nacelle geometry is a representative 3D rendering.
- Models are created only for nearby turbines and are capped per device to protect rendering performance.

## Validation

Run these commands:

    node --check rebuild-v5000/bridgepoint-wind-turbines-v1.js
    node tests/wind-turbines-v1.test.mjs
