#pragma once

#include "CoreMinimal.h"
#include "GameFramework/SaveGame.h"
#include "Subsystems/GameInstanceSubsystem.h"
#include "HorizonLootSubsystem.generated.h"

UENUM(BlueprintType)
enum class EHorizonLootSource : uint8
{
    WorldContainer,
    Enemy,
    EliteEnemy,
    Boss,
    Quest
};

USTRUCT(BlueprintType)
struct FHorizonLootStack
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    FName ItemKey = NAME_None;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, meta=(ClampMin="1"))
    int32 Quantity = 1;
};

USTRUCT(BlueprintType)
struct FHorizonLootContext
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    FGuid DropId;

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    int32 Seed = 0;

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    EHorizonLootSource Source = EHorizonLootSource::WorldContainer;

    // Supplied by bounded encounter progression, never purchases or entitlements.
    UPROPERTY(EditAnywhere, BlueprintReadWrite, meta=(ClampMin="-0.25", ClampMax="0.50"))
    float QualityBias = 0.0f;
};

USTRUCT(BlueprintType)
struct FHorizonLootDrop
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadOnly)
    FGuid DropId;

    UPROPERTY(BlueprintReadOnly)
    TArray<FHorizonLootStack> Stacks;

    UPROPERTY(BlueprintReadOnly)
    bool bGameplayEarned = true;
};

USTRUCT(BlueprintType)
struct FHorizonLootCollectionResult
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadOnly)
    TArray<FHorizonLootStack> Collected;

    UPROPERTY(BlueprintReadOnly)
    TArray<FHorizonLootStack> Deferred;

    UPROPERTY(BlueprintReadOnly)
    bool bAlreadyClaimed = false;
};

USTRUCT(BlueprintType)
struct FHorizonDeferredLootDrop
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadOnly)
    FGuid DropId;

    UPROPERTY(BlueprintReadOnly)
    TArray<FHorizonLootStack> Stacks;
};

UCLASS()
class BRIDGEPOINTHORIZON_API UHorizonLootSaveGame : public USaveGame
{
    GENERATED_BODY()

public:
    UPROPERTY()
    TArray<FGuid> ClaimedDropIds;

    UPROPERTY()
    TArray<FHorizonDeferredLootDrop> DeferredDrops;
};

UCLASS()
class BRIDGEPOINTHORIZON_API UHorizonLootSubsystem : public UGameInstanceSubsystem
{
    GENERATED_BODY()

public:
    virtual void Initialize(FSubsystemCollectionBase& Collection) override;

    UFUNCTION(BlueprintPure, Category="Horizon|Loot")
    FHorizonLootDrop GenerateDrop(const FHorizonLootContext& Context) const;

    UFUNCTION(BlueprintCallable, Category="Horizon|Loot")
    FHorizonLootCollectionResult CollectDrop(const FHorizonLootDrop& Drop);

    UFUNCTION(BlueprintCallable, Category="Horizon|Loot")
    FHorizonLootCollectionResult ClaimDeferredDrop(FGuid DropId);

    UFUNCTION(BlueprintPure, Category="Horizon|Loot")
    TArray<FHorizonDeferredLootDrop> GetDeferredDrops() const;

    static FHorizonLootDrop RollLoot(const FHorizonLootContext& Context);
    static void SplitLootByCapacity(
        const TArray<FHorizonLootStack>& Stacks,
        const TMap<FName, int32>& ExistingInventory,
        float CarryCapacityKg,
        TArray<FHorizonLootStack>& OutAccepted,
        TArray<FHorizonLootStack>& OutRemainder);

private:
    static const TCHAR* SaveSlot;

    UPROPERTY()
    TObjectPtr<UHorizonLootSaveGame> State;

    int32 FindDeferredDrop(FGuid DropId) const;
    void SaveState();
};
