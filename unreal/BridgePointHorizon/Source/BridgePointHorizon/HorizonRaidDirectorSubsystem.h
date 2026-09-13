#pragma once

#include "CoreMinimal.h"
#include "Subsystems/GameInstanceSubsystem.h"
#include "HorizonRaidDirectorSubsystem.generated.h"

UENUM(BlueprintType)
enum class EHorizonRaidObjective : uint8
{
    RestorePower,
    RescueNPC,
    RetrieveCache,
    DestroyNest,
    HoldPosition,
    EscortSurvivor,
    KillElite,
    Extract
};

USTRUCT(BlueprintType)
struct FHorizonRaidStage
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadOnly)
    EHorizonRaidObjective Objective = EHorizonRaidObjective::RestorePower;

    UPROPERTY(BlueprintReadOnly)
    FString Title;

    UPROPERTY(BlueprintReadOnly)
    int32 TargetCount = 1;

    UPROPERTY(BlueprintReadOnly)
    float TimeLimitSeconds = 0.0f;

    UPROPERTY(BlueprintReadOnly)
    bool bBossStage = false;
};

USTRUCT(BlueprintType)
struct FHorizonRaidMission
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadOnly)
    FString MissionId;

    UPROPERTY(BlueprintReadOnly)
    int32 PartySize = 1;

    UPROPERTY(BlueprintReadOnly)
    int32 MissionDepth = 1;

    UPROPERTY(BlueprintReadOnly)
    float Difficulty = 1.0f;

    UPROPERTY(BlueprintReadOnly)
    int32 RewardSalvage = 100;

    UPROPERTY(BlueprintReadOnly)
    TArray<FHorizonRaidStage> Stages;
};

DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FHorizonRaidStageChanged, int32, StageIndex, const FHorizonRaidStage&, Stage);
DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FHorizonRaidCompleted, const FHorizonRaidMission&, Mission);

UCLASS()
class BRIDGEPOINTHORIZON_API UHorizonRaidDirectorSubsystem : public UGameInstanceSubsystem
{
    GENERATED_BODY()

public:
    UPROPERTY(BlueprintAssignable)
    FHorizonRaidStageChanged OnRaidStageChanged;

    UPROPERTY(BlueprintAssignable)
    FHorizonRaidCompleted OnRaidCompleted;

    UFUNCTION(BlueprintCallable, Category="Horizon|Raid")
    FHorizonRaidMission BuildMission(int32 PartySize, int32 MissionDepth, int32 Seed) const;

    UFUNCTION(BlueprintCallable, Category="Horizon|Raid")
    void StartMission(const FHorizonRaidMission& Mission);

    UFUNCTION(BlueprintCallable, Category="Horizon|Raid")
    bool AddObjectiveProgress(int32 Amount = 1);

    UFUNCTION(BlueprintPure, Category="Horizon|Raid")
    bool HasActiveMission() const { return bMissionActive; }

    UFUNCTION(BlueprintPure, Category="Horizon|Raid")
    int32 GetCurrentStageIndex() const { return CurrentStageIndex; }

    UFUNCTION(BlueprintPure, Category="Horizon|Raid")
    int32 GetCurrentProgress() const { return CurrentProgress; }

    UFUNCTION(BlueprintPure, Category="Horizon|Raid")
    FHorizonRaidMission GetActiveMission() const { return ActiveMission; }

    UFUNCTION(BlueprintPure, Category="Horizon|Raid")
    float GetEnemyCountMultiplier() const;

    UFUNCTION(BlueprintPure, Category="Horizon|Raid")
    float GetBossHealthMultiplier() const;

private:
    UPROPERTY()
    FHorizonRaidMission ActiveMission;

    bool bMissionActive = false;
    int32 CurrentStageIndex = INDEX_NONE;
    int32 CurrentProgress = 0;

    FHorizonRaidStage MakeStage(EHorizonRaidObjective Objective, int32 PartySize, int32 Depth) const;
};
