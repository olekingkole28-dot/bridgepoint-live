#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "BridgePointEarthCloudNiagaraBridge.generated.h"

class ACesiumGeoreference;
class UNiagaraComponent;
class UNiagaraSystem;
class UBridgePointEarthCloudSubsystem;
class UBridgePointEarthSubsystem;

/**
 * Streams time-selected, observed GOES cloud samples into an optional Niagara
 * system. It does not synthesize cloud coverage outside the satellite data.
 *
 * Required Niagara user parameters:
 *   User.CloudPositions    Array Position (Unreal world coordinates)
 *   User.CloudAttributes   Array Vector4 (opacity, probability, mask class, cloud-top metres)
 *   User.VisibilityWeight  Float (frame cross-fade weight)
 *   User.PointCount        Int32 (valid entries in the arrays)
 *
 * Set BRIDGEPOINT_EARTH_CLOUD_NIAGARA_ASSET to the Niagara system object path,
 * for example /Game/BridgePoint/Earth/FX/NS_ObservedClouds.NS_ObservedClouds.
 */
UCLASS(ClassGroup=(BridgePoint), meta=(BlueprintSpawnableComponent))
class BRIDGEPOINTHORIZON_API UBridgePointEarthCloudNiagaraBridge : public UActorComponent
{
    GENERATED_BODY()

public:
    UBridgePointEarthCloudNiagaraBridge();

    virtual void TickComponent(
        float DeltaTime,
        ELevelTick TickType,
        FActorComponentTickFunction* ThisTickFunction) override;

    virtual void EndPlay(const EEndPlayReason::Type EndPlayReason) override;

    UFUNCTION(BlueprintCallable, Category="BridgePoint|Earth|Clouds")
    bool InitializeForEarth(ACesiumGeoreference* InGeoreference);

    UFUNCTION(BlueprintCallable, Category="BridgePoint|Earth|Clouds")
    void ShutdownCloudRendering();

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="BridgePoint|Earth|Clouds",
        meta=(ClampMin="1.0", ClampMax="60.0"))
    float RefreshIntervalSeconds = 10.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="BridgePoint|Earth|Clouds",
        meta=(ClampMin="100", ClampMax="20000"))
    int32 MaximumPointsPerFrame = 5000;

    UPROPERTY(BlueprintReadOnly, Category="BridgePoint|Earth|Clouds")
    int32 LastSubmittedPointCount = 0;

    UPROPERTY(BlueprintReadOnly, Category="BridgePoint|Earth|Clouds")
    FString StatusMessage;

private:
    static constexpr int32 NiagaraFrameSlotCount = 4;
    static constexpr double MeanEarthRadiusMeters = 6371008.8;

    UPROPERTY(Transient)
    TObjectPtr<ACesiumGeoreference> Georeference;

    UPROPERTY(Transient)
    TObjectPtr<UNiagaraSystem> CloudNiagaraSystem;

    UPROPERTY(Transient)
    TArray<TObjectPtr<UNiagaraComponent>> NiagaraFrameComponents;

    TWeakObjectPtr<UBridgePointEarthCloudSubsystem> CloudSubsystem;
    TWeakObjectPtr<UBridgePointEarthSubsystem> EarthSubsystem;

    bool bEarthInitialized = false;
    bool bLoggedMissingAssetPath = false;
    bool bLoggedInvalidAsset = false;
    float RefreshAccumulatorSeconds = 0.0f;
    float AssetRetryAccumulatorSeconds = 0.0f;

    bool TryLoadNiagaraSystem();
    bool EnsureNiagaraFrameComponents();
    void UpdateObservedCloudFrames();
    void UpdateSatelliteFrames(const FString& Satellite, int32 FirstSlot);
    bool SubmitCloudFrame(int32 Slot, int32 SourceIndex, float VisibilityWeight);
    void ClearCloudFrame(int32 Slot);

    static double GeopotentialToGeometricHeightMeters(double GeopotentialHeightMeters);
};
