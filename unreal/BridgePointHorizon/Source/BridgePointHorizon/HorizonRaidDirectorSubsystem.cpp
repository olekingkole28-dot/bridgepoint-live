#include "HorizonRaidDirectorSubsystem.h"

FHorizonRaidStage UHorizonRaidDirectorSubsystem::MakeStage(
    EHorizonRaidObjective Objective,
    int32 PartySize,
    int32 Depth) const
{
    FHorizonRaidStage Stage;
    Stage.Objective = Objective;

    const int32 Party = FMath::Clamp(PartySize, 1, 4);
    const int32 DifficultyDepth = FMath::Clamp(Depth, 1, 20);

    switch (Objective)
    {
        case EHorizonRaidObjective::RestorePower:
            Stage.Title = TEXT("Restore Emergency Power");
            Stage.TargetCount = 2 + FMath::Min(2, DifficultyDepth / 4);
            break;
        case EHorizonRaidObjective::RescueNPC:
            Stage.Title = TEXT("Locate and Rescue Survivors");
            Stage.TargetCount = FMath::Clamp(1 + Party / 2, 1, 3);
            break;
        case EHorizonRaidObjective::RetrieveCache:
            Stage.Title = TEXT("Recover the Sealed Cache");
            Stage.TargetCount = 1 + FMath::Min(2, DifficultyDepth / 5);
            break;
        case EHorizonRaidObjective::DestroyNest:
            Stage.Title = TEXT("Destroy Infected Nests");
            Stage.TargetCount = 2 + Party + FMath::Min(3, DifficultyDepth / 4);
            break;
        case EHorizonRaidObjective::HoldPosition:
            Stage.Title = TEXT("Hold the Position");
            Stage.TargetCount = 1;
            Stage.TimeLimitSeconds = 60.0f + Party * 15.0f + DifficultyDepth * 3.0f;
            break;
        case EHorizonRaidObjective::EscortSurvivor:
            Stage.Title = TEXT("Escort the Survivor");
            Stage.TargetCount = 1;
            break;
        case EHorizonRaidObjective::KillElite:
            Stage.Title = TEXT("Kill the Outbreak Alpha");
            Stage.TargetCount = 1;
            Stage.bBossStage = true;
            break;
        case EHorizonRaidObjective::Extract:
            Stage.Title = TEXT("Reach Extraction");
            Stage.TargetCount = Party;
            Stage.TimeLimitSeconds = FMath::Max(55.0f, 120.0f - DifficultyDepth * 3.0f);
            break;
    }

    return Stage;
}

FHorizonRaidMission UHorizonRaidDirectorSubsystem::BuildMission(
    int32 PartySize,
    int32 MissionDepth,
    int32 Seed) const
{
    FHorizonRaidMission Mission;
    Mission.PartySize = FMath::Clamp(PartySize, 1, 4);
    Mission.MissionDepth = FMath::Clamp(MissionDepth, 1, 20);
    Mission.Difficulty =
        0.85f +
        (Mission.PartySize - 1) * 0.22f +
        (Mission.MissionDepth - 1) * 0.075f;

    FRandomStream Random(Seed);
    Mission.MissionId = FString::Printf(
        TEXT("RAID_%08X_P%d_D%d"),
        Random.GetUnsignedInt(),
        Mission.PartySize,
        Mission.MissionDepth);

    TArray<EHorizonRaidObjective> Pool = {
        EHorizonRaidObjective::RestorePower,
        EHorizonRaidObjective::RescueNPC,
        EHorizonRaidObjective::RetrieveCache,
        EHorizonRaidObjective::DestroyNest,
        EHorizonRaidObjective::HoldPosition,
        EHorizonRaidObjective::EscortSurvivor
    };

    const int32 CoreStageCount = Mission.MissionDepth >= 8 ? 4 : 3;
    for (int32 Index = 0; Index < CoreStageCount; ++Index)
    {
        const int32 Pick = Random.RandRange(0, Pool.Num() - 1);
        Mission.Stages.Add(MakeStage(Pool[Pick], Mission.PartySize, Mission.MissionDepth));
        Pool.RemoveAt(Pick);

        if (Pool.IsEmpty())
        {
            break;
        }
    }

    // Deep raids always culminate in an elite/boss before extraction.
    if (Mission.MissionDepth >= 3)
    {
        Mission.Stages.Add(MakeStage(
            EHorizonRaidObjective::KillElite,
            Mission.PartySize,
            Mission.MissionDepth));
    }

    Mission.Stages.Add(MakeStage(
        EHorizonRaidObjective::Extract,
        Mission.PartySize,
        Mission.MissionDepth));

    Mission.RewardSalvage = FMath::RoundToInt(
        110.0f *
        Mission.Difficulty *
        (1.0f + (Mission.Stages.Num() - 3) * 0.18f));

    return Mission;
}

void UHorizonRaidDirectorSubsystem::StartMission(const FHorizonRaidMission& Mission)
{
    ActiveMission = Mission;
    bMissionActive = !ActiveMission.Stages.IsEmpty();
    CurrentStageIndex = bMissionActive ? 0 : INDEX_NONE;
    CurrentProgress = 0;

    if (bMissionActive)
    {
        OnRaidStageChanged.Broadcast(CurrentStageIndex, ActiveMission.Stages[CurrentStageIndex]);
    }
}

bool UHorizonRaidDirectorSubsystem::AddObjectiveProgress(int32 Amount)
{
    if (!bMissionActive || CurrentStageIndex == INDEX_NONE || Amount <= 0)
    {
        return false;
    }

    const FHorizonRaidStage& Stage = ActiveMission.Stages[CurrentStageIndex];
    CurrentProgress += Amount;

    if (CurrentProgress < Stage.TargetCount)
    {
        return false;
    }

    ++CurrentStageIndex;
    CurrentProgress = 0;

    if (CurrentStageIndex >= ActiveMission.Stages.Num())
    {
        bMissionActive = false;
        CurrentStageIndex = INDEX_NONE;
        OnRaidCompleted.Broadcast(ActiveMission);
        return true;
    }

    OnRaidStageChanged.Broadcast(CurrentStageIndex, ActiveMission.Stages[CurrentStageIndex]);
    return true;
}

float UHorizonRaidDirectorSubsystem::GetEnemyCountMultiplier() const
{
    return bMissionActive
        ? FMath::Clamp(ActiveMission.Difficulty, 0.8f, 3.2f)
        : 1.0f;
}

float UHorizonRaidDirectorSubsystem::GetBossHealthMultiplier() const
{
    if (!bMissionActive)
    {
        return 1.0f;
    }

    return FMath::Clamp(
        1.0f +
        (ActiveMission.PartySize - 1) * 0.45f +
        (ActiveMission.MissionDepth - 1) * 0.10f,
        1.0f,
        4.5f);
}
