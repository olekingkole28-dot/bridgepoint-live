#pragma once

#include "CoreMinimal.h"
#include "Subsystems/GameInstanceSubsystem.h"
#include "HorizonMatchmakingSubsystem.generated.h"

UENUM(BlueprintType)
enum class EHorizonInputPool : uint8
{
    MouseKeyboard,
    Gamepad,
    Touch
};

UENUM(BlueprintType)
enum class EHorizonPlatformPool : uint8
{
    PC,
    Console,
    Mobile,
    Cloud
};

USTRUCT(BlueprintType)
struct FHorizonMatchProfile
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    FString PlayerId;

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    float SkillMean = 25.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    float SkillUncertainty = 8.333f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    int32 CareerLevel = 1;

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    int32 LifetimeKills = 0;

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    int32 Prestige = 0;

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    EHorizonInputPool InputPool = EHorizonInputPool::MouseKeyboard;

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    EHorizonPlatformPool PlatformPool = EHorizonPlatformPool::PC;

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    int32 EstimatedPingMs = 50;

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    int32 PartySize = 1;

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    bool bCrossInputOptIn = false;
};

USTRUCT(BlueprintType)
struct FHorizonMatchCompatibility
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadOnly)
    bool bEligible = false;

    UPROPERTY(BlueprintReadOnly)
    float Score01 = 0.0f;

    UPROPERTY(BlueprintReadOnly)
    float SkillGap = 0.0f;

    UPROPERTY(BlueprintReadOnly)
    float ConnectionPenalty = 0.0f;

    UPROPERTY(BlueprintReadOnly)
    FString RejectionReason;
};

UCLASS()
class BRIDGEPOINTHORIZON_API UHorizonMatchmakingSubsystem : public UGameInstanceSubsystem
{
    GENERATED_BODY()

public:
    UFUNCTION(BlueprintPure, Category="Horizon|Matchmaking")
    FHorizonMatchCompatibility EvaluateCompatibility(
        const FHorizonMatchProfile& Host,
        const FHorizonMatchProfile& Candidate) const;

private:
    static constexpr int32 MaxCareerLevel = 100;
    static constexpr int32 MaxPrestige = 100;
    static constexpr int32 MaxPartySize = 4;
    static constexpr int32 HardPingLimitMs = 180;
    static constexpr float MinimumEligibleScore = 0.35f;
};
