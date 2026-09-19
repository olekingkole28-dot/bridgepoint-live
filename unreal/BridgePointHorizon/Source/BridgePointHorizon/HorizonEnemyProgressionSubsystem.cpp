#include "HorizonEnemyProgressionSubsystem.h"

#include "Kismet/GameplayStatics.h"

const TCHAR* UHorizonEnemyProgressionSubsystem::SaveSlot =
    TEXT("BridgePointHorizonEnemyProgression");

void UHorizonEnemyProgressionSubsystem::Initialize(FSubsystemCollectionBase& Collection)
{
    Super::Initialize(Collection);

    if (USaveGame* Loaded = UGameplayStatics::LoadGameFromSlot(SaveSlot, 0))
    {
        State = Cast<UHorizonEnemyProgressionSaveGame>(Loaded);
    }

    if (!State)
    {
        State = Cast<UHorizonEnemyProgressionSaveGame>(
            UGameplayStatics::CreateSaveGameObject(
                UHorizonEnemyProgressionSaveGame::StaticClass()));
        SaveState();
    }

    State->WorldThreat01 = FMath::Clamp(State->WorldThreat01, 0.0f, 1.0f);
    State->EncountersCompleted = FMath::Max(0, State->EncountersCompleted);
    State->EncounterWins = FMath::Clamp(State->EncounterWins, 0, State->EncountersCompleted);
    State->EncounterLosses = FMath::Clamp(State->EncounterLosses, 0, State->EncountersCompleted);
}

FHorizonEnemyTierProfile UHorizonEnemyProgressionSubsystem::BuildTierProfile(
    const FHorizonEnemyProgressionContext& Context)
{
    const int32 Players = FMath::Clamp(Context.PlayerCount, 1, 4);
    const float Career01 = FMath::Clamp((Context.AverageCareerLevel - 1.0f) / 99.0f, 0.0f, 1.0f);
    const float Prestige01 = FMath::Clamp(Context.AveragePrestige / 100.0f, 0.0f, 1.0f);
    const float Gear01 = FMath::Clamp(Context.AverageGearScore / 100.0f, 0.0f, 1.0f);
    const float WinRate01 = FMath::Clamp(Context.RecentWinRate01, 0.0f, 1.0f);
    const float Threat01 = FMath::Clamp(Context.WorldThreat01, 0.0f, 1.0f);

    // Capability raises pressure gradually. Prestige is intentionally capped at
    // a small share so long-term players are never trapped by runaway scaling.
    const float PartyPressure = static_cast<float>(Players - 1) * 0.24f;
    const float CapabilityPressure = Career01 * 0.28f + Prestige01 * 0.12f + Gear01 * 0.18f;
    const float ThreatPressure = Threat01 * 0.30f;

    // Recent losses create recovery space; repeated success increases tension.
    // This is bounded and does not change progression rewards or matchmaking.
    const float PerformanceAdjustment = FMath::Clamp(
        (WinRate01 - 0.5f) * 0.40f,
        -0.20f,
        0.20f);

    FHorizonEnemyTierProfile Result;
    Result.DifficultyScalar = FMath::Clamp(
        1.0f + PartyPressure + CapabilityPressure + ThreatPressure + PerformanceAdjustment,
        0.75f,
        2.25f);
    Result.HealthMultiplier = FMath::Clamp(
        0.80f + Result.DifficultyScalar * 0.28f,
        1.0f,
        1.42f);
    Result.DamageMultiplier = FMath::Clamp(
        0.84f + Result.DifficultyScalar * 0.22f,
        1.0f,
        1.34f);
    Result.SpeedMultiplier = FMath::Clamp(
        0.94f + Result.DifficultyScalar * 0.07f,
        1.0f,
        1.10f);
    Result.EncounterBudget = FMath::Clamp(
        FMath::RoundToInt(7.0f + Result.DifficultyScalar * 6.0f + (Players - 1) * 4.0f),
        8,
        36);
    Result.MaxSpecialInfected = FMath::Clamp(
        FMath::FloorToInt((Result.DifficultyScalar - 0.75f) * 2.25f) + Players - 1,
        0,
        6);
    Result.LootQualityBias = FMath::Clamp(
        (Result.DifficultyScalar - 1.0f) * 0.16f,
        0.0f,
        0.20f);
    Result.bBossEligible = Players >= 2 && Result.DifficultyScalar >= 1.55f && Threat01 >= 0.55f;
    return Result;
}

FHorizonEnemyTierProfile UHorizonEnemyProgressionSubsystem::EvaluateEncounter(
    const FHorizonEnemyProgressionContext& Context) const
{
    FHorizonEnemyProgressionContext RuntimeContext = Context;
    RuntimeContext.WorldThreat01 = GetWorldThreat01();
    return BuildTierProfile(RuntimeContext);
}

float UHorizonEnemyProgressionSubsystem::ComputeNextWorldThreat(
    float CurrentThreat01,
    bool bPlayersWon,
    float CompletionQuality01)
{
    const float Current = FMath::Clamp(CurrentThreat01, 0.0f, 1.0f);
    const float Quality = FMath::Clamp(CompletionQuality01, 0.0f, 1.0f);
    const float Delta = bPlayersWon
        ? 0.025f + Quality * 0.035f
        : -(0.055f + (1.0f - Quality) * 0.045f);
    return FMath::Clamp(Current + Delta, 0.0f, 1.0f);
}

float UHorizonEnemyProgressionSubsystem::RecordEncounterOutcome(
    bool bPlayersWon,
    float CompletionQuality01)
{
    if (!State)
    {
        return 0.0f;
    }

    State->WorldThreat01 = ComputeNextWorldThreat(
        State->WorldThreat01,
        bPlayersWon,
        CompletionQuality01);
    ++State->EncountersCompleted;
    if (bPlayersWon)
    {
        ++State->EncounterWins;
    }
    else
    {
        ++State->EncounterLosses;
    }

    SaveState();
    OnWorldThreatChanged.Broadcast(State->WorldThreat01);
    return State->WorldThreat01;
}

float UHorizonEnemyProgressionSubsystem::GetWorldThreat01() const
{
    return State ? FMath::Clamp(State->WorldThreat01, 0.0f, 1.0f) : 0.0f;
}

int32 UHorizonEnemyProgressionSubsystem::GetEncountersCompleted() const
{
    return State ? FMath::Max(0, State->EncountersCompleted) : 0;
}

void UHorizonEnemyProgressionSubsystem::SaveState()
{
    if (State)
    {
        UGameplayStatics::SaveGameToSlot(State, SaveSlot, 0);
    }
}
