#pragma once

#include "CoreMinimal.h"
#include "Subsystems/GameInstanceSubsystem.h"
#include "HorizonChallengeDirectorSubsystem.generated.h"

UENUM(BlueprintType)
enum class EHorizonChallengeNPCRole : uint8
{
    FieldMedic,
    Quartermaster,
    Ranger,
    Mechanic,
    RooftopScout
};

UENUM(BlueprintType)
enum class EHorizonChallengeType : uint8
{
    HealOrRescue,
    EliminateInfected,
    HuntOrGather,
    RepairVehicle,
    ReachRooftop,
    DestroyNest,
    HoldPosition
};

USTRUCT(BlueprintType)
struct FHorizonChallengeReward
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    FString RewardKey;

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    int32 Amount = 1;

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    int32 Salvage = 0;

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    bool bFreeReward = true;
};

USTRUCT(BlueprintType)
struct FHorizonChallengeDefinition
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    EHorizonChallengeNPCRole Role = EHorizonChallengeNPCRole::FieldMedic;

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    EHorizonChallengeType Type = EHorizonChallengeType::HealOrRescue;

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    FString Title;

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    int32 TargetCount = 1;

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    FHorizonChallengeReward Reward;
};

USTRUCT(BlueprintType)
struct FHorizonNPCSiteCandidate
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    FString SiteId;

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    FVector WorldLocation = FVector::ZeroVector;

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    float HospitalAffinity = 0.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    float PublicSafetyAffinity = 0.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    float WildernessAffinity = 0.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    float GarageIndustrialAffinity = 0.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    float RooftopAffinity = 0.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    float PedestrianAccess = 0.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    float LocalDanger = 0.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    bool bInterior = false;
};

UCLASS()
class BRIDGEPOINTHORIZON_API UHorizonChallengeDirectorSubsystem : public UGameInstanceSubsystem
{
    GENERATED_BODY()

public:
    UFUNCTION(BlueprintPure, Category="Horizon|NPC")
    FHorizonChallengeDefinition GetDefaultChallenge(EHorizonChallengeNPCRole Role) const;

    UFUNCTION(BlueprintPure, Category="Horizon|NPC")
    float ScoreSiteForRole(EHorizonChallengeNPCRole Role, const FHorizonNPCSiteCandidate& Site) const;

    UFUNCTION(BlueprintCallable, Category="Horizon|NPC")
    FHorizonNPCSiteCandidate PickStrategicSite(
        EHorizonChallengeNPCRole Role,
        const TArray<FHorizonNPCSiteCandidate>& Candidates,
        int32 Seed = 0) const;
};
