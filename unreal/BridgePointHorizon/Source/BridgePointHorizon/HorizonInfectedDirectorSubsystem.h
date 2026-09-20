#pragma once

#include "CoreMinimal.h"
#include "Subsystems/GameInstanceSubsystem.h"
#include "HorizonInfectedDirectorSubsystem.generated.h"

UENUM(BlueprintType)
enum class EHorizonInfectedArchetype : uint8
{
    Walker,
    Shambler,
    Lurker,
    Stalker,
    Runner,
    Sprinter,
    Helmeted,
    Armored,
    Screamer,
    Brute,
    Spider,
    ZombieDog,
    Orc,
    Other
};

USTRUCT(BlueprintType)
struct FHorizonInfectedTuning
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadOnly)
    float HealthMultiplier = 1.0f;

    UPROPERTY(BlueprintReadOnly)
    float DamageMultiplier = 1.0f;

    UPROPERTY(BlueprintReadOnly)
    float SpeedMultiplier = 1.0f;

    UPROPERTY(BlueprintReadOnly)
    float SpawnDensityMultiplier = 1.0f;

    UPROPERTY(BlueprintReadOnly)
    float AggroRangeMultiplier = 1.0f;

    UPROPERTY(BlueprintReadOnly)
    float EliteChance = 0.0f;

    UPROPERTY(BlueprintReadOnly)
    float LurkerChance = 0.0f;

    UPROPERTY(BlueprintReadOnly)
    float StalkerChance = 0.0f;

    UPROPERTY(BlueprintReadOnly)
    float RunnerChance = 0.0f;

    UPROPERTY(BlueprintReadOnly)
    float SprinterChance = 0.0f;

    UPROPERTY(BlueprintReadOnly)
    float ArmoredChance = 0.0f;

    UPROPERTY(BlueprintReadOnly)
    float ScreamerChance = 0.0f;

    UPROPERTY(BlueprintReadOnly)
    float BruteChance = 0.0f;
};

UCLASS()
class BRIDGEPOINTHORIZON_API UHorizonInfectedDirectorSubsystem : public UGameInstanceSubsystem
{
    GENERATED_BODY()

public:
    UFUNCTION(BlueprintPure, Category="Horizon|Infected")
    FHorizonInfectedTuning GetTuning(
        int32 EventDay,
        float LocalUrbanDensity01,
        float RegionalDanger01,
        float HordePressure01) const;

    UFUNCTION(BlueprintPure, Category="Horizon|Infected")
    EHorizonInfectedArchetype PickArchetype(
        int32 EventDay,
        float LocalUrbanDensity01,
        float RegionalDanger01,
        int32 RandomSeed) const;

    UFUNCTION(BlueprintPure, Category="Horizon|Infected")
    float GetCityConvergencePressure(int32 EventDay) const;

    UFUNCTION(BlueprintPure, Category="Horizon|Infected|YearOne")
    int32 GetBaseHealth(EHorizonInfectedArchetype Archetype) const;

    UFUNCTION(BlueprintPure, Category="Horizon|Infected|YearOne")
    int32 GetContactDamage() const { return 25; }

    UFUNCTION(BlueprintPure, Category="Horizon|Infected|YearOne")
    float GetMovementSpeedMps(EHorizonInfectedArchetype Archetype) const;

    UFUNCTION(BlueprintPure, Category="Horizon|Infected|YearOne")
    bool ShouldHop(EHorizonInfectedArchetype Archetype) const;

    UFUNCTION(BlueprintPure, Category="Horizon|Infected|YearOne")
    int32 GetZombieDogPackMin() const { return 3; }

    UFUNCTION(BlueprintPure, Category="Horizon|Infected|YearOne")
    int32 GetZombieDogPackMax() const { return 5; }

    UFUNCTION(BlueprintPure, Category="Horizon|Infected")
    int32 GetAdaptiveSpawnCap() const;

    UFUNCTION(BlueprintPure, Category="Horizon|Infected")
    float GetAdaptiveSimulationBudget01() const;
};
