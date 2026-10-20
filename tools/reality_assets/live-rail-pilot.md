# BridgePoint Live Rail Pilot (v5969)

This is the first source-backed live transit integration for BridgePoint. It is a **regional pilot**, not global rail coverage.

## Source

- Agency/API: MBTA V3 API — https://api-v3.mbta.com/
- Data credit: **MassDOT / MBTA**
- Feed type: vehicle positions, with related route and trip metadata.
- Mode filter: GTFS route types 0, 1, 2 (tram/light rail, subway, rail); route data is shown only when the source returns valid geometry/metadata.
- A request is made only after the viewer enables **LIVE RAIL**. **Focus MBTA Coverage** flies to the Boston-area network at a controlled city zoom so regional markers can be seen without searching the entire globe. While enabled on a visible page, refreshes are at least 60 seconds apart. MBTA documents a 20-request/minute limit without an API key; this viewer is configured substantially below that limit.
- Positions without valid coordinates or a usable source timestamp are skipped. Reports older than 3 minutes are not displayed. Each popup shows the source timestamp and age.
- Failure preserves the last response only as a visibly last-good snapshot; it never synthesizes replacement vehicles. Disabling the layer stops further polling and hides the layer.
- Current UI labels and rail positions are the source’s values; no passenger/person identity or camera tracking is involved.

## Verification

The GitHub workflow checks JavaScript syntax and runs the data-normalization test. The test verifies:
- module is off by default;
- refresh interval and report-age thresholds;
- route/trip metadata and source colors are normalized correctly;
- stale and coordinate-less records are excluded;
- an empty response stays empty;
- malformed API shape is rejected.

## Sources and terms

- MBTA V3 API: https://api-v3.mbta.com/
- MBTA developer information: https://www.mbta.com/developers/v3-api
- Massachusetts transit developer portal: https://www.mass.gov/lists/mbta-and-transit-data-for-developers
- Feed registry and license/attribution record: https://www.transit.land/feeds/f-mbta~rt

MassDOT attribution is displayed in the panel. The data feed is regional; no global train coverage is implied. API access can change and should be re-checked periodically.
