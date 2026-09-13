#include "HorizonChallengeDirectorSubsystem.h"

FHorizonChallengeDefinition UHorizonChallengeDirectorSubsystem::GetDefaultChallenge(
    EHorizonChallengeNPCRole Role) const
{
    FHorizonChallengeDefinition Definition;
    Definition.Role = Role;
    Definition.Reward.bFreeReward = true;

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
