#pragma once

#include "CoreMinimal.h"
#include "GameFramework/SaveGame.h"
#include "Subsystems/GameInstanceSubsystem.h"
#include "HorizonLoadoutSubsystem.generated.h"

USTRUCT(BlueprintType)
struct FHorizonPlayerLoadout
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    FString CharacterKey = TEXT("survivor");

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    FString SkinKey = TEXT("default");

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    FString PrimaryWeaponKey;

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    FString SecondaryWeaponKey;

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    FString MeleeWeaponKey = TEXT("axe");

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    TArray<FString> EmoteWheel;

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    TArray<FString> SprayWheel;
};

UCLASS()
class BRIDGEPOINTHORIZON_API UHorizonLoadoutSaveGame : public USaveGame
{
    GENERATED_BODY()

public:
    UPROPERTY()
    FHorizonPlayerLoadout Loadout;
};

DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FHorizonLoadoutChanged, const FHorizonPlayerLoadout&, NewLoadout);

UCLASS()
class BRIDGEPOINTHORIZON_API UHorizonLoadoutSubsystem : public UGameInstanceSubsystem
{
    GENERATED_BODY()

public:
    virtual void Initialize(FSubsystemCollectionBase& Collection) override;

    UPROPERTY(BlueprintAssignable)
    FHorizonLoadoutChanged OnLoadoutChanged;

    UFUNCTION(BlueprintPure, Category="Horizon|Loadout")
    FHorizonPlayerLoadout GetLoadout() const;

    UFUNCTION(BlueprintCallable, Category="Horizon|Loadout")
    void SetCharacter(const FString& CharacterKey, const FString& SkinKey);

    UFUNCTION(BlueprintCallable, Category="Horizon|Loadout")
    void SetWeapons(const FString& PrimaryKey, const FString& SecondaryKey, const FString& MeleeKey);

    UFUNCTION(BlueprintCallable, Category="Horizon|Loadout")
    void SetEmoteWheel(const TArray<FString>& Emotes);

    UFUNCTION(BlueprintCallable, Category="Horizon|Loadout")
    void SetSprayWheel(const TArray<FString>& Sprays);

    UFUNCTION(BlueprintCallable, Category="Horizon|Loadout")
    void ResetToDefaults();

private:
    static const TCHAR* SaveSlot;

    UPROPERTY()
    TObjectPtr<UHorizonLoadoutSaveGame> State;

    void SaveState();
    void BroadcastChanged();
};
