#pragma once

#include "CoreMinimal.h"
#include "Subsystems/GameInstanceSubsystem.h"
#include "HorizonGameStateSubsystem.h"
#include "HorizonSocialSubsystem.generated.h"

DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FHorizonOnlineResult, bool, bSuccess, const FString&, Message);

UCLASS()
class BRIDGEPOINTHORIZON_API UHorizonSocialSubsystem : public UGameInstanceSubsystem
{
    GENERATED_BODY()

public:
    virtual void Initialize(FSubsystemCollectionBase& Collection) override;
    virtual void Deinitialize() override;

    UPROPERTY(BlueprintAssignable)
    FHorizonOnlineResult OnLobbyCreated;

    UPROPERTY(BlueprintAssignable)
    FHorizonOnlineResult OnLobbyDestroyed;

    UFUNCTION(BlueprintCallable, Category="Horizon|Social")
    bool CreatePartyLobby(EHorizonGameMode Mode, int32 LocalUserNum = 0);

    UFUNCTION(BlueprintCallable, Category="Horizon|Social")
    bool DestroyPartyLobby();

    UFUNCTION(BlueprintCallable, Category="Horizon|Social")
    bool ShowInviteFriendsUI(int32 LocalUserNum = 0);

    UFUNCTION(BlueprintPure, Category="Horizon|Social")
    bool IsLobbyActive() const { return bLobbyActive; }

    UFUNCTION(BlueprintPure, Category="Horizon|Social")
    EHorizonGameMode GetLobbyMode() const { return LobbyMode; }

    UFUNCTION(BlueprintPure, Category="Horizon|Social")
    int32 GetLobbyCapacity() const { return LobbyCapacity; }

private:
    bool bLobbyActive = false;
    EHorizonGameMode LobbyMode = EHorizonGameMode::InfiniteTDM;
    int32 LobbyCapacity = 0;

    FDelegateHandle CreateSessionDelegateHandle;
    FDelegateHandle DestroySessionDelegateHandle;

    void HandleCreateSessionComplete(FName SessionName, bool bWasSuccessful);
    void HandleDestroySessionComplete(FName SessionName, bool bWasSuccessful);
};
