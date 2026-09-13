#include "HorizonProgressionSubsystem.h"

#include "Kismet/GameplayStatics.h"

const TCHAR* UHorizonProgressionSubsystem::SaveSlot = TEXT("BridgePointHorizonProgression");

void UHorizonProgressionSubsystem::Initialize(FSubsystemCollectionBase& Collection)
{
    Super::Initialize(Collection);

    if (USaveGame* Loaded = UGameplayStatics::LoadGameFromSlot(SaveSlot, 0))
    {
        State = Cast<UHorizonProgressionSaveGame>(Loaded);
    }

    if (!State)
    {
        State = Cast<UHorizonProgressionSaveGame>(
            UGameplayStatics::CreateSaveGameObject(UHorizonProgressionSaveGame::StaticClass()));
    }

    EnsureSeason(FDateTime::UtcNow());
}

FString UHorizonProgressionSubsystem::MakeSeasonKey(FDateTime NowUtc) const
{
    return FString::Printf(TEXT("%04d-%02d"), NowUtc.GetYear(), NowUtc.GetMonth());
}

FString UHorizonProgressionSubsystem::MakeDailyKey(FDateTime NowUtc) const
{
    return FString::Printf(
        TEXT("%04d-%02d-%02d"),
        NowUtc.GetYear(),
        NowUtc.GetMonth(),
        NowUtc.GetDay());
}

void UHorizonProgressionSubsystem::EnsureSeason(FDateTime NowUtc)
{
    if (!State)
    {
        return;
    }

    const FString NewSeason = MakeSeasonKey(NowUtc);
    if (State->SeasonKey == NewSeason)
    {
        return;
    }

    State->SeasonKey = NewSeason;
    State->SeasonXP = 0;
    State->SeasonLevel = 0;
    State->bPremiumPassEntitled = false;
    SaveState();
}

void UHorizonProgressionSubsystem::SaveState()
{
    if (State)
    {
        UGameplayStatics::SaveGameToSlot(State, SaveSlot, 0);
    }
}

void UHorizonProgressionSubsystem::AddXP(int32 Amount, FDateTime NowUtc)
{
    if (!State || Amount <= 0)
    {
        return;
    }

    EnsureSeason(NowUtc);

    const int32 PreviousLevel = State->SeasonLevel;
    State->SeasonXP = FMath::Max(0, State->SeasonXP + Amount);
    State->SeasonLevel = FMath::Clamp(State->SeasonXP / XPPerLevel, 0, MaxLevel);

    for (int32 Level = PreviousLevel + 1; Level <= State->SeasonLevel; ++Level)
    {
        GrantReward(GetLevelReward(Level, false));

        if (State->bPremiumPassEntitled)
        {
            GrantReward(GetLevelReward(Level, true));
        }
    }

    SaveState();
    OnProgressionChanged.Broadcast(State->SeasonLevel, State->SeasonXP);
}

FHorizonReward UHorizonProgressionSubsystem::PreviewDailyFreeReward(FDateTime NowUtc) const
{
    FHorizonReward Reward;
    Reward.bFree = true;
    Reward.bPremium = false;

    const int32 Day = NowUtc.GetDay();

    if (Day == 1)
    {
        Reward.Type = EHorizonRewardType::Character;
        Reward.RewardKey = FString::Printf(TEXT("FREE_MONTHLY_SURVIVOR_%04d_%02d"), NowUtc.GetYear(), NowUtc.GetMonth());
        Reward.Amount = 1;
    }
    else if (Day % 14 == 0)
    {
        Reward.Type = EHorizonRewardType::Emote;
        Reward.RewardKey = FString::Printf(TEXT("FREE_EMOTE_%04d_%02d_%02d"), NowUtc.GetYear(), NowUtc.GetMonth(), Day);
        Reward.Amount = 1;
    }
    else if (Day % 7 == 0)
    {
        Reward.Type = EHorizonRewardType::WeaponWrap;
        Reward.RewardKey = FString::Printf(TEXT("FREE_WRAP_%04d_%02d_%02d"), NowUtc.GetYear(), NowUtc.GetMonth(), Day);
        Reward.Amount = 1;
    }
    else
    {
        Reward.Type = EHorizonRewardType::Salvage;
        Reward.RewardKey = TEXT("DAILY_SALVAGE");
        Reward.Amount = 40 + (Day % 10) * 5;
    }

    return Reward;
}

bool UHorizonProgressionSubsystem::ClaimDailyFreeReward(FDateTime NowUtc, FHorizonReward& OutReward)
{
    if (!State)
    {
        return false;
    }

    EnsureSeason(NowUtc);
    const FString DailyKey = MakeDailyKey(NowUtc);

    if (State->ClaimedDailyKeys.Contains(DailyKey))
    {
        return false;
    }

    OutReward = PreviewDailyFreeReward(NowUtc);
    State->ClaimedDailyKeys.Add(DailyKey);
    GrantReward(OutReward);
    SaveState();
    return true;
}

FHorizonReward UHorizonProgressionSubsystem::GetLevelReward(int32 Level, bool bPremiumTrack) const
{
    FHorizonReward Reward;
    Level = FMath::Clamp(Level, 1, MaxLevel);
    Reward.bFree = !bPremiumTrack;
    Reward.bPremium = bPremiumTrack;

    if (bPremiumTrack)
    {
        if (Level == 150)
        {
            Reward.Type = EHorizonRewardType::Character;
            Reward.RewardKey = TEXT("HORIZON_LEGEND_CHARACTER");
        }
        else if (Level >= 140 && Level % 2 == 0)
        {
            Reward.Type = EHorizonRewardType::Cosmetic;
            Reward.RewardKey = FString::Printf(TEXT("LEGENDARY_COSMETIC_%03d"), Level);
        }
        else if (Level % 25 == 0)
        {
            Reward.Type = EHorizonRewardType::Character;
            Reward.RewardKey = FString::Printf(TEXT("PREMIUM_CHARACTER_%03d"), Level);
        }
        else if (Level % 10 == 0)
        {
            Reward.Type = EHorizonRewardType::Emote;
            Reward.RewardKey = FString::Printf(TEXT("PREMIUM_EMOTE_%03d"), Level);
        }
        else
        {
            Reward.Type = EHorizonRewardType::WeaponWrap;
            Reward.RewardKey = FString::Printf(TEXT("PREMIUM_WRAP_%03d"), Level);
        }
        return Reward;
    }

    if (Level % 30 == 0)
    {
        Reward.Type = EHorizonRewardType::Spray;
        Reward.RewardKey = FString::Printf(TEXT("FREE_SPRAY_%03d"), Level);
    }
    else if (Level % 15 == 0)
    {
        Reward.Type = EHorizonRewardType::Blueprint;
        Reward.RewardKey = FString::Printf(TEXT("FREE_BLUEPRINT_%03d"), Level);
    }
    else if (Level % 5 == 0)
    {
        Reward.Type = EHorizonRewardType::WeaponWrap;
        Reward.RewardKey = FString::Printf(TEXT("FREE_WRAP_%03d"), Level);
    }
    else
    {
        Reward.Type = EHorizonRewardType::Salvage;
        Reward.RewardKey = TEXT("SEASON_SALVAGE");
        Reward.Amount = 25 + Level * 2;
    }

    return Reward;
}

void UHorizonProgressionSubsystem::GrantReward(const FHorizonReward& Reward)
{
    if (!State)
    {
        return;
    }

    if (Reward.Type == EHorizonRewardType::Salvage)
    {
        State->Salvage += FMath::Max(0, Reward.Amount);
        return;
    }

    if (!Reward.RewardKey.IsEmpty())
    {
        State->CosmeticUnlocks.AddUnique(Reward.RewardKey);
    }
}

void UHorizonProgressionSubsystem::GrantFreeSalvage(int32 Amount)
{
    if (!State || Amount <= 0)
    {
        return;
    }

    State->Salvage += Amount;
    SaveState();
}

bool UHorizonProgressionSubsystem::GrantFreeUnlock(const FString& RewardKey)
{
    if (!State || RewardKey.IsEmpty())
    {
        return false;
    }

    const int32 PreviousCount = State->CosmeticUnlocks.Num();
    State->CosmeticUnlocks.AddUnique(RewardKey);

    if (State->CosmeticUnlocks.Num() != PreviousCount)
    {
        SaveState();
        return true;
    }

    return false;
}

void UHorizonProgressionSubsystem::SetPremiumPassEntitled(bool bEntitled)
{
    if (!State)
    {
        return;
    }

    // Entitlement is intentionally external. No payment provider is contacted here.
    State->bPremiumPassEntitled = bEntitled;
    SaveState();
}

int32 UHorizonProgressionSubsystem::GetLevel() const
{
    return State ? State->SeasonLevel : 0;
}

int32 UHorizonProgressionSubsystem::GetXP() const
{
    return State ? State->SeasonXP : 0;
}

int32 UHorizonProgressionSubsystem::GetSalvage() const
{
    return State ? State->Salvage : 0;
}

bool UHorizonProgressionSubsystem::HasPremiumPass() const
{
    return State ? State->bPremiumPassEntitled : false;
}

FString UHorizonProgressionSubsystem::GetCurrentSeasonKey() const
{
    return State ? State->SeasonKey : FString();
}
