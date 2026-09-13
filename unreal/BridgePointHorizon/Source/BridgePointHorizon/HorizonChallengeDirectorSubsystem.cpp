#include "HorizonChallengeDirectorSubsystem.h"

#include "Engine/GameInstance.h"
#include "HorizonProgressionSubsystem.h"
#include "Kismet/GameplayStatics.h"

const TCHAR* UHorizonChallengeDirectorSubsystem::SaveSlot = TEXT("BridgePointHorizonChallenges");

void UHorizonChallengeDirectorSubsystem::Initialize(FSubsystemCollectionBase& Collection)
{
    Super::Initialize(Collection);

    if (USaveGame* Loaded = UGameplayStatics::LoadGameFromSlot(SaveSlot, 0))
    {
        State = Cast<UHorizonChallengeSaveGame>(Loaded);
    }

    if (!State)
    {
        State = Cast<UHorizonChallengeSaveGame>(
            UGameplayStatics::CreateSaveGameObject(UHorizonChallengeSaveGame::StaticClass()));
        SaveState();
    }
}

FHorizonChallengeDefinition UHorizonChallengeDirectorSubsystem::GetDefaultChallenge(
    EHorizonChallengeNPCRole Role) const
{
    FHorizonChallengeDefinition Definition;
    Definition.Role = Role;
    Definition.Reward.bFreeReward = true;
    Definition.Reward.Kind = EHorizonChallengeRewardKind::SurvivalItem;

    switch (Role)
    {
        case EHorizonChallengeNPCRole::FieldMedic:
            Definition.Type = EHorizonChallengeType::HealOrRescue;
            Definition.Title = TEXT("Bring Them Back");
            Definition.TargetCount = 3;
            Definition.Reward.RewardKey = TEXT("FIRST_AID_KIT");
            Definition.Reward.Amount = 2;
            break;

        case EHorizonChallengeNPCRole::Quartermaster:
            Definition.Type = EHorizonChallengeType::EliminateInfected;
            Definition.Title = TEXT("Thin the Block");
            Definition.TargetCount = 25;
            Definition.Reward.RewardKey = TEXT("AMMO_CACHE");
            Definition.Reward.Amount = 1;
            Definition.Reward.Salvage = 80;
            break;

        case EHorizonChallengeNPCRole::Ranger:
            Definition.Type = EHorizonChallengeType::HuntOrGather;
            Definition.Title = TEXT("Live Off the Land");
            Definition.TargetCount = 5;
            Definition.Reward.RewardKey = TEXT("SURVIVAL_CACHE");
            Definition.Reward.Amount = 1;
            break;

        case EHorizonChallengeNPCRole::Mechanic:
            Definition.Type = EHorizonChallengeType::RepairVehicle;
            Definition.Title = TEXT("Get It Running");
            Definition.TargetCount = 1;
            Definition.Reward.RewardKey = TEXT("VEHICLE_PART_CACHE");
            Definition.Reward.Amount = 1;
            Definition.Reward.Salvage = 60;
            break;

        case EHorizonChallengeNPCRole::RooftopScout:
            Definition.Type = EHorizonChallengeType::ReachRooftop;
            Definition.Title = TEXT("High Ground");
            Definition.TargetCount = 3;
            Definition.Reward.RewardKey = TEXT("SCOUT_SPRAY");
            Definition.Reward.Amount = 1;
            Definition.Reward.Kind = EHorizonChallengeRewardKind::Cosmetic;
            break;
    }

    return Definition;
}

float UHorizonChallengeDirectorSubsystem::ScoreSiteForRole(
    EHorizonChallengeNPCRole Role,
    const FHorizonNPCSiteCandidate& Site) const
{
    const float Access = FMath::Clamp(Site.PedestrianAccess, 0.0f, 1.0f);
    const float Danger = FMath::Clamp(Site.LocalDanger, 0.0f, 1.0f);

    float Affinity = 0.0f;
    switch (Role)
    {
        case EHorizonChallengeNPCRole::FieldMedic:
            Affinity = Site.HospitalAffinity * 0.78f + Site.PublicSafetyAffinity * 0.22f;
            break;
        case EHorizonChallengeNPCRole::Quartermaster:
            Affinity = Site.PublicSafetyAffinity * 0.72f + Site.GarageIndustrialAffinity * 0.28f;
            break;
        case EHorizonChallengeNPCRole::Ranger:
            Affinity = Site.WildernessAffinity;
            break;
        case EHorizonChallengeNPCRole::Mechanic:
            Affinity = Site.GarageIndustrialAffinity * 0.86f + Site.PublicSafetyAffinity * 0.14f;
            break;
        case EHorizonChallengeNPCRole::RooftopScout:
            Affinity = Site.RooftopAffinity * 0.88f + Access * 0.12f;
            break;
    }

    // Strategic NPCs should feel earned to reach, but not spawn in suicidal positions.
    const float DesiredDanger = Role == EHorizonChallengeNPCRole::RooftopScout ? 0.48f : 0.34f;
    const float DangerFit = 1.0f - FMath::Clamp(FMath::Abs(Danger - DesiredDanger), 0.0f, 1.0f);

    return FMath::Clamp(
        Affinity * 0.68f +
        Access * 0.17f +
        DangerFit * 0.15f,
        0.0f,
        1.0f);
}

FHorizonNPCSiteCandidate UHorizonChallengeDirectorSubsystem::PickStrategicSite(
    EHorizonChallengeNPCRole Role,
    const TArray<FHorizonNPCSiteCandidate>& Candidates,
    int32 Seed) const
{
    if (Candidates.IsEmpty())
    {
        return FHorizonNPCSiteCandidate();
    }

    TArray<FHorizonNPCSiteCandidate> Ranked = Candidates;
    Ranked.Sort([this, Role](const FHorizonNPCSiteCandidate& A, const FHorizonNPCSiteCandidate& B)
    {
        return ScoreSiteForRole(Role, A) > ScoreSiteForRole(Role, B);
    });

    const int32 Pool = FMath::Clamp(Ranked.Num(), 1, 4);
    FRandomStream Random(Seed == 0 ? 8849 + static_cast<int32>(Role) * 101 : Seed);

    // Stay in the strongest few candidates so NPCs remain strategically placed
    // without appearing at exactly the same point every session.
    return Ranked[Random.RandRange(0, Pool - 1)];
}

FString UHorizonChallengeDirectorSubsystem::MakeChallengeId(
    const FString& NPCSiteId,
    EHorizonChallengeNPCRole Role) const
{
    return FString::Printf(
        TEXT("%s|%d"),
        *NPCSiteId,
        static_cast<int32>(Role));
}

int32 UHorizonChallengeDirectorSubsystem::FindChallengeIndex(const FString& ChallengeId) const
{
    if (!State || ChallengeId.IsEmpty())
    {
        return INDEX_NONE;
    }

    for (int32 Index = 0; Index < State->Challenges.Num(); ++Index)
    {
        if (State->Challenges[Index].ChallengeId == ChallengeId)
        {
            return Index;
        }
    }

    return INDEX_NONE;
}

bool UHorizonChallengeDirectorSubsystem::OfferChallenge(
    const FString& NPCSiteId,
    EHorizonChallengeNPCRole Role,
    FHorizonChallengeRuntimeState& OutChallenge)
{
    if (!State || NPCSiteId.IsEmpty())
    {
        return false;
    }

    const FString ChallengeId = MakeChallengeId(NPCSiteId, Role);
    const int32 ExistingIndex = FindChallengeIndex(ChallengeId);

    if (ExistingIndex != INDEX_NONE)
    {
        OutChallenge = State->Challenges[ExistingIndex];
        return true;
    }

    FHorizonChallengeRuntimeState Runtime;
    Runtime.ChallengeId = ChallengeId;
    Runtime.NPCSiteId = NPCSiteId;
    Runtime.Definition = GetDefaultChallenge(Role);
    Runtime.Definition.TargetCount = FMath::Max(1, Runtime.Definition.TargetCount);
    Runtime.Progress = 0;
    Runtime.bCompleted = false;
    Runtime.bClaimed = false;

    State->Challenges.Add(Runtime);
    SaveState();
    OutChallenge = Runtime;
    OnChallengeChanged.Broadcast(Runtime);
    return true;
}

bool UHorizonChallengeDirectorSubsystem::AddChallengeProgress(
    const FString& ChallengeId,
    int32 Amount,
    FHorizonChallengeRuntimeState& OutChallenge)
{
    if (!State || Amount <= 0)
    {
        return false;
    }

    const int32 Index = FindChallengeIndex(ChallengeId);
    if (Index == INDEX_NONE)
    {
        return false;
    }

    FHorizonChallengeRuntimeState& Runtime = State->Challenges[Index];

    if (Runtime.bClaimed)
    {
        OutChallenge = Runtime;
        return false;
    }

    const int32 Target = FMath::Max(1, Runtime.Definition.TargetCount);
    Runtime.Progress = FMath::Clamp(Runtime.Progress + Amount, 0, Target);
    Runtime.bCompleted = Runtime.Progress >= Target;

    SaveState();
    OutChallenge = Runtime;
    OnChallengeChanged.Broadcast(Runtime);
    return true;
}

bool UHorizonChallengeDirectorSubsystem::ClaimChallengeReward(
    const FString& ChallengeId,
    FHorizonChallengeReward& OutReward)
{
    if (!State)
    {
        return false;
    }

    const int32 Index = FindChallengeIndex(ChallengeId);
    if (Index == INDEX_NONE)
    {
        return false;
    }

    FHorizonChallengeRuntimeState& Runtime = State->Challenges[Index];
    const FHorizonChallengeReward Reward = Runtime.Definition.Reward;

    if (!Runtime.bCompleted || Runtime.bClaimed || !Reward.bFreeReward)
    {
        return false;
    }

    if (Reward.Kind == EHorizonChallengeRewardKind::SurvivalItem &&
        !Reward.RewardKey.IsEmpty() &&
        Reward.Amount > 0)
    {
        int32& Count = State->FreeItemInventory.FindOrAdd(Reward.RewardKey);
        Count += Reward.Amount;
    }

    if (UGameInstance* GameInstance = GetGameInstance())
    {
        if (UHorizonProgressionSubsystem* Progression =
            GameInstance->GetSubsystem<UHorizonProgressionSubsystem>())
        {
            if (Reward.Salvage > 0)
            {
                Progression->GrantFreeSalvage(Reward.Salvage);
            }

            if (Reward.Kind == EHorizonChallengeRewardKind::Cosmetic &&
                !Reward.RewardKey.IsEmpty())
            {
                Progression->GrantFreeUnlock(Reward.RewardKey);
            }
        }
    }

    Runtime.bClaimed = true;
    SaveState();

    OutReward = Reward;
    OnChallengeChanged.Broadcast(Runtime);
    return true;
}

bool UHorizonChallengeDirectorSubsystem::GetChallenge(
    const FString& ChallengeId,
    FHorizonChallengeRuntimeState& OutChallenge) const
{
    const int32 Index = FindChallengeIndex(ChallengeId);
    if (Index == INDEX_NONE)
    {
        return false;
    }

    OutChallenge = State->Challenges[Index];
    return true;
}

TArray<FHorizonChallengeRuntimeState> UHorizonChallengeDirectorSubsystem::GetChallenges() const
{
    return State ? State->Challenges : TArray<FHorizonChallengeRuntimeState>();
}

int32 UHorizonChallengeDirectorSubsystem::GetFreeItemCount(const FString& RewardKey) const
{
    if (!State || RewardKey.IsEmpty())
    {
        return 0;
    }

    return State->FreeItemInventory.FindRef(RewardKey);
}

void UHorizonChallengeDirectorSubsystem::SaveState()
{
    if (State)
    {
        UGameplayStatics::SaveGameToSlot(State, SaveSlot, 0);
    }
}
