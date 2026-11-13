#pragma once

#include "CoreMinimal.h"
#include "BridgePointEarthTypes.h"

class BRIDGEPOINTEARTH_API FBridgePointMVTDecoder
{
public:
    // Decodes Mapbox Vector Tile protobuf (PBF) geometry into WGS84 feature paths.
    static bool Decode(const TArray<uint8>& Bytes, const FBPGeoTileKey& Tile, TArray<FBPGeoFeature>& OutFeatures, FString& OutError);
};