# Global Offline World — Checkpoint 1

## Goal
Keep the existing BridgePoint globe and add a durable, manifest-driven local data layer. The full globe must open without a network connection; additional detail is installed as independently managed offline packs. This checkpoint adds the storage engine only. It does **not** claim the renderer, every layer, or the mobile app is offline-ready yet.

## Existing implementation inspected
- Main public experience: `rebuild-v5000/index.html`, MapLibre-based app modules, `rebuild-v5000/sw.js`.
- Separate 3D world: `staging/world-v2652/index.html`, CesiumJS 1.145 and modular world scripts.
- Existing service worker caches selected same-origin assets as fallback but does not manage downloadable geographic packs.
- Current production paths include external providers and dynamic feeds. They must not be represented as offline-ready unless their data is explicitly packaged.

## Architecture
1. **World starter pack**: local globe textures, country/coastline outlines, coarse terrain/labels, renderer dependencies, and a small manifest. It is the minimum offline startup contract.
2. **Detail packs**: independent regional archives for building footprints, parcels, terrain, imagery, LiDAR, infrastructure and saved property records, where source rights permit.
3. **Manifest-driven storage**: each pack declares id/version/title, resources, byte estimates, source, licence/redistribution note, generated-at time and checksums where available.
4. **Storage separation**: Cache Storage holds retrievable same-origin resources; IndexedDB stores pack metadata and installation state. Never put secrets or customer-private records in public packs.
5. **Freshness truth**: cached time-sensitive data must display observation/update time and stale status. Offline mode must never label cached weather, flights, alerts or shelter status as live.
6. **Renderer integration later**: add adapters to the existing MapLibre and Cesium paths only after the storage engine passes tests. Do not replace either renderer in this checkpoint.

## Checkpoints
- **C1 — Storage core (this branch):** validate pack manifests, estimate browser storage, install/remove/list packs, progress/error states, and unit tests.
- **C2 — World starter pack:** generate and host a compact, legally redistributable global base archive and make startup use it.
- **C3 — Web globe integration:** route base map and supported layers to local assets; no-network cold-start tests.
- **C4 — Flutter/native integration:** use platform-appropriate persistent file storage and a shared manifest format; do not store large archives in SharedPreferences.
- **C5 — Maximum-detail packages:** optional country/region packs for building, parcel, imagery, LiDAR and other data; resumable downloads, integrity checks, storage management.
- **C6 — P2P:** separate secure device-to-device exchange and later multi-hop relay work.

## Acceptance gates
- A valid manifest installs and is discoverable after reload.
- Invalid IDs/URLs and unsupported manifest versions are rejected.
- Failed downloads do not mark a pack complete.
- Pack deletion removes only resources owned by that pack.
- Storage estimates and progress are reported honestly.
- Existing globe files and current rendering behavior remain unchanged until C3.
- A cold start in airplane mode must be tested on desktop browser and Android before claiming offline readiness.

## Important constraints
- “412M+ canonical property records” is not equivalent to 412M parcel polygons or 3D buildings. Coverage varies.
- Full-resolution imagery, global LiDAR and all property records are too large for a realistic universal phone download. The design supports very large optional packs and external storage where available.
- External data licensing, API terms, authentication, and privacy must be checked per source before packaging.
- No deployment or production change is part of C1.
