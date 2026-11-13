#pragma once

#include "CoreMinimal.h"
#include "Subsystems/GameInstanceSubsystem.h"
#include "BridgePointEarthTypes.h"
#include "BridgePointEarthCloudSubsystem.generated.h"

USTRUCT(BlueprintType)
struct BRIDGEPOINTHORIZON_API FBridgePointEarthCloudPoint
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadOnly, Category="BridgePoint|Earth|Clouds")
    FBridgePointEarthGeoCoordinate Location;

    UPROPERTY(BlueprintReadOnly, Category="BridgePoint|Earth|Clouds")
    float CloudTopHeightMeters = 0.0f;

    UPROPERTY(BlueprintReadOnly, Category="BridgePoint|Earth|Clouds")
    int32 MaskClass = 0;

    UPROPERTY(BlueprintReadOnly, Category="BridgePoint|Earth|Clouds")
    float Probability = 0.0f;

    UPROPERTY(BlueprintReadOnly, Category="BridgePoint|Earth|Clouds")
    float OpacityHint = 0.0f;

    UPROPERTY(BlueprintReadOnly, Category="BridgePoint|Earth|Clouds")
    int32 SourceIndex = INDEX_NONE;
};

USTRUCT(BlueprintType)
struct BRIDGEPOINTHORIZON_API FBridgePointEarthCloudSource
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadOnly, Category="BridgePoint|Earth|Clouds")
    FString SourceId;

    UPROPERTY(BlueprintReadOnly, Category="BridgePoint|Earth|Clouds")
    FString Satellite;

    UPROPERTY(BlueprintReadOnly, Category="BridgePoint|Earth|Clouds")
    FString SourceName;

    UPROPERTY(BlueprintReadOnly, Category="BridgePoint|Earth|Clouds")
    FString SourceVersion;

    UPROPERTY(BlueprintReadOnly, Category="BridgePoint|Earth|Clouds")
    FString LicenseId;

    UPROPERTY(BlueprintReadOnly, Category="BridgePoint|Earth|Clouds")
    FString Attribution;

    UPROPERTY(BlueprintReadOnly, Category="BridgePoint|Earth|Clouds")
    FDateTime ObservedAtUtc;

    UPROPERTY(BlueprintReadOnly, Category="BridgePoint|Earth|Clouds")
    int32 PointCount = 0;

    UPROPERTY(BlueprintReadOnly, Category="BridgePoint|Earth|Clouds")
    bool bFresh = false;

    UPROPERTY(BlueprintReadOnly, Category="BridgePoint|Earth|Clouds")
    bool bCommerciallyCleared = false;
};

DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(
    FBridgePointEarthCloudFieldUpdated,
    int32, PointCount,
    const FString&, Message);

/**
 * Loads locally staged, source-derived GOES cloud-mask + cloud-top-height
 * observations. It deliberately does not invent missing satellite coverage.
 *
 * Files live under ProjectDir/ExternalAssets or a path explicitly supplied
 * through BRIDGEPOINT_EARTH_CLOUDS_PATH. The directory is Git-ignored.
 */
UCLASS()
class BRIDGEPOINTHORIZON_API UBridgePointEarthCloudSubsystem : public UGameInstanceSubsystem
{
    GENERATED_BODY()

public:
    virtual void Initialize(FSubsystemCollectionBase& Collection) override;
    virtual void Deinitialize() override;

    UPROPERTY(BlueprintAssignable, Category="BridgePoint|Earth|Clouds")
    FBridgePointEarthCloudFieldUpdated OnCloudFieldUpdated;

    UPROPERTY(BlueprintReadOnly, Category="BridgePoint|Earth|Clouds")
    TArray<FBridgePointEarthCloudPoint> CloudPoints;

    UPROPERTY(BlueprintReadOnly, Category="BridgePoint|Earth|Clouds")
    TArray<FBridgePointEarthCloudSource> CloudSources;

    UPROPERTY(BlueprintReadOnly, Category="BridgePoint|Earth|Clouds")
    FDateTime ManifestGeneratedAtUtc;

    UPROPERTY(BlueprintReadOnly, Category="BridgePoint|Earth|Clouds")
    FString LastLoadMessage;

    UFUNCTION(BlueprintCallable, Category="BridgePoint|Earth|Clouds")
    int32 ReloadLocalCloudFields();

    UFUNCTION(BlueprintPure, Category="BridgePoint|Earth|Clouds")
    bool HasFreshObservedCloudData() const;

    UFUNCTION(BlueprintPure, Category="BridgePoint|Earth|Clouds")
    int32 GetFreshCloudPointCount() const;

    UFUNCTION(BlueprintPure, Category="BridgePoint|Earth|Clouds")
    FString GetCloudSourceDirectory() const;

private:
    int32 MaximumSources = 4;
    int32 MaximumPointsPerSource = 60000;
    int32 MaximumTotalPoints = 120000;
    int32 MaximumSourceAgeSeconds = 1800;

    bool LoadManifest(const FString& ManifestPath);
    bool LoadCloudFieldFile(
        const FString& RootDirectory,
        const FString& RelativeFile,
        int32 SourceIndex,
        FBridgePointEarthCloudSource& OutSource,
        TArray<FBridgePointEarthCloudPoint>& OutPoints,
        FString& OutError) const;

    static bool ParseIsoUtc(const FString& Value, FDateTime& OutDateTime);
    static bool IsValidRelativeFilePath(const FString& RootDirectory, const FString& RelativeFile, FString& OutFullPath);
};
