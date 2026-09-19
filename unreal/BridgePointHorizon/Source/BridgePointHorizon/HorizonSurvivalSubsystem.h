#pragma once

#include "CoreMinimal.h"
#include "GameFramework/SaveGame.h"
#include "Subsystems/GameInstanceSubsystem.h"
#include "HorizonSurvivalSubsystem.generated.h"

USTRUCT(BlueprintType)
struct FHorizonCraftingIngredient
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    FName ItemKey = NAME_None;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, meta=(ClampMin="1"))
    int32 Quantity = 1;
};

USTRUCT(BlueprintType)
struct FHorizonCraftingRecipe
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    FName RecipeKey = NAME_None;

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    TArray<FHorizonCraftingIngredient> Ingredients;

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    FName OutputItemKey = NAME_None;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, meta=(ClampMin="1"))
    int32 OutputQuantity = 1;
};

USTRUCT(BlueprintType)
struct FHorizonSurvivalState
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadOnly)
    TMap<FName, int32> Inventory;

    UPROPERTY(BlueprintReadOnly)
    float Hunger01 = 1.0f;

    UPROPERTY(BlueprintReadOnly)
    float Thirst01 = 1.0f;

    UPROPERTY(BlueprintReadOnly)
    float Health01 = 1.0f;

    UPROPERTY(BlueprintReadOnly)
    float CarriedWeightKg = 0.0f;

    UPROPERTY(BlueprintReadOnly)
    float CarryCapacityKg = 35.0f;
};

UCLASS()
class BRIDGEPOINTHORIZON_API UHorizonSurvivalSaveGame : public USaveGame
{
    GENERATED_BODY()

public:
    UPROPERTY()
    TMap<FName, int32> Inventory;

    UPROPERTY()
    float Hunger01 = 1.0f;

    UPROPERTY()
    float Thirst01 = 1.0f;

    UPROPERTY()
    float Health01 = 1.0f;
};

DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(
    FHorizonSurvivalStateChanged,
    const FHorizonSurvivalState&,
    NewState);

UCLASS()
class BRIDGEPOINTHORIZON_API UHorizonSurvivalSubsystem : public UGameInstanceSubsystem
{
    GENERATED_BODY()

public:
    virtual void Initialize(FSubsystemCollectionBase& Collection) override;

    UPROPERTY(BlueprintAssignable)
    FHorizonSurvivalStateChanged OnSurvivalStateChanged;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Horizon|Survival", meta=(ClampMin="1.0", ClampMax="100.0"))
    float CarryCapacityKg = 35.0f;

    UFUNCTION(BlueprintPure, Category="Horizon|Survival")
    FHorizonSurvivalState GetSurvivalState() const;

    UFUNCTION(BlueprintPure, Category="Horizon|Survival")
    int32 GetItemQuantity(FName ItemKey) const;

    UFUNCTION(BlueprintCallable, Category="Horizon|Survival")
    int32 TryAddItem(FName ItemKey, int32 RequestedQuantity);

    UFUNCTION(BlueprintCallable, Category="Horizon|Survival")
    bool TryRemoveItem(FName ItemKey, int32 Quantity);

    UFUNCTION(BlueprintCallable, Category="Horizon|Survival")
    bool TryAddItemsAtomically(const TArray<FHorizonCraftingIngredient>& Items);

    UFUNCTION(BlueprintCallable, Category="Horizon|Survival")
    bool TryConsumeItemsAtomically(const TArray<FHorizonCraftingIngredient>& Items);

    UFUNCTION(BlueprintCallable, Category="Horizon|Survival")
    bool TryCraft(FName RecipeKey);

    UFUNCTION(BlueprintCallable, Category="Horizon|Survival")
    bool ConsumeItem(FName ItemKey);

    UFUNCTION(BlueprintCallable, Category="Horizon|Survival")
    void AdvanceSurvivalHours(float DeltaHours, bool bSprinting, bool bInShelter);

    UFUNCTION(BlueprintCallable, Category="Horizon|Survival")
    void ResetForNewSurvivor();

    UFUNCTION(BlueprintPure, Category="Horizon|Survival")
    TArray<FHorizonCraftingRecipe> GetDefaultRecipes() const;

    static float GetItemUnitWeightKg(FName ItemKey);
    static float ComputeInventoryWeightKg(const TMap<FName, int32>& Inventory);
    static bool CanAffordIngredients(
        const TMap<FName, int32>& Inventory,
        const TArray<FHorizonCraftingIngredient>& Items);
    static bool CanAffordRecipe(
        const TMap<FName, int32>& Inventory,
        const FHorizonCraftingRecipe& Recipe);
    static bool TryBuildInventoryAfterAddition(
        const TMap<FName, int32>& Inventory,
        const TArray<FHorizonCraftingIngredient>& Items,
        float CarryCapacityKg,
        TMap<FName, int32>& OutInventory);
    static FHorizonSurvivalState SimulateNeeds(
        const FHorizonSurvivalState& Input,
        float DeltaHours,
        bool bSprinting,
        bool bInShelter);

private:
    static const TCHAR* SaveSlot;

    UPROPERTY()
    TObjectPtr<UHorizonSurvivalSaveGame> State;

    bool FindRecipe(FName RecipeKey, FHorizonCraftingRecipe& OutRecipe) const;
    void SaveState();
    void BroadcastChanged();
};
