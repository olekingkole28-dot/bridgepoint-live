#pragma once

#include "CoreMinimal.h"
#include "Subsystems/GameInstanceSubsystem.h"
#include "BridgePointEarthTypes.h"
#include "Containers/Ticker.h"
#include "BridgePointEarthSubsystem.generated.h"

/**
 * Shared Earth runtime state for BridgePoint Intelligence and Horizon.
 * Owns the simulation clock, geographic conversion, evidence-aware
 * environmental samples and distance-based render budgets.
 */
UCLASS()
class BRIDGEPOINTHORIZON_API UBridgePointEarthSubsystem : public UGameInstanceSubsystem
{
    GENERATED_BODY()

public:
    virtual void Initialize(FSubsystemCollectionBase& Collection) override;
    virtual void Deinitialize() override;

    UFUNCTION(BlueprintCallable, Category="BridgePoint|Earth|Clock")
    void SetSimulationClockUtc(FDateTime NewSimulationTimeUtc);

    UFUNCTION(BlueprintCallable, Category="BridgePoint|Earth|Clock")
    void SetSimulationTimeScale(double NewTimeScale);

    UFUNCTION(BlueprintCallable, Category="BridgePoint|Earth|Clock")
    void SetSimulationPaused(bool bNewPaused);

    UFUNCTION(BlueprintPure, Category="BridgePoint|Earth|Clock")
    FDateTime GetSimulationClockUtc() const { return SimulationClockUtc; }

    UFUNCTION(BlueprintPure, Category="BridgePoint|Earth|Clock")
    double GetSimulationTimeScale() const { return SimulationTimeScale; }

    UFUNCTION(BlueprintPure, Category="BridgePoint|Earth|Clock")
    bool IsSimulationPaused() const { return bSimulationPaused; }

    UFUNCTION(BlueprintCallable, Category="BridgePoint|Earth|Environment")
    bool AddEnvironmentSample(const FBridgePointEarthEnvironmentSample& Sample);

    UFUNCTION(BlueprintCallable, Category="BridgePoint|Earth|Environment")
    bool FindEnvironmentAtLocation(
        double LatitudeDegrees,
        double LongitudeDegrees,
        double MaximumDistanceKilometers,
        bool bIncludeForecastAndModelled,
        bool bIncludeSimulated,
        FBridgePointEarthEnvironmentSample& OutSample) const;

    UFUNCTION(BlueprintCallable, Category="BridgePoint|Earth|Environment")
    void ClearEnvironmentSamples();

    UFUNCTION(BlueprintPure, Category="BridgePoint|Earth|Rendering")
    static EBridgePointEarthDetailTier ResolveDetailTier(double CameraAltitudeMeters);

    UFUNCTION(BlueprintPure, Category="BridgePoint|Earth|Rendering")
    static FBridgePointEarthRenderBudget ResolveRenderBudget(
        double CameraAltitudeMeters,
        float PerformanceScale = 1.0f);

    static bool IsEnvironmentSampleStructurallyValid(
        const FBridgePointEarthEnvironmentSample& Sample);

    int32 GetEnvironmentSampleCount() const { return EnvironmentSamples.Num(); }

private:
    bool TickSimulationClock(float DeltaSeconds);

    static double GreatCircleDistanceKilometers(
        double LatitudeA,
        double LongitudeA,
        double LatitudeB,
        double LongitudeB);

    FDateTime SimulationClockUtc;
    double SimulationTimeScale = 1.0;
    bool bSimulationPaused = false;
    int32 MaximumEnvironmentSamples = 4096;
    TArray<FBridgePointEarthEnvironmentSample> EnvironmentSamples;
    FTSTicker::FDelegateHandle SimulationTickerHandle;
};
