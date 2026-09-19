#pragma once

#include "CoreMinimal.h"
#include "GameFramework/SaveGame.h"
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

UENUM(BlueprintType)
enum class EHorizonChallengeRewardKind : uint8
{
    SurvivalItem,
    Cosmetic
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

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    EHorizonChallengeRewardKind Kind = EHorizonChallengeRewardKind::SurvivalItem;
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

USTRUCT(BlueprintType)
struct FHorizonChallengeRuntimeState
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadOnly)
    FString ChallengeId;

    UPROPERTY(BlueprintReadOnly)
    FString NPCSiteId;

    UPROPERTY(BlueprintReadOnly)
    FHorizonChallengeDefinition Definition;

    UPROPERTY(BlueprintReadOnly)
    int32 Progress = 0;

    UPROPERTY(BlueprintReadOnly)
    bool bCompleted = false;

    UPROPERTY(BlueprintReadOnly)
    bool bClaimed = false;
};

UCLASS()
class BRIDGEPOINTHORIZON_API UHorizonChallengeSaveGame : public USaveGame
{
    GENERATED_BODY()

public:
    UPROPERTY()
    TArray<FHorizonChallengeRuntimeState> Challenges;

    // Capacity-blocked gameplay rewards waiting to enter the survival inventory.
    // This is a free earn-only overflow ledger with no store/payment dependency.
    UPROPERTY()
    TMap<FString, int32> FreeItemInventory;
};

DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(
    FHorizonChallengeChanged,
    const FHorizonChallengeRuntimeState&,
    Challenge);

UCLASS()
class BRIDGEPOINTHORIZON_API UHorizonChallengeDirectorSubsystem : public UGameInstanceSubsystem
{
    GENERATED_BODY()

public:
    virtual void Initialize(FSubsystemCollectionBase& Collection) override;

    UPROPERTY(BlueprintAssignable)
    FHorizonChallengeChanged OnChallengeChanged;

    UFUNCTION(BlueprintPure, Category="Horizon|NPC")
    FHorizonChallengeDefinition GetDefaultChallenge(EHorizonChallengeNPCRole Role) const;

    UFUNCTION(BlueprintPure, Category="Horizon|NPC")
    float ScoreSiteForRole(EHorizonChallengeNPCRole Role, const FHorizonNPCSiteCandidate& Site) const;

    UFUNCTION(BlueprintCallable, Category="Horizon|NPC")
    FHorizonNPCSiteCandidate PickStrategicSite(
        EHorizonChallengeNPCRole Role,
        const TArray<FHorizonNPCSiteCandidate>& Candidates,
        int32 Seed = 0) const;

    UFUNCTION(BlueprintCallable, Category="Horizon|NPC")
    bool OfferChallenge(
        const FString& NPCSiteId,
        EHorizonChallengeNPCRole Role,
        FHorizonChallengeRuntimeState& OutChallenge);

    UFUNCTION(BlueprintCallable, Category="Horizon|NPC")
    bool AddChallengeProgress(
        const FString& ChallengeId,
        int32 Amount,
        FHorizonChallengeRuntimeState& OutChallenge);

    UFUNCTION(BlueprintCallable, Category="Horizon|NPC")
    bool ClaimChallengeReward(
        const FString& ChallengeId,
        FHorizonChallengeReward& OutReward);

    UFUNCTION(BlueprintPure, Category="Horizon|NPC")
    bool GetChallenge(
        const FString& ChallengeId,
        FHorizonChallengeRuntimeState& OutChallenge) const;

    UFUNCTION(BlueprintPure, Category="Horizon|NPC")
    TArray<FHorizonChallengeRuntimeState> GetChallenges() const;

    UFUNCTION(BlueprintPure, Category="Horizon|NPC")
    int32 GetFreeItemCount(const FString& RewardKey) const;

    UFUNCTION(BlueprintCallable, Category="Horizon|NPC")
    int32 CollectDeferredItemReward(FName ItemKey);

    static FName ResolveSurvivalInventoryItem(const FString& RewardKey);
    static int32 ResolveSurvivalInventoryQuantity(const FHorizonChallengeReward& Reward);
    static int32 ComputeDeferredRewardAmount(int32 RequestedQuantity, int32 GrantedQuantity);

private:
    static const TCHAR* SaveSlot;

    UPROPERTY()
    TObjectPtr<UHorizonChallengeSaveGame> State;

    FString MakeChallengeId(const FString& NPCSiteId, EHorizonChallengeNPCRole Role) const;
    int32 FindChallengeIndex(const FString& ChallengeId) const;
    void SaveState();
};
