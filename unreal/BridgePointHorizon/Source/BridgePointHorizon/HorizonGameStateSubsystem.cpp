#include "HorizonGameStateSubsystem.h"

#include "Kismet/GameplayStatics.h"

const TCHAR* UHorizonGameStateSubsystem::YearOneSaveSlot = TEXT("BridgePointHorizonYearOne");

void UHorizonGameStateSubsystem::Initialize(FSubsystemCollectionBase& Collection)
{
    Super::Initialize(Collection);

    CurrentMode = EHorizonGameMode::YearOneSurvival;
    YearOne.bStarted = false;
    YearOne.DurationDays = 365;
    YearOne.LivesRemaining = 3;
    YearOne.bEliminated = false;

    LoadYearOneState();
}

void UHorizonGameStateSubsystem::LoadYearOneState()
{
    PersistedYearOne = nullptr;

    if (USaveGame* Loaded = UGameplayStatics::LoadGameFromSlot(YearOneSaveSlot, 0))
    {
        PersistedYearOne = Cast<UHorizonYearOneSaveGame>(Loaded);
    }

    if (!PersistedYearOne)
    {
        PersistedYearOne = Cast<UHorizonYearOneSaveGame>(
            UGameplayStatics::CreateSaveGameObject(UHorizonYearOneSaveGame::StaticClass()));
        return;
    }

    YearOne.bStarted = PersistedYearOne->bStarted;
    YearOne.StartUtc = PersistedYearOne->StartUtc;
    YearOne.DurationDays = 365;
    YearOne.LivesRemaining = FMath::Clamp(PersistedYearOne->LivesRemaining, 0, 3);
    YearOne.bEliminated = PersistedYearOne->bEliminated || YearOne.LivesRemaining <= 0;

    if (YearOne.bStarted && !YearOne.StartUtc.GetTicks())
    {
        // Refuse to revive a malformed event-start record.
        YearOne.bStarted = false;
        YearOne.LivesRemaining = 3;
        YearOne.bEliminated = false;
    }
}

void UHorizonGameStateSubsystem::SaveYearOneState()
{
    if (!PersistedYearOne)
    {
        PersistedYearOne = Cast<UHorizonYearOneSaveGame>(
            UGameplayStatics::CreateSaveGameObject(UHorizonYearOneSaveGame::StaticClass()));
    }

    if (!PersistedYearOne)
    {
        return;
    }

    PersistedYearOne->bStarted = YearOne.bStarted;
    PersistedYearOne->StartUtc = YearOne.StartUtc;
    PersistedYearOne->DurationDays = 365;
    PersistedYearOne->LivesRemaining = FMath::Clamp(YearOne.LivesRemaining, 0, 3);
    PersistedYearOne->bEliminated = YearOne.bEliminated;

    UGameplayStatics::SaveGameToSlot(PersistedYearOne, YearOneSaveSlot, 0);
}

FHorizonModeRules UHorizonGameStateSubsystem::GetModeRules(EHorizonGameMode Mode) const
{
    FHorizonModeRules Rules;
    Rules.Mode = Mode;

    switch (Mode)
    {
        case EHorizonGameMode::YearOneSurvival:
            Rules.MinPartySize = 1;
            Rules.MaxPartySize = 1;
            Rules.bFriendInvitesAllowed = false;
            Rules.bProximityVoice = false;
            Rules.bTeamOrPartyVoice = false;
            Rules.bRespawns = YearOne.bStarted ? (YearOne.LivesRemaining > 0) : true;
            Rules.bConsumesYearOneLives = YearOne.bStarted;
            break;

        case EHorizonGameMode::InfiniteTDM:
            Rules.MinPartySize = 2;
            Rules.MaxPartySize = 4;
            Rules.bFriendInvitesAllowed = true;
            Rules.bProximityVoice = true;
            Rules.bTeamOrPartyVoice = true;
            Rules.bRespawns = true;
            Rules.bConsumesYearOneLives = false;
            break;

        case EHorizonGameMode::OutbreakRaid:
            Rules.MinPartySize = 1;
            Rules.MaxPartySize = 4;
            Rules.bFriendInvitesAllowed = true;
            Rules.bProximityVoice = true;
            Rules.bTeamOrPartyVoice = true;
            Rules.bRespawns = true;
            Rules.bConsumesYearOneLives = false;
            break;
    }

    return Rules;
}

FHorizonModeRules UHorizonGameStateSubsystem::GetCurrentModeRules() const
{
    return GetModeRules(CurrentMode);
}

void UHorizonGameStateSubsystem::SetCurrentMode(EHorizonGameMode NewMode)
{
    if (CurrentMode == NewMode)
    {
        return;
    }

    CurrentMode = NewMode;
    OnModeChanged.Broadcast(CurrentMode);
}

bool UHorizonGameStateSubsystem::CanInviteFriends() const
{
    return GetCurrentModeRules().bFriendInvitesAllowed;
}

int32 UHorizonGameStateSubsystem::GetMaxPartySize() const
{
    return GetCurrentModeRules().MaxPartySize;
}

bool UHorizonGameStateSubsystem::StartYearOneEvent(FDateTime StartUtc)
{
    // Hard owner gate: the live year cannot start merely because UI/gameplay code calls this.
    if (!bOwnerAuthorizedYearOneStart || YearOne.bStarted || !StartUtc.GetTicks())
    {
        return false;
    }

    YearOne.bStarted = true;
    YearOne.StartUtc = StartUtc;
    YearOne.DurationDays = 365;
    YearOne.LivesRemaining = 3;
    YearOne.bEliminated = false;
    SaveYearOneState();
    OnYearOneLivesChanged.Broadcast(YearOne.LivesRemaining, false);
    return true;
}

void UHorizonGameStateSubsystem::ResetYearOneForPreseason()
{
    // Once the real event begins, gameplay code cannot silently reset the three-life state.
    if (YearOne.bStarted)
    {
        return;
    }

    YearOne = FYearOneState();
    YearOne.DurationDays = 365;
    YearOne.LivesRemaining = 3;
    SaveYearOneState();
    OnYearOneLivesChanged.Broadcast(YearOne.LivesRemaining, false);
}

int32 UHorizonGameStateSubsystem::GetYearOneDay(FDateTime NowUtc) const
{
    if (!YearOne.bStarted || NowUtc < YearOne.StartUtc)
    {
        return 0;
    }

    const FTimespan Elapsed = NowUtc - YearOne.StartUtc;
    const int32 Day = FMath::FloorToInt(Elapsed.GetTotalDays()) + 1;
    return FMath::Clamp(Day, 1, YearOne.DurationDays);
}

float UHorizonGameStateSubsystem::GetYearOneProgress01(FDateTime NowUtc) const
{
    const int32 Day = GetYearOneDay(NowUtc);
    if (Day <= 0)
    {
        return 0.0f;
    }

    return FMath::Clamp((Day - 1) / 364.0f, 0.0f, 1.0f);
}

float UHorizonGameStateSubsystem::GetZombieDifficultyScalar(FDateTime NowUtc) const
{
    const float Progress = GetYearOneProgress01(NowUtc);

    // Early game is intentionally forgiving; the final quarter becomes severe.
    const float BaseRamp = FMath::Lerp(0.72f, 1.85f, FMath::Pow(Progress, 1.35f));
    const float EndgamePressure = Progress > 0.75f
        ? FMath::GetMappedRangeValueClamped(FVector2D(0.75f, 1.0f), FVector2D(0.0f, 0.95f), Progress)
        : 0.0f;

    return BaseRamp + EndgamePressure;
}

float UHorizonGameStateSubsystem::GetZombieWallProgress01(FDateTime NowUtc) const
{
    if (!YearOne.bStarted)
    {
        return 0.0f;
    }

    // Slow for most of the year, increasingly aggressive during the last 90 days.
    const float Progress = GetYearOneProgress01(NowUtc);
    return FMath::Clamp(FMath::Pow(Progress, 1.6f), 0.0f, 1.0f);
}

bool UHorizonGameStateSubsystem::RegisterPlayerDeath()
{
    if (CurrentMode != EHorizonGameMode::YearOneSurvival || !YearOne.bStarted)
    {
        return false;
    }

    if (YearOne.bEliminated)
    {
        return true;
    }

    YearOne.LivesRemaining = FMath::Max(0, YearOne.LivesRemaining - 1);
    YearOne.bEliminated = YearOne.LivesRemaining <= 0;
    SaveYearOneState();
    OnYearOneLivesChanged.Broadcast(YearOne.LivesRemaining, YearOne.bEliminated);
    return YearOne.bEliminated;
}

void UHorizonGameStateSubsystem::RestoreYearOneLives(int32 Lives)
{
    // Preseason/dev-only reset. The live event never gives spent lives back.
    if (YearOne.bStarted)
    {
        return;
    }

    YearOne.LivesRemaining = FMath::Clamp(Lives, 0, 3);
    YearOne.bEliminated = YearOne.LivesRemaining <= 0;
    SaveYearOneState();
    OnYearOneLivesChanged.Broadcast(YearOne.LivesRemaining, YearOne.bEliminated);
}
