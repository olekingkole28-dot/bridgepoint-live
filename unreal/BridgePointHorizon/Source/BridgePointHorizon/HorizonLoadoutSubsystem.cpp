#include "HorizonLoadoutSubsystem.h"

#include "Kismet/GameplayStatics.h"

const TCHAR* UHorizonLoadoutSubsystem::SaveSlot = TEXT("BridgePointHorizonLoadout");

void UHorizonLoadoutSubsystem::Initialize(FSubsystemCollectionBase& Collection)
{
    Super::Initialize(Collection);

    if (USaveGame* Loaded = UGameplayStatics::LoadGameFromSlot(SaveSlot, 0))
    {
        State = Cast<UHorizonLoadoutSaveGame>(Loaded);
    }

    if (!State)
    {
        State = Cast<UHorizonLoadoutSaveGame>(
            UGameplayStatics::CreateSaveGameObject(UHorizonLoadoutSaveGame::StaticClass()));

        State->Loadout.CharacterKey = TEXT("survivor");
        State->Loadout.SkinKey = TEXT("default");
        State->Loadout.MeleeWeaponKey = TEXT("axe");
        State->Loadout.EmoteWheel = {
            TEXT("wave"),
            TEXT("point"),
            TEXT("celebrate"),
            TEXT("quiet")
        };
        State->Loadout.SprayWheel = {
            TEXT("horizon_mark"),
            TEXT("danger"),
            TEXT("loot"),
            TEXT("cleared")
        };
        SaveState();
    }
}

FHorizonPlayerLoadout UHorizonLoadoutSubsystem::GetLoadout() const
{
    return State ? State->Loadout : FHorizonPlayerLoadout();
}

void UHorizonLoadoutSubsystem::SetCharacter(const FString& CharacterKey, const FString& SkinKey)
{
    if (!State || CharacterKey.IsEmpty())
    {
        return;
    }

    State->Loadout.CharacterKey = CharacterKey;
    State->Loadout.SkinKey = SkinKey.IsEmpty() ? TEXT("default") : SkinKey;
    SaveState();
    BroadcastChanged();
}

void UHorizonLoadoutSubsystem::SetWeapons(
    const FString& PrimaryKey,
    const FString& SecondaryKey,
    const FString& MeleeKey)
{
    if (!State)
    {
        return;
    }

    State->Loadout.PrimaryWeaponKey = PrimaryKey;
    State->Loadout.SecondaryWeaponKey = SecondaryKey;
    State->Loadout.MeleeWeaponKey = MeleeKey;
    SaveState();
    BroadcastChanged();
}

void UHorizonLoadoutSubsystem::SetEmoteWheel(const TArray<FString>& Emotes)
{
    if (!State)
    {
        return;
    }

    State->Loadout.EmoteWheel = Emotes;
    if (State->Loadout.EmoteWheel.Num() > 8)
    {
        State->Loadout.EmoteWheel.SetNum(8);
    }
    SaveState();
    BroadcastChanged();
}

void UHorizonLoadoutSubsystem::SetSprayWheel(const TArray<FString>& Sprays)
{
    if (!State)
    {
        return;
    }

    State->Loadout.SprayWheel = Sprays;
    if (State->Loadout.SprayWheel.Num() > 8)
    {
        State->Loadout.SprayWheel.SetNum(8);
    }
    SaveState();
    BroadcastChanged();
}

void UHorizonLoadoutSubsystem::ResetToDefaults()
{
    if (!State)
    {
        return;
    }

    State->Loadout = FHorizonPlayerLoadout();
    State->Loadout.CharacterKey = TEXT("survivor");
    State->Loadout.SkinKey = TEXT("default");
    State->Loadout.MeleeWeaponKey = TEXT("axe");
    SaveState();
    BroadcastChanged();
}

void UHorizonLoadoutSubsystem::SaveState()
{
    if (State)
    {
        UGameplayStatics::SaveGameToSlot(State, SaveSlot, 0);
    }
}

void UHorizonLoadoutSubsystem::BroadcastChanged()
{
    if (State)
    {
        OnLoadoutChanged.Broadcast(State->Loadout);
    }
}
