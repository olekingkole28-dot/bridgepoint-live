#include "BridgePointGeoReference.h"

namespace
{
    constexpr double EarthRadiusMeters = 6378137.0;
    constexpr double DegreesToRadians = PI / 180.0;
    constexpr double RadiansToDegrees = 180.0 / PI;
}

double FBridgePointGeoReference::NormalizeLongitude(double Longitude)
{
    double Result = FMath::Fmod(Longitude + 180.0, 360.0);
    if (Result < 0.0) Result += 360.0;
    return Result - 180.0;
}

FBPGeoTileKey FBridgePointGeoReference::TileForLocation(double Latitude, double Longitude, int32 Zoom)
{
    const int32 SafeZoom = FMath::Clamp(Zoom, 0, 22);
    const double N = FMath::Pow(2.0, SafeZoom);
    const double Lat = FMath::DegreesToRadians(FMath::Clamp(Latitude, -MaxMercatorLatitude, MaxMercatorLatitude));
    const double Lon = NormalizeLongitude(Longitude);
    const int32 X = FMath::Clamp(FMath::FloorToInt((Lon + 180.0) / 360.0 * N), 0, static_cast<int32>(N) - 1);
    const int32 Y = FMath::Clamp(FMath::FloorToInt((1.0 - FMath::Asinh(FMath::Tan(Lat)) / PI) * 0.5 * N), 0, static_cast<int32>(N) - 1);
    FBPGeoTileKey Result;
    Result.X = X; Result.Y = Y; Result.Zoom = SafeZoom;
    return Result;
}

FBPGeoBounds FBridgePointGeoReference::BoundsForTile(const FBPGeoTileKey& Tile)
{
    const double N = FMath::Pow(2.0, FMath::Clamp(Tile.Zoom, 0, 22));
    const double West = static_cast<double>(Tile.X) / N * 360.0 - 180.0;
    const double East = static_cast<double>(Tile.X + 1) / N * 360.0 - 180.0;
    const auto LatitudeForY = [N](double Y)
    {
        const double Mercator = PI * (1.0 - 2.0 * Y / N);
        return FMath::RadiansToDegrees(FMath::Atan(FMath::Sinh(Mercator)));
    };
    FBPGeoBounds Bounds;
    Bounds.West = West;
    Bounds.East = East;
    Bounds.North = LatitudeForY(Tile.Y);
    Bounds.South = LatitudeForY(Tile.Y + 1);
    return Bounds;
}

FVector2D FBridgePointGeoReference::CenterForTile(const FBPGeoTileKey& Tile)
{
    const FBPGeoBounds B = BoundsForTile(Tile);
    return FVector2D((B.West + B.East) * 0.5, (B.South + B.North) * 0.5);
}

FVector2D FBridgePointGeoReference::ToLocalMeters(double Longitude, double Latitude, double OriginLongitude, double OriginLatitude)
{
    const double Lat0 = FMath::DegreesToRadians(OriginLatitude);
    const double DeltaLon = FMath::DegreesToRadians(NormalizeLongitude(Longitude - OriginLongitude));
    const double DeltaLat = FMath::DegreesToRadians(Latitude - OriginLatitude);
    return FVector2D(
        EarthRadiusMeters * DeltaLon * FMath::Cos(Lat0),
        EarthRadiusMeters * DeltaLat);
}

FVector2D FBridgePointGeoReference::LocalMetersToGeo(double EastMeters, double NorthMeters, double OriginLongitude, double OriginLatitude)
{
    const double Lat0 = FMath::DegreesToRadians(OriginLatitude);
    const double Lon = OriginLongitude + FMath::RadiansToDegrees(EastMeters / (EarthRadiusMeters * FMath::Max(0.01, FMath::Cos(Lat0))));
    const double Lat = OriginLatitude + FMath::RadiansToDegrees(NorthMeters / EarthRadiusMeters);
    return FVector2D(NormalizeLongitude(Lon), FMath::Clamp(Lat, -MaxMercatorLatitude, MaxMercatorLatitude));
}