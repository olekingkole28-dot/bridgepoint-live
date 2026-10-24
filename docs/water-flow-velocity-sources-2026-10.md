# BridgePoint water detail and flow-velocity source plan

Updated: 2026-10-24

## Renderer contract

The renderer adds high-frequency surface appearance in the fragment shader while retaining the bounded CPU mesh, shared MapLibre WebGL context, source-water polygon checks, shoreline rejection rules, inland water-level validation, and close-zoom zero-vertex-displacement guard. Multiplying grid cells by orders of magnitude would move cost onto mobile CPU geometry preparation and risks reintroducing height discontinuities and spikes.

The shader uses three fine-scale directional wave bands. Screen-space derivatives fade bands as they approach pixel-sampling limits, so detail should remain stable rather than shimmer. This is GPU pixel detail, not a claim that geometric vertex count increased 100-fold.

## Velocity sources to integrate

### U.S. rivers and streams

**Primary modeled-velocity source: NOAA National Water Model (NWM).** Its channel-point outputs include channel velocity in metres per second alongside streamflow. Output is organized around model reaches, so integrate published reach/channel geometry and stable reach identifiers. Do not attach a nearby velocity record to an arbitrary OSM line. Build a time-stamped reach-to-flowline join, then serve only the viewport subset as a compact vector/texture feed.

- NOAA NWM file/output field documentation: https://water.noaa.gov/about/output_file_contents
- NWM overview and reach/channel output context: https://api.water.noaa.gov/about/nwm

### Gauge observations and quality control

**USGS Water Data APIs** provide current streamflow, gage height, and monitoring-site metadata. These are valuable for validation and flood response, but discharge (for example, cubic feet per second) is not velocity (metres per second). Use channel-velocity field measurements when available; do not treat discharge as water speed without channel cross-section and a valid hydraulic model.

- USGS Water Data APIs: https://api.waterdata.usgs.gov/
- API and continuous/latest measurement guidance: https://api.waterdata.usgs.gov/docs/ogcapi/

### Global rivers

Copernicus GloFAS provides modeled river discharge over broad geographic coverage, but discharge alone is not enough to animate a channel at a defensible speed. A global implementation needs compatible reach geometry plus depth/width or a source velocity field. Until that join exists, class-based movement is intentionally reported as *visual fallback*, not real-world velocity.

- Copernicus GloFAS: https://global-flood.emergency.copernicus.eu/

### Ocean and coastal currents

For global ocean-current vectors, evaluate NOAA's Real-Time Ocean Forecast System (RTOFS). For more detailed regional coastal and estuary currents, NOAA Operational Forecast Systems expose velocity variables in supported domains. Regrid vectors into a compact, time-stamped raster/texture and sample them in the shader; keep current direction/speed distinct from wave direction/height.

- NOAA RTOFS current forecast: https://ocean.weather.gov/Current_fcasts.php
- NOAA Operational Forecast System data aggregation: https://opendap.co-ops.nos.noaa.gov/ofsdataagg/index.html

## Current implementation boundary

The renderer accepts explicitly unit-labeled per-feature velocity properties such as `velocity_m_s`, `velocity_mps`, `stream_velocity_m_s`, and `flow_velocity_m_s` as source-backed speed. The current OpenFreeMap/OSM waterway geometry provides channel lines and approximate widths, not a complete measured velocity feed. When no speed attribute is present, the renderer uses a differentiated visual class fallback and exposes counts in water diagnostics.

The next data-pipeline step is to materialize NOAA NWM reach velocities for U.S. channels and NOAA current vectors for supported marine domains, publish viewport endpoint/tiles, and join those values to waterway geometry with explicit source timestamps and units.
