#pragma once

#include "CoreMinimal.h"
#include "GameFramework/SaveGame.h"
#include "Subsystems/GameInstanceSubsystem.h"
#include "HorizonGameStateSubsystem.generated.h"

UENUM(BlueprintType)
enum class EHorizonGameMode : uint8
{
    YearOneSurvival UMETA(DisplayName="Year One Survival"),
    InfiniteTDM UMETA(DisplayName="Infinite Team Deathmatch"),
    OutbreakRaid UMETA(DisplayName="Outbreak Raid")
};

USTRUCT(BlueprintType)
struct FHorizonModeRules
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    EHorizonGameMode Mode = EHorizonGameMode::YearOneSurvival;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    int32 MinPartySize = 1;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    int32 MaxPartySize = 1;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    bool bFriendInvitesAllowed = false;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    bool bProximityVoice = false;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    bool bTeamOrPartyVoice = false;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    bool bRespawns = false;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    bool bConsumesYearOneLives = false;
};

USTRUCT(BlueprintType)
struct FYearOneState
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadOnly)
    bool bStarted = false;

    UPROPERTY(BlueprintReadOnly)
    FDateTime StartUtc;

    UPROPERTY(BlueprintReadOnly)
    int32 DurationDays = 365;

    UPROPERTY(BlueprintReadOnly)
    int32 LivesRemaining = 3;

    UPROPERTY(BlueprintReadOnly)
    bool bEliminated = false;
};

UCLASS()
class BRIDGEPOINTHORIZON_API UHorizonYearOneSaveGame : public USaveGame
{
    GENERATED_BODY()

public:
    UPROPERTY()
    bool bStarted = false;

    UPROPERTY()
    FDateTime StartUtc;

    UPROPERTY()
    int32 DurationDays = 365;

    UPROPERTY()
    int32 LivesRemaining = 3;

    UPROPERTY()
    bool bEliminated = false;
};

DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FHorizonModeChanged, EHorizonGameMode, NewMode);
DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FHorizonYearOneLivesChanged, int32, LivesRemaining, bool, bEliminated);

UCLASS(Config=Game)
class BRIDGEPOINTHORIZON_API UHorizonGameStateSubsystem : public UGameInstanceSubsystem
{
    GENERATED_BODY()

public:
    virtual void Initialize(FSubsystemCollectionBase& Collection) override;

    UPROPERTY(BlueprintAssignable)
    FHorizonModeChanged OnModeChanged;

    UPROPERTY(BlueprintAssignable)
    FHorizonYearOneLivesChanged OnYearOneLivesChanged;

    UFUNCTION(BlueprintCallable, Category="Horizon|Mode")
    void SetCurrentMode(EHorizonGameMode NewMode);

    UFUNCTION(BlueprintPure, Category="Horizon|Mode")
    EHorizonGameMode GetCurrentMode() const { return CurrentMode; }

    UFUNCTION(BlueprintPure, Category="Horizon|Mode")
    FHorizonModeRules GetCurrentModeRules() const;

    UFUNCTION(BlueprintPure, Category="Horizon|Mode")
    FHorizonModeRules GetModeRules(EHorizonGameMode Mode) const;

    UFUNCTION(BlueprintPure, Category="Horizon|Mode")
    bool CanInviteFriends() const;

    UFUNCTION(BlueprintPure, Category="Horizon|Mode")
    int32 GetMaxPartySize() const;

    UFUNCTION(BlueprintCallable, Category="Horizon|YearOne")
    bool StartYearOneEvent(FDateTime StartUtc);

    UFUNCTION(BlueprintCallable, Category="Horizon|YearOne")
    void ResetYearOneForPreseason();

    UFUNCTION(BlueprintPure, Category="Horizon|YearOne")
    FYearOneState GetYearOneState() const { return YearOne; }

    UFUNCTION(BlueprintPure, Category="Horizon|YearOne")
    bool IsYearOneStartAuthorized() const { return bOwnerAuthorizedYearOneStart; }

    UFUNCTION(BlueprintPure, Category="Horizon|YearOne")
    int32 GetYearOneDay(FDateTime NowUtc) const;

    UFUNCTION(BlueprintPure, Category="Horizon|YearOne")
    float GetYearOneProgress01(FDateTime NowUtc) const;

    UFUNCTION(BlueprintPure, Category="Horizon|YearOne")
    float GetZombieDifficultyScalar(FDateTime NowUtc) const;

    UFUNCTION(BlueprintPure, Category="Horizon|YearOne")
    float GetZombieWallProgress01(FDateTime NowUtc) const;

    UFUNCTION(BlueprintCallable, Category="Horizon|Player")
    bool RegisterPlayerDeath();

    UFUNCTION(BlueprintCallable, Category="Horizon|Player")
    void RestoreYearOneLives(int32 Lives = 3);

private:
    static const TCHAR* YearOneSaveSlot;

    UPROPERTY(Config)
    bool bOwnerAuthorizedYearOneStart = false;

    UPROPERTY()
    EHorizonGameMode CurrentMode = EHorizonGameMode::YearOneSurvival;

    UPROPERTY()
    FYearOneState YearOne;

    UPROPERTY()
    TObjectPtr<UHorizonYearOneSaveGame> PersistedYearOne;

    void LoadYearOneState();
    void SaveYearOneState();
};
