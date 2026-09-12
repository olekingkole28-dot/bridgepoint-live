# BridgePoint Horizon 3040 — Open Runtime & Asset Sources

This file is the release source ledger for the staged Horizon game build. The game must not depend on a model source that lacks a reusable license.

## Runtime libraries

| Component | Use | Source | License |
|---|---|---|---|
| Three.js 0.180 | WebGL renderer, GLTF loading, post-processing, raycasting | https://threejs.org/ | MIT |
| Rapier 3D compat 0.20 | Kinematic character physics, colliders, camera ray safety | https://rapier.rs/ | Apache-2.0 |
| NippleJS 0.10.2 | Mobile virtual joystick | https://github.com/yoannmoinet/nipplejs | MIT |

## Game art

| Pack | Use in Horizon | Source / mirror | License |
|---|---|---|---|
| Quaternius Zombie Apocalypse Kit | Multiple rigged survivors (Matt, Lis, Sam, Shaun), infected variants, melee/firearms, vehicles, survival street props, chests | Quaternius; mirrored as glTF in `agentkaerf/FreeModels/Zombie Apocalypse Kit - March 2024` | CC0 1.0 |
| Quaternius Sushi Restaurant Kit | Interior chairs, sofa, plants, kitchen fixtures, cabinets, tables, paintings and lights | Quaternius; mirrored as glTF in `agentkaerf/FreeModels/Sushi Restaurant Kit - May 2023` | CC0 1.0 |

The mirror repository README identifies the mirrored Quaternius models as CC0 1.0. Release code intentionally does not use the former `break-my-house` interior source because that repository exposes no declared license.

## Generated / source-backed geometry

BridgePoint road, terrain, parcel, building and building-part geometry are streamed from BridgePoint's own open/public-data ingestion output. Procedural grass, shrubs, facade windows, apartment partitions, beds, dressers, loot markers, portals and other simple meshes are generated at runtime by Horizon code and do not embed third-party art.

## Release rule

Before merging a Horizon release:
1. The branch browser gate must pass.
2. Production deploy verification must find the exact build number and required systems.
3. The public browser smoke test must pass against the deployed URL.
4. No undeclared-license model host may appear in `horizon-world.js`.

| Quaternius Showcase mirror | Wolf, Spider hostile variants | CC0 1.0 | https://github.com/trebeljahr/quaternius-showcase | Runtime GLB mirror used for animated wolf/spider models. |
| Constellation Defense Quaternius mirror | Orc, Yeti hostile variants | CC0 1.0 | https://github.com/Hakhyun-Kim/constellation-defense/blob/main/CREDITS.md | Runtime GLB repacks of Quaternius Ultimate Monsters; credits record CC0. |
| Dereth / Poly Pizza Bear | Feral bear hostile variant | CC BY | https://github.com/w5ohr/Dereth/blob/main/assets/README.md | Free model; attribution is retained because it is not CC0. |
