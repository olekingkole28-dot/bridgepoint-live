#pragma once

#include "CoreMinimal.h"
#include "GameFramework/SaveGame.h"
#include "Subsystems/GameInstanceSubsystem.h"
#include "HorizonProgressionSubsystem.generated.h"

UENUM(BlueprintType)
enum class EHorizonRewardType : uint8
{
    Salvage,
    Cosmetic,
    WeaponWrap,
    Emote,
    Spray,
    Character,
    Blueprint,
    Badge,
    Banner
};

USTRUCT(BlueprintType)
struct FHorizonReward
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadOnly)
    EHorizonRewardType Type = EHorizonRewardType::Salvage;

    UPROPERTY(BlueprintReadOnly)
    FString RewardKey;

    UPROPERTY(BlueprintReadOnly)
    int32 Amount = 1;

    UPROPERTY(BlueprintReadOnly)
    bool bFree = true;

    UPROPERTY(BlueprintReadOnly)
    bool bPremium = false;
};

UCLASS()
class BRIDGEPOINTHORIZON_API UHorizonProgressionSaveGame : public USaveGame
{
    GENERATED_BODY()

public:
    UPROPERTY()
    FString SeasonKey;

    UPROPERTY()
    int32 SeasonXP = 0;

    UPROPERTY()
    int32 SeasonLevel = 0;

    UPROPERTY()
    int32 CareerXP = 0;

    UPROPERTY()
    int32 CareerLevel = 1;

    UPROPERTY()
    int32 Prestige = 0;

    UPROPERTY()
    int32 LifetimeKills = 0;

    UPROPERTY()
    int32 Salvage = 0;

    UPROPERTY()
    bool bPremiumPassEntitled = false;

    UPROPERTY()
    TArray<FString> ClaimedDailyKeys;

    UPROPERTY()
    TArray<FString> CosmeticUnlocks;
};

DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FHorizonProgressionChanged, int32, NewLevel, int32, NewXP);
DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FHorizonCareerChanged, int32, NewCareerLevel, int32, NewPrestige);

UCLASS()
class BRIDGEPOINTHORIZON_API UHorizonProgressionSubsystem : public UGameInstanceSubsystem
{
    GENERATED_BODY()

public:
    virtual void Initialize(FSubsystemCollectionBase& Collection) override;

    UPROPERTY(BlueprintAssignable)
    FHorizonProgressionChanged OnProgressionChanged;

    UPROPERTY(BlueprintAssignable)
    FHorizonCareerChanged OnCareerChanged;

    UFUNCTION(BlueprintCallable, Category="Horizon|Progression")
    void AddXP(int32 Amount, FDateTime NowUtc);

    UFUNCTION(BlueprintCallable, Category="Horizon|Progression|Career")
    void AddCareerXP(int32 Amount);

    UFUNCTION(BlueprintCallable, Category="Horizon|Progression|Career")
    void RecordKill(int32 Count = 1);

    UFUNCTION(BlueprintCallable, Category="Horizon|Progression|Career")
    bool TryPrestige(FHorizonReward& OutReward);

    UFUNCTION(BlueprintCallable, Category="Horizon|Progression")
    bool ClaimDailyFreeReward(FDateTime NowUtc, FHorizonReward& OutReward);

    UFUNCTION(BlueprintPure, Category="Horizon|Progression")
    FHorizonReward PreviewDailyFreeReward(FDateTime NowUtc) const;

    UFUNCTION(BlueprintPure, Category="Horizon|Progression")
    FHorizonReward GetLevelReward(int32 Level, bool bPremiumTrack) const;

    UFUNCTION(BlueprintCallable, Category="Horizon|Progression")
    void GrantFreeSalvage(int32 Amount);

    UFUNCTION(BlueprintCallable, Category="Horizon|Progression")
    bool GrantFreeUnlock(const FString& RewardKey);

    UFUNCTION(BlueprintCallable, Category="Horizon|Progression")
    void SetPremiumPassEntitled(bool bEntitled);

    UFUNCTION(BlueprintPure, Category="Horizon|Progression")
    int32 GetLevel() const;

    UFUNCTION(BlueprintPure, Category="Horizon|Progression")
    int32 GetXP() const;

    UFUNCTION(BlueprintPure, Category="Horizon|Progression|Career")
    int32 GetCareerLevel() const;

    UFUNCTION(BlueprintPure, Category="Horizon|Progression|Career")
    int32 GetCareerXP() const;

    UFUNCTION(BlueprintPure, Category="Horizon|Progression|Career")
    int32 GetPrestige() const;

    UFUNCTION(BlueprintPure, Category="Horizon|Progression|Career")
    int32 GetLifetimeKills() const;

    UFUNCTION(BlueprintPure, Category="Horizon|Progression|Career")
    bool CanPrestige() const;

    UFUNCTION(BlueprintPure, Category="Horizon|Progression")
    int32 GetSalvage() const;

    UFUNCTION(BlueprintPure, Category="Horizon|Progression")
    bool HasPremiumPass() const;

    UFUNCTION(BlueprintPure, Category="Horizon|Progression")
    FString GetCurrentSeasonKey() const;

private:
    static constexpr int32 MaxLevel = 150;
    static constexpr int32 XPPerLevel = 500;
    static constexpr int32 MaxCareerLevel = 100;
    static constexpr int32 MaxPrestige = 100;
    static constexpr int32 CareerXPPerLevel = 1000;
    static const TCHAR* SaveSlot;

    UPROPERTY()
    TObjectPtr<UHorizonProgressionSaveGame> State;

    void EnsureSeason(FDateTime NowUtc);
    void SanitizeCareerState();
    void SaveState();
    FString MakeSeasonKey(FDateTime NowUtc) const;
    FString MakeDailyKey(FDateTime NowUtc) const;
    void GrantReward(const FHorizonReward& Reward);
};
