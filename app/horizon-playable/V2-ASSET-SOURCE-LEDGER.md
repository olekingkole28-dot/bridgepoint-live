# Horizon V2 source and asset rules

Horizon separates factual placement from game art.

## Geographic truth layer
- BridgePoint Horizon stream endpoint: source-backed building footprints, roads/transport geometry and cell bounds used for placement and scale.
- Terrain/building/parcel/property intelligence remains data provenance controlled in BridgePoint backend and is not replaced by decorative art.

## Game-art layer
- Primitive/procedural meshes generated locally by Horizon V2 are original runtime geometry and may be freely used in the product.
- Existing Horizon CC0 lane remains approved for art packs such as Quaternius assets already vetted in the prior build.
- Any third-party model, texture, audio or animation added to V2 must have an explicit commercial-use license recorded here before it ships. Undeclared-license GitHub assets are prohibited.

## Visual contract
Free/open assets may improve realism and variety, but may never move the factual road/building/property skeleton away from its source-backed location. Art is snapped to, dressed around, or substituted within those bounds.
