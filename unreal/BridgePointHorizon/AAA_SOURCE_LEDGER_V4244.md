# BridgePoint Horizon — AAA Source Intake Ledger V4244

Status terms:
- **Promote first** — verified source, high-value lane, ready for acquisition/import evaluation.
- **Reference** — useful systems/patterns; do not automatically make it part of Horizon's visual identity.
- **Evaluate** — legally promising but must still pass visual/performance/gameplay review before promotion.
- **UE-only** — may be used only in Unreal Engine-based Horizon products.
- **Engine-agnostic** — may be used in Unreal and, when technically suitable, non-Unreal Horizon clients.

| Source | Status | License / restriction | Horizon use |
|---|---|---|---|
| Epic Game Animation Sample | Promote first · UE | Epic sample/Fab; keep in Unreal pipeline | Motion Matching, walk/run/jump/fall, traversal, retargeting |
| Epic City Sample Buildings | Promote first · UE-only | UE-Only Content | Dense modular city visuals, entrances, multi-level city dressing |
| Epic City Sample Vehicles | Promote first · UE-only | UE-Only Content | 13 realistic driveable vehicle foundations |
| Epic City Sample Crowds | Promote first · UE | Epic sample content | Crowd/body/wardrobe and LOD reference |
| Epic MetaHuman 5.8 | Promote first · UE-only | MetaHuman Content is UE-Only | Photoreal survivors, facial/body rigs, crowd pipeline |
| Epic Valley of the Ancient | Reference · UE-only | Fab listing: Unreal Engine-based products only | Mountains, ruins, World Partition, Nanite/Lumen reference |
| Epic Paragon Minions | Evaluate · UE | Free for Unreal projects; never use PARAGON trademark in Horizon branding | High-quality hostile/elite rig and animation evaluation |
| Epic Paragon Rampage | Evaluate · UE | Free for Unreal projects; never use PARAGON trademark in Horizon branding | Raid-boss rig/animation evaluation |
| Epic Shooter Game | Reference · UE-only | Unreal Engine-based products only | Weapon, AI bot and combat architecture reference |
| Epic Vehicle Game | Reference · UE-only | Unreal Engine-based products only | Vehicle physics/Blueprint/audio reference |
| Poly Haven | Promote first · engine-agnostic | CC0 | HDRIs, 8K+ PBR textures, photoreal models/props |
| ambientCG | Promote first · engine-agnostic | CC0 | Ground, concrete, wood, metal, roofs, siding, interior PBR surfaces |
| Sonniss #GameAudioGDC 2026 | Promote first · engine-agnostic audio | Royalty-free project use; source SFX may not be redistributed standalone | Layered weapons, foley, impacts, ambience, creatures, horror sound design |

## Acquisition and promotion rules

1. Never scrape or rip assets from proprietary games.
2. Fab/Epic UE-only content stays inside the Unreal client and Unreal-based Pixel Streaming output.
3. Preserve the source page and license evidence at acquisition time.
4. Never commit paid/restricted source asset archives to the public repository.
5. Engine-agnostic files must enter through the staged import lane and the UE importer in `Scripts/horizon_batch_import.py`.
6. Do not overwrite working Horizon content automatically. Import into isolated `/Game/Horizon/.../Imported` folders first.
7. Promotion requires a visual comparison, performance profile, gameplay check, and release smoke test.
8. BridgePoint source-backed geometry remains authoritative. Purchased/free art may dress or render the game world but must not become false real-world evidence.
9. Stripe/payment systems are unrelated to asset acquisition and remain untouched until the owner explicitly authorizes that final integration.
