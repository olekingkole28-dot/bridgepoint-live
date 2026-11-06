# BridgePoint Offshore Energy v1

This module is an opt-in addition to the existing BridgePoint globe. It adds one OFFSHORE OIL & GAS toggle to the existing bottom card and owns separate map sources, map layers, popup UI and Three.js model state. It does not modify the lighthouse module or existing map layers.

## Coverage and sources

- **NOAA Office for Coastal Management – Offshore Oil and Gas Platforms:** the national/state and federal waters platform-location layer. It provides point locations, platform identifier/type/name, operator, jurisdiction and source record. Its published inclusion note says it includes known active producers and platforms whose production status could not be verified; it does not separate those two states. It is U.S.-waters coverage, not a global inventory.
- **NOAA OceanReports – Oil and Gas Platforms:** a second NOAA layer with `status`, `type` and `source` attributes. The module attempts a nearest-feature join within 250 metres. When a match exists, the raw status value is shown as NOAA-reported; it is not represented as a real-time sensor feed.
- **HIFLD / DHS – Oil and Natural Gas Platforms and Wells:** displayed as source/provenance references and used when recorded by upstream source metadata. The Data.gov platform inventory metadata says its dataset was last updated October 24, 2022, so it is not described as real-time.
- **OpenStreetMap contributors:** global supplemental offshore platforms and explicitly tagged offshore wells. Well features are admitted only when they are explicitly tagged offshore or as sea/seabed/offshore locations; generic onshore well records are rejected.
- **BSEE Platform/Rig Information:** linked in each asset popup as the official operational/production status reference. BSEE lists platform masters, structures and locations with a published update time. This first renderer does not claim a BSEE current status unless a value is actually present in the joined NOAA status record; a platform ID alone is not treated as a verified production state.

## Display and geometry

Global dots remain visible at globe scale. Type-specific canvas icons appear as the map gets closer. From local zoom, an estimated footprint polygon is drawn. At close zoom, a bounded number of geographically anchored polygonal Three.js models are rendered (nearest visible assets first; seven on touch/mobile, twenty-two on desktop).

The model includes a braced jacket, seabed footings, conductors/well strings, surface decks, process modules, utility pipe racks, drilling derrick, helipad, crane and flare stack. It is a generic detailed engineering model selected by platform/well class, not a photogrammetric reconstruction of each individual installation.

The NOAA location layer does not supply platform deck dimensions or water depth. Where a source record has real dimension/depth tags, those values are used. Otherwise the initial platform model uses illustrative scale defaults (54 m deck length, 42 m deck width, 32 m above-water height and 38 m water depth); popup fields explicitly label each value as estimated. The drawn wellhead and seabed connections are structural visualization, not a surveyed as-built flowline map. No unseen remote subsea well-to-platform connection is invented.

## Status honesty

The popup displays only source-reported status text when it can be spatially joined from the NOAA OceanReports layer. Otherwise it states that operational status is not independently confirmed and directs the user to BSEE. NOAA's own platform inclusion criteria intentionally combine active and unverified records. HIFLD's 2022 timestamp is disclosed in the source catalog; an old dataset is never presented as live.

## Validation

Run:

```sh
node --input-type=module --check < rebuild-v5000/bridgepoint-offshore-energy-v1.js
node tests/offshore-energy-v1.test.mjs
```

