#include "HorizonSocialSubsystem.h"

#include "OnlineSubsystem.h"
#include "Interfaces/OnlineExternalUIInterface.h"
#include "Interfaces/OnlineSessionInterface.h"
#include "OnlineSessionSettings.h"

namespace HorizonSessionKeys
{
    static const FName Mode(TEXT("HORIZON_MODE"));
}

void UHorizonSocialSubsystem::Initialize(FSubsystemCollectionBase& Collection)
{
    Super::Initialize(Collection);
    bLobbyActive = false;
    LobbyCapacity = 0;
}

void UHorizonSocialSubsystem::Deinitialize()
{
    if (IOnlineSubsystem* OSS = IOnlineSubsystem::Get())
    {
        if (IOnlineSessionPtr Sessions = OSS->GetSessionInterface())
        {
            if (CreateSessionDelegateHandle.IsValid())
            {
                Sessions->ClearOnCreateSessionCompleteDelegate_Handle(CreateSessionDelegateHandle);
            }
            if (DestroySessionDelegateHandle.IsValid())
            {
                Sessions->ClearOnDestroySessionCompleteDelegate_Handle(DestroySessionDelegateHandle);
            }
        }
    }

    Super::Deinitialize();
}

bool UHorizonSocialSubsystem::CreatePartyLobby(EHorizonGameMode Mode, int32 LocalUserNum)
{
    if (Mode == EHorizonGameMode::YearOneSurvival)
    {
        OnLobbyCreated.Broadcast(false, TEXT("Year One Survival is solo-only."));
        return false;
    }

    IOnlineSubsystem* OSS = IOnlineSubsystem::Get();
    if (!OSS)
    {
        OnLobbyCreated.Broadcast(false, TEXT("No online subsystem is configured yet."));
        return false;
    }

    IOnlineSessionPtr Sessions = OSS->GetSessionInterface();
    if (!Sessions.IsValid())
    {
        OnLobbyCreated.Broadcast(false, TEXT("Online session interface is unavailable."));
        return false;
    }

    if (Sessions->GetNamedSession(NAME_GameSession))
    {
        OnLobbyCreated.Broadcast(false, TEXT("A Horizon party lobby is already active."));
        return false;
    }

    LobbyMode = Mode;
    LobbyCapacity = 4;

    FOnlineSessionSettings Settings;
    Settings.bIsLANMatch = OSS->GetSubsystemName() == FName(TEXT("NULL"));
    Settings.NumPublicConnections = LobbyCapacity;
    Settings.NumPrivateConnections = 0;
    Settings.bShouldAdvertise = true;
    Settings.bAllowJoinInProgress = true;
    Settings.bAllowInvites = true;
    Settings.bUsesPresence = true;
    Settings.bAllowJoinViaPresence = true;
    Settings.bUseLobbiesIfAvailable = true;

    // EOS Voice Chat can auto-join the lobby voice channel when EOS is configured.
    Settings.bUseLobbiesVoiceChatIfAvailable = true;

    const FString ModeValue = Mode == EHorizonGameMode::InfiniteTDM
        ? TEXT("infinite_tdm")
        : TEXT("outbreak_raid");

    Settings.Set(
        HorizonSessionKeys::Mode,
        ModeValue,
        EOnlineDataAdvertisementType::ViaOnlineServiceAndPing);

    Settings.Set(
        SETTING_MAPNAME,
        FString(TEXT("HorizonLobby")),
        EOnlineDataAdvertisementType::ViaOnlineServiceAndPing);

    CreateSessionDelegateHandle = Sessions->AddOnCreateSessionCompleteDelegate_Handle(
        FOnCreateSessionCompleteDelegate::CreateUObject(
            this,
            &UHorizonSocialSubsystem::HandleCreateSessionComplete));

    const bool bStarted = Sessions->CreateSession(LocalUserNum, NAME_GameSession, Settings);
    if (!bStarted)
    {
        Sessions->ClearOnCreateSessionCompleteDelegate_Handle(CreateSessionDelegateHandle);
        CreateSessionDelegateHandle.Reset();
        OnLobbyCreated.Broadcast(false, TEXT("Lobby creation could not start."));
        return false;
    }

    return true;
}

void UHorizonSocialSubsystem::HandleCreateSessionComplete(FName SessionName, bool bWasSuccessful)
{
    if (IOnlineSubsystem* OSS = IOnlineSubsystem::Get())
    {
        if (IOnlineSessionPtr Sessions = OSS->GetSessionInterface())
        {
            if (CreateSessionDelegateHandle.IsValid())
            {
                Sessions->ClearOnCreateSessionCompleteDelegate_Handle(CreateSessionDelegateHandle);
                CreateSessionDelegateHandle.Reset();
            }
        }
    }

    bLobbyActive = bWasSuccessful;
    if (!bWasSuccessful)
    {
        LobbyCapacity = 0;
    }

    OnLobbyCreated.Broadcast(
        bWasSuccessful,
        bWasSuccessful ? TEXT("Horizon party lobby created.") : TEXT("Horizon party lobby creation failed."));
}

bool UHorizonSocialSubsystem::DestroyPartyLobby()
{
    IOnlineSubsystem* OSS = IOnlineSubsystem::Get();
    if (!OSS)
    {
        return false;
    }

    IOnlineSessionPtr Sessions = OSS->GetSessionInterface();
    if (!Sessions.IsValid() || !Sessions->GetNamedSession(NAME_GameSession))
    {
        bLobbyActive = false;
        LobbyCapacity = 0;
        return false;
    }

    DestroySessionDelegateHandle = Sessions->AddOnDestroySessionCompleteDelegate_Handle(
        FOnDestroySessionCompleteDelegate::CreateUObject(
            this,
            &UHorizonSocialSubsystem::HandleDestroySessionComplete));

    return Sessions->DestroySession(NAME_GameSession);
}

void UHorizonSocialSubsystem::HandleDestroySessionComplete(FName SessionName, bool bWasSuccessful)
{
    if (IOnlineSubsystem* OSS = IOnlineSubsystem::Get())
    {
        if (IOnlineSessionPtr Sessions = OSS->GetSessionInterface())
        {
            if (DestroySessionDelegateHandle.IsValid())
            {
                Sessions->ClearOnDestroySessionCompleteDelegate_Handle(DestroySessionDelegateHandle);
                DestroySessionDelegateHandle.Reset();
            }
        }
    }

    if (bWasSuccessful)
    {
        bLobbyActive = false;
        LobbyCapacity = 0;
    }

    OnLobbyDestroyed.Broadcast(
        bWasSuccessful,
        bWasSuccessful ? TEXT("Horizon party lobby closed.") : TEXT("Could not close Horizon party lobby."));
}

bool UHorizonSocialSubsystem::ShowInviteFriendsUI(int32 LocalUserNum)
{
    if (!bLobbyActive || LobbyMode == EHorizonGameMode::YearOneSurvival)
    {
        return false;
    }

    IOnlineSubsystem* OSS = IOnlineSubsystem::Get();
    if (!OSS)
    {
        return false;
    }

    IOnlineExternalUIPtr ExternalUI = OSS->GetExternalUIInterface();
    if (!ExternalUI.IsValid())
    {
        return false;
    }

    return ExternalUI->ShowInviteUI(LocalUserNum, NAME_GameSession);
}
