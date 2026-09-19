#pragma once

#include "CoreMinimal.h"
#include "GameFramework/SaveGame.h"
#include "Subsystems/GameInstanceSubsystem.h"
#include "HorizonEnemyProgressionSubsystem.generated.h"

USTRUCT(BlueprintType)
struct FHorizonEnemyProgressionContext
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadWrite, meta=(ClampMin="1", ClampMax="4"))
    int32 PlayerCount = 1;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, meta=(ClampMin="1", ClampMax="100"))
    float AverageCareerLevel = 1.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, meta=(ClampMin="0", ClampMax="100"))
    float AveragePrestige = 0.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, meta=(ClampMin="0", ClampMax="100"))
    float AverageGearScore = 0.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, meta=(ClampMin="0", ClampMax="1"))
    float RecentWinRate01 = 0.5f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, meta=(ClampMin="0", ClampMax="1"))
    float WorldThreat01 = 0.0f;
};

USTRUCT(BlueprintType)
struct FHorizonEnemyTierProfile
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadOnly)
    float DifficultyScalar = 1.0f;

    UPROPERTY(BlueprintReadOnly)
    float HealthMultiplier = 1.0f;

    UPROPERTY(BlueprintReadOnly)
    float DamageMultiplier = 1.0f;

    UPROPERTY(BlueprintReadOnly)
    float SpeedMultiplier = 1.0f;

    UPROPERTY(BlueprintReadOnly)
    int32 EncounterBudget = 8;

    UPROPERTY(BlueprintReadOnly)
    int32 MaxSpecialInfected = 0;

    UPROPERTY(BlueprintReadOnly)
    float LootQualityBias = 0.0f;

    UPROPERTY(BlueprintReadOnly)
    bool bBossEligible = false;
};

UCLASS()
class BRIDGEPOINTHORIZON_API UHorizonEnemyProgressionSaveGame : public USaveGame
{
    GENERATED_BODY()

public:
    UPROPERTY()
    float WorldThreat01 = 0.0f;

    UPROPERTY()
    int32 EncountersCompleted = 0;

    UPROPERTY()
    int32 EncounterWins = 0;

    UPROPERTY()
    int32 EncounterLosses = 0;
};

DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(
    FHorizonWorldThreatChanged,
    float,
    NewWorldThreat01);

UCLASS()
class BRIDGEPOINTHORIZON_API UHorizonEnemyProgressionSubsystem : public UGameInstanceSubsystem
{
    GENERATED_BODY()

public:
    virtual void Initialize(FSubsystemCollectionBase& Collection) override;

    UPROPERTY(BlueprintAssignable)
    FHorizonWorldThreatChanged OnWorldThreatChanged;

    UFUNCTION(BlueprintPure, Category="Horizon|Enemies|Progression")
    FHorizonEnemyTierProfile EvaluateEncounter(
        const FHorizonEnemyProgressionContext& Context) const;

    UFUNCTION(BlueprintCallable, Category="Horizon|Enemies|Progression")
    float RecordEncounterOutcome(bool bPlayersWon, float CompletionQuality01);

    UFUNCTION(BlueprintPure, Category="Horizon|Enemies|Progression")
    float GetWorldThreat01() const;

    UFUNCTION(BlueprintPure, Category="Horizon|Enemies|Progression")
    int32 GetEncountersCompleted() const;

    static FHorizonEnemyTierProfile BuildTierProfile(
        const FHorizonEnemyProgressionContext& Context);
    static float ComputeNextWorldThreat(
        float CurrentThreat01,
        bool bPlayersWon,
        float CompletionQuality01);

private:
    static const TCHAR* SaveSlot;

    UPROPERTY()
    TObjectPtr<UHorizonEnemyProgressionSaveGame> State;

    void SaveState();
};
