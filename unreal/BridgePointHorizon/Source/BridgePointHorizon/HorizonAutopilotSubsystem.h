#pragma once

#include "CoreMinimal.h"
#include "Subsystems/WorldSubsystem.h"
#include "HorizonAutopilotSubsystem.generated.h"

USTRUCT(BlueprintType)
struct FHorizonAutopilotProfile
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadOnly)
    int32 QualityTier = 3;

    UPROPERTY(BlueprintReadOnly)
    float SmoothedFrameMs = 16.67f;

    UPROPERTY(BlueprintReadOnly)
    float NetworkRttMs = 35.0f;

    UPROPERTY(BlueprintReadOnly)
    float StreamingPressure01 = 0.0f;

    UPROPERTY(BlueprintReadOnly)
    float RecommendedCellSpanKm = 3.4f;

    UPROPERTY(BlueprintReadOnly)
    int32 MaxBuildingsPerCell = 3600;

    UPROPERTY(BlueprintReadOnly)
    int32 MaxCollidableBuildingsPerCell = 650;

    UPROPERTY(BlueprintReadOnly)
    int32 MaxBuildingPartsPerCell = 1400;

    UPROPERTY(BlueprintReadOnly)
    int32 MaxActiveInfected = 120;

    UPROPERTY(BlueprintReadOnly)
    float MovementSampleRateHz = 90.0f;

    UPROPERTY(BlueprintReadOnly)
    float MovementInterpolationSpeed = 14.0f;

    UPROPERTY(BlueprintReadOnly)
    float AnimationBudgetScale = 0.85f;

    UPROPERTY(BlueprintReadOnly)
    float WorldDetailScale = 0.9f;
};

DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(
    FHorizonAutopilotProfileChanged,
    FHorizonAutopilotProfile, Profile);

UCLASS()
class BRIDGEPOINTHORIZON_API UHorizonAutopilotSubsystem : public UTickableWorldSubsystem
{
    GENERATED_BODY()

public:
    virtual void Initialize(FSubsystemCollectionBase& Collection) override;
    virtual void Deinitialize() override;
    virtual void Tick(float DeltaTime) override;
    virtual TStatId GetStatId() const override;
    virtual bool DoesSupportWorldType(EWorldType::Type WorldType) const override;

    UPROPERTY(BlueprintAssignable)
    FHorizonAutopilotProfileChanged OnProfileChanged;

    UFUNCTION(BlueprintPure, Category="Horizon|Autopilot")
    FHorizonAutopilotProfile GetProfile() const { return Profile; }

    UFUNCTION(BlueprintCallable, Category="Horizon|Autopilot")
    void ReportNetworkRttMs(float InRttMs);

    UFUNCTION(BlueprintCallable, Category="Horizon|Autopilot")
    void ReportStreamingPressure(float InPressure01);

    UFUNCTION(BlueprintCallable, Category="Horizon|Autopilot")
    void ReportCameraSpeedMps(float InSpeedMps);

    UFUNCTION(BlueprintCallable, Category="Horizon|Autopilot")
    void ForceQualityTier(int32 InTier);

private:
    FHorizonAutopilotProfile Profile;

    float SmoothedFrameMs = 16.67f;
    float NetworkRttMs = 35.0f;
    float StreamingPressure01 = 0.0f;
    float CameraSpeedMps = 0.0f;
    float SampleAccumulator = 0.0f;
    float GoodSeconds = 0.0f;
    float BadSeconds = 0.0f;
    int32 HitchSamples = 0;
    int32 TotalSamples = 0;
    int32 QualityTier = 3;
    bool bTierForced = false;

    void RecalculateProfile();
    void ApplyRenderTier();
    void SetFloatCVar(const TCHAR* Name, float Value) const;
    void SetIntCVar(const TCHAR* Name, int32 Value) const;
};
