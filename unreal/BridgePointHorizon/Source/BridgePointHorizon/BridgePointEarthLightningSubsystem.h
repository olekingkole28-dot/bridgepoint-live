#pragma once

#include "CoreMinimal.h"
#include "Subsystems/GameInstanceSubsystem.h"
#include "BridgePointEarthTypes.h"
#include "BridgePointEarthLightningSubsystem.generated.h"

USTRUCT(BlueprintType)
struct BRIDGEPOINTHORIZON_API FBridgePointEarthLightningFlash
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadOnly, Category="BridgePoint|Earth|Lightning")
    int64 FlashId = INDEX_NONE;

    UPROPERTY(BlueprintReadOnly, Category="BridgePoint|Earth|Lightning")
    FBridgePointEarthGeoCoordinate Centroid;

    UPROPERTY(BlueprintReadOnly, Category="BridgePoint|Earth|Lightning")
    FDateTime FirstEventUtc;

    UPROPERTY(BlueprintReadOnly, Category="BridgePoint|Earth|Lightning")
    FDateTime LastEventUtc;

    UPROPERTY(BlueprintReadOnly, Category="BridgePoint|Earth|Lightning")
    double RadiantEnergyJoules = 0.0;

    UPROPERTY(BlueprintReadOnly, Category="BridgePoint|Earth|Lightning")
    double FootprintAreaSquareMeters = 0.0;

    UPROPERTY(BlueprintReadOnly, Category="BridgePoint|Earth|Lightning")
    int32 QualityFlag = 255;

    UPROPERTY(BlueprintReadOnly, Category="BridgePoint|Earth|Lightning")
    FString Satellite;

    UPROPERTY(BlueprintReadOnly, Category="BridgePoint|Earth|Lightning")
    FString DetectionKind = TEXT("GLM_optical_flash");

    UPROPERTY(BlueprintReadOnly, Category="BridgePoint|Earth|Lightning")
    int32 SourceIndex = INDEX_NONE;
};

USTRUCT(BlueprintType)
struct BRIDGEPOINTHORIZON_API FBridgePointEarthLightningSource
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadOnly, Category="BridgePoint|Earth|Lightning")
    FString SourceId;

    UPROPERTY(BlueprintReadOnly, Category="BridgePoint|Earth|Lightning")
    FString Satellite;

    UPROPERTY(BlueprintReadOnly, Category="BridgePoint|Earth|Lightning")
    FString SourceName;

    UPROPERTY(BlueprintReadOnly, Category="BridgePoint|Earth|Lightning")
    FString SourceVersion;

    UPROPERTY(BlueprintReadOnly, Category="BridgePoint|Earth|Lightning")
    FString LicenseId;

    UPROPERTY(BlueprintReadOnly, Category="BridgePoint|Earth|Lightning")
    FString Attribution;

    UPROPERTY(BlueprintReadOnly, Category="BridgePoint|Earth|Lightning")
    FDateTime GeneratedAtUtc;

    UPROPERTY(BlueprintReadOnly, Category="BridgePoint|Earth|Lightning")
    FDateTime LatestEventUtc;

    UPROPERTY(BlueprintReadOnly, Category="BridgePoint|Earth|Lightning")
    int32 FlashCount = 0;

    UPROPERTY(BlueprintReadOnly, Category="BridgePoint|Earth|Lightning")
    bool bFresh = false;

    UPROPERTY(BlueprintReadOnly, Category="BridgePoint|Earth|Lightning")
    bool bCommerciallyCleared = false;
};

DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(
    FBridgePointEarthLightningUpdated,
    int32, FlashCount,
    const FString&, Message);

/**
 * Loads observed NOAA GLM flash centroids from local, Git-ignored JSON fields.
 * They are optical lightning centroids, not guaranteed ground-strike points.
 */
UCLASS()
class BRIDGEPOINTHORIZON_API UBridgePointEarthLightningSubsystem : public UGameInstanceSubsystem
{
    GENERATED_BODY()

public:
    virtual void Initialize(FSubsystemCollectionBase& Collection) override;
    virtual void Deinitialize() override;

    UPROPERTY(BlueprintAssignable, Category="BridgePoint|Earth|Lightning")
    FBridgePointEarthLightningUpdated OnLightningFieldUpdated;

    UPROPERTY(BlueprintReadOnly, Category="BridgePoint|Earth|Lightning")
    TArray<FBridgePointEarthLightningFlash> Flashes;

    UPROPERTY(BlueprintReadOnly, Category="BridgePoint|Earth|Lightning")
    TArray<FBridgePointEarthLightningSource> Sources;

    UPROPERTY(BlueprintReadOnly, Category="BridgePoint|Earth|Lightning")
    FDateTime ManifestGeneratedAtUtc;

    UPROPERTY(BlueprintReadOnly, Category="BridgePoint|Earth|Lightning")
    FString LastLoadMessage;

    UFUNCTION(BlueprintCallable, Category="BridgePoint|Earth|Lightning")
    int32 ReloadLocalLightning();

    UFUNCTION(BlueprintPure, Category="BridgePoint|Earth|Lightning")
    bool HasFreshObservedLightningData() const;

    UFUNCTION(BlueprintPure, Category="BridgePoint|Earth|Lightning")
    int32 GetFreshFlashCount() const;

    UFUNCTION(BlueprintPure, Category="BridgePoint|Earth|Lightning")
    FString GetLightningSourceDirectory() const;

    static bool IsFlashStructurallyValid(const FBridgePointEarthLightningFlash& Flash);
    static bool IsSourceFreshAt(
        const FBridgePointEarthLightningSource& Source,
        FDateTime NowUtc,
        int32 MaximumAgeSeconds);

private:
    int32 MaximumSources = 4;
    int32 MaximumFlashesPerSource = 30000;
    int32 MaximumTotalFlashes = 60000;
    int32 MaximumSourceAgeSeconds = 120;

    bool LoadManifest(const FString& ManifestPath);
    bool LoadLightningFile(
        const FString& RootDirectory,
        const FString& RelativeFile,
        int32 SourceIndex,
        FBridgePointEarthLightningSource& OutSource,
        TArray<FBridgePointEarthLightningFlash>& OutFlashes,
        FString& OutError) const;

    static bool ParseIsoUtc(const FString& Value, FDateTime& OutDateTime);
    static bool IsValidRelativeFilePath(
        const FString& RootDirectory,
        const FString& RelativeFile,
        FString& OutFullPath);
};
