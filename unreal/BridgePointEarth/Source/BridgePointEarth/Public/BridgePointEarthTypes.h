#pragma once

#include "CoreMinimal.h"
#include "BridgePointEarthTypes.generated.h"

UENUM(BlueprintType)
enum class EBPGeometryType : uint8
{
    Unknown,
    Point,
    LineString,
    Polygon
};

UENUM(BlueprintType)
enum class EBPWorldLayer : uint8
{
    Satellite,
    Terrain,
    Buildings,
    Roofs,
    Parcels,
    Roads,
    Sidewalks,
    Rail,
    Bridges,
    Water,
    Trees,
    StreetFurniture,
    Streetlights,
    Wells,
    Towers,
    Powerlines,
    Subsurface,
    Weather,
    Radar,
    Storms,
    Wildfire,
    Flood,
    Wind,
    Aircraft,
    Drones,
    Vessels,
    Satellites,
    Opportunities,
    Listings,
    History,
    Moon
};

USTRUCT(BlueprintType)
struct FBPGeoTileKey
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadWrite) int32 X = 0;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) int32 Y = 0;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) int32 Zoom = 14;

    FString ToString() const { return FString::Printf(TEXT("%d/%d/%d"), Zoom, X, Y); }
    bool operator==(const FBPGeoTileKey& Other) const
    {
        return X == Other.X && Y == Other.Y && Zoom == Other.Zoom;
    }
    friend uint32 GetTypeHash(const FBPGeoTileKey& Key)
    {
        return HashCombine(HashCombine(::GetTypeHash(Key.X), ::GetTypeHash(Key.Y)), ::GetTypeHash(Key.Zoom));
    }
};

USTRUCT(BlueprintType)
struct FBPGeoBounds
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadWrite) double West = 0.0;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) double South = 0.0;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) double East = 0.0;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) double North = 0.0;
};

USTRUCT(BlueprintType)
struct FBPGeoFeature
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadOnly) FString SourceLayer;
    UPROPERTY(BlueprintReadOnly) int64 SourceId = INDEX_NONE;
    UPROPERTY(BlueprintReadOnly) EBPGeometryType GeometryType = EBPGeometryType::Unknown;
    // Each path stores longitude in X and latitude in Y, in WGS84 degrees.
    UPROPERTY(BlueprintReadOnly) TArray<TArray<FVector2D>> Paths;
    UPROPERTY(BlueprintReadOnly) TMap<FName, FString> Properties;
    // -1 means the source did not provide a usable height. Never infer one here.
    UPROPERTY(BlueprintReadOnly) float HeightMeters = -1.0f;
    UPROPERTY(BlueprintReadOnly) float WidthMeters = -1.0f;
};

USTRUCT(BlueprintType)
struct FBPWorldLayerDefinition
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadWrite) EBPWorldLayer Id = EBPWorldLayer::Buildings;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) FName RuntimeTag = NAME_None;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) FText DisplayName;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) FText Group;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) bool bEnabledByDefault = true;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) bool bSourceAdapterConnected = false;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) bool bClearanceInput = false;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) float ClearanceRadiusMeters = 0.0f;
};