#pragma once

#include "CoreMinimal.h"
#include "BridgePointEarthTypes.h"

class BRIDGEPOINT_EARTH_API FBridgePointGeoReference
{
public:
    static constexpr double MaxMercatorLatitude = 85.0511287798066;
    static FBPGeoTileKey TileForLocation(double Latitude, double Longitude, int32 Zoom);
    static FBPGeoBounds BoundsForTile(const FBPGeoTileKey& Tile);
    static FVector2D CenterForTile(const FBPGeoTileKey& Tile);
    static FVector2D ToLocalMeters(double Longitude, double Latitude, double OriginLongitude, double OriginLatitude);
    static FVector2D LocalMetersToGeo(double EastMeters, double NorthMeters, double OriginLongitude, double OriginLatitude);
    static double NormalizeLongitude(double Longitude);
};