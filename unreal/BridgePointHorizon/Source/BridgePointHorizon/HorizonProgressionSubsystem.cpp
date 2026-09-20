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

    SanitizeCareerState();
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

void UHorizonProgressionSubsystem::SanitizeCareerState()
{
    if (!State)
    {
        return;
    }

    State->CareerXP = FMath::Clamp(State->CareerXP, 0, (MaxCareerLevel - 1) * CareerXPPerLevel);
    State->CareerLevel = FMath::Clamp(1 + State->CareerXP / CareerXPPerLevel, 1, MaxCareerLevel);
    State->Prestige = FMath::Clamp(State->Prestige, 0, MaxPrestige);
    State->LifetimeKills = FMath::Max(0, State->LifetimeKills);

    for (int32 PrestigeLevel = 1; PrestigeLevel <= State->Prestige; ++PrestigeLevel)
    {
        const FString RewardKey =
            FString::Printf(TEXT("PRESTIGE_COSMETIC_%03d"), PrestigeLevel);
        State->CosmeticUnlocks.AddUnique(RewardKey);
        if (PrestigeLevel % 10 == 0)
        {
            State->BannerUnlocks.AddUnique(RewardKey);
        }
        else
        {
            State->BadgeUnlocks.AddUnique(RewardKey);
        }
    }

    State->BadgeUnlocks.RemoveAll(
        [](const FString& Key) { return Key.TrimStartAndEnd().IsEmpty(); });
    State->BannerUnlocks.RemoveAll(
        [](const FString& Key) { return Key.TrimStartAndEnd().IsEmpty(); });
    State->EquippedBadgeKey = CanEquipProfileCosmetic(
        EHorizonRewardType::Badge,
        State->EquippedBadgeKey,
        State->BadgeUnlocks)
        ? State->EquippedBadgeKey.TrimStartAndEnd()
        : FString();
    State->EquippedBannerKey = CanEquipProfileCosmetic(
        EHorizonRewardType::Banner,
        State->EquippedBannerKey,
        State->BannerUnlocks)
        ? State->EquippedBannerKey.TrimStartAndEnd()
        : FString();
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

void UHorizonProgressionSubsystem::AddCareerXP(int32 Amount)
{
    if (!State || Amount <= 0 || State->CareerLevel >= MaxCareerLevel)
    {
        return;
    }

    const int64 CareerCap = static_cast<int64>(MaxCareerLevel - 1) * CareerXPPerLevel;
    const int64 NewXP = static_cast<int64>(State->CareerXP) + Amount;
    State->CareerXP = static_cast<int32>(FMath::Min(NewXP, CareerCap));
    State->CareerLevel = FMath::Clamp(1 + State->CareerXP / CareerXPPerLevel, 1, MaxCareerLevel);
    SaveState();
    OnCareerChanged.Broadcast(State->CareerLevel, State->Prestige);
}

void UHorizonProgressionSubsystem::RecordKill(int32 Count)
{
    if (!State || Count <= 0)
    {
        return;
    }

    const int64 NewKills = static_cast<int64>(State->LifetimeKills) + Count;
    State->LifetimeKills = static_cast<int32>(FMath::Min(NewKills, static_cast<int64>(MAX_int32)));
    SaveState();
}

bool UHorizonProgressionSubsystem::TryPrestige(FHorizonReward& OutReward)
{
    if (!CanPrestige())
    {
        return false;
    }

    ++State->Prestige;
    State->CareerXP = 0;
    State->CareerLevel = 1;

    OutReward.Type = GetPrestigeProfileRewardType(State->Prestige);
    OutReward.RewardKey = FString::Printf(TEXT("PRESTIGE_COSMETIC_%03d"), State->Prestige);
    OutReward.Amount = 1;
    OutReward.bFree = true;
    OutReward.bPremium = false;

    GrantReward(OutReward);
    SaveState();
    OnCareerChanged.Broadcast(State->CareerLevel, State->Prestige);
    return true;
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
        const FString RewardKey = Reward.RewardKey.TrimStartAndEnd();
        if (RewardKey.IsEmpty())
        {
            return;
        }

        State->CosmeticUnlocks.AddUnique(RewardKey);
        if (Reward.Type == EHorizonRewardType::Badge)
        {
            State->BadgeUnlocks.AddUnique(RewardKey);
            BroadcastProfileCosmetics();
        }
        else if (Reward.Type == EHorizonRewardType::Banner)
        {
            State->BannerUnlocks.AddUnique(RewardKey);
            BroadcastProfileCosmetics();
        }
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

EHorizonRewardType UHorizonProgressionSubsystem::GetPrestigeProfileRewardType(
    int32 PrestigeLevel)
{
    return PrestigeLevel > 0 && PrestigeLevel % 10 == 0
        ? EHorizonRewardType::Banner
        : EHorizonRewardType::Badge;
}

bool UHorizonProgressionSubsystem::CanEquipProfileCosmetic(
    EHorizonRewardType RewardType,
    const FString& RewardKey,
    const TArray<FString>& UnlockedKeys)
{
    if (RewardType != EHorizonRewardType::Badge &&
        RewardType != EHorizonRewardType::Banner)
    {
        return false;
    }

    const FString NormalizedKey = RewardKey.TrimStartAndEnd();
    return !NormalizedKey.IsEmpty() && UnlockedKeys.Contains(NormalizedKey);
}

bool UHorizonProgressionSubsystem::TryEquipProfileCosmetic(
    EHorizonRewardType RewardType,
    const FString& RewardKey)
{
    if (!State)
    {
        return false;
    }

    const TArray<FString>* UnlockedKeys = nullptr;
    FString* EquippedKey = nullptr;
    if (RewardType == EHorizonRewardType::Badge)
    {
        UnlockedKeys = &State->BadgeUnlocks;
        EquippedKey = &State->EquippedBadgeKey;
    }
    else if (RewardType == EHorizonRewardType::Banner)
    {
        UnlockedKeys = &State->BannerUnlocks;
        EquippedKey = &State->EquippedBannerKey;
    }
    else
    {
        return false;
    }

    const FString NormalizedKey = RewardKey.TrimStartAndEnd();
    if (!CanEquipProfileCosmetic(RewardType, NormalizedKey, *UnlockedKeys))
    {
        return false;
    }
    if (*EquippedKey == NormalizedKey)
    {
        return true;
    }

    *EquippedKey = NormalizedKey;
    SaveState();
    BroadcastProfileCosmetics();
    return true;
}

bool UHorizonProgressionSubsystem::TryEquipProfileBadge(const FString& RewardKey)
{
    return TryEquipProfileCosmetic(EHorizonRewardType::Badge, RewardKey);
}

bool UHorizonProgressionSubsystem::TryEquipProfileBanner(const FString& RewardKey)
{
    return TryEquipProfileCosmetic(EHorizonRewardType::Banner, RewardKey);
}

FHorizonProfileCosmetics UHorizonProgressionSubsystem::GetProfileCosmetics() const
{
    FHorizonProfileCosmetics Profile;
    if (State)
    {
        Profile.EquippedBadgeKey = State->EquippedBadgeKey;
        Profile.EquippedBannerKey = State->EquippedBannerKey;
        Profile.UnlockedBadgeCount = State->BadgeUnlocks.Num();
        Profile.UnlockedBannerCount = State->BannerUnlocks.Num();
    }
    return Profile;
}

TArray<FString> UHorizonProgressionSubsystem::GetUnlockedBadges() const
{
    return State ? State->BadgeUnlocks : TArray<FString>();
}

TArray<FString> UHorizonProgressionSubsystem::GetUnlockedBanners() const
{
    return State ? State->BannerUnlocks : TArray<FString>();
}

bool UHorizonProgressionSubsystem::IsProfileCosmeticUnlocked(
    EHorizonRewardType RewardType,
    const FString& RewardKey) const
{
    if (!State)
    {
        return false;
    }

    if (RewardType == EHorizonRewardType::Badge)
    {
        return CanEquipProfileCosmetic(
            RewardType, RewardKey, State->BadgeUnlocks);
    }
    if (RewardType == EHorizonRewardType::Banner)
    {
        return CanEquipProfileCosmetic(
            RewardType, RewardKey, State->BannerUnlocks);
    }
    return false;
}

void UHorizonProgressionSubsystem::BroadcastProfileCosmetics()
{
    OnProfileCosmeticsChanged.Broadcast(GetProfileCosmetics());
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

int32 UHorizonProgressionSubsystem::GetCareerLevel() const
{
    return State ? State->CareerLevel : 1;
}

int32 UHorizonProgressionSubsystem::GetCareerXP() const
{
    return State ? State->CareerXP : 0;
}

int32 UHorizonProgressionSubsystem::GetPrestige() const
{
    return State ? State->Prestige : 0;
}

int32 UHorizonProgressionSubsystem::GetLifetimeKills() const
{
    return State ? State->LifetimeKills : 0;
}

bool UHorizonProgressionSubsystem::CanPrestige() const
{
    return State
        && State->CareerLevel >= MaxCareerLevel
        && State->Prestige < MaxPrestige;
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
