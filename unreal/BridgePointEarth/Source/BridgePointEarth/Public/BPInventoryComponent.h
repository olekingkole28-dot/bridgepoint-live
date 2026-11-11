#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "BPInventoryComponent.generated.h"

USTRUCT(BlueprintType)
struct FBPInventoryItem
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadWrite) FName ItemId = NAME_None;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) FText DisplayName;
    UPROPERTY(EditAnywhere, BlueprintReadWrite, meta=(ClampMin="0.0")) float UnitWeightKg = 0.0f;
    UPROPERTY(EditAnywhere, BlueprintReadWrite, meta=(ClampMin="1")) int32 Quantity = 1;
    UPROPERTY(EditAnywhere, BlueprintReadWrite, meta=(ClampMin="1")) int32 MaxStack = 1;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) TArray<FName> Tags;

    double GetTotalWeightKg() const { return FMath::Max(0.0, UnitWeightKg) * FMath::Max(0, Quantity); }
};

DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FBPInventoryWeightChanged, float, TotalWeightKg, float, CapacityKg);

UCLASS(ClassGroup=(BridgePoint), meta=(BlueprintSpawnableComponent))
class BRIDGEPOINTEARTH_API UBPInventoryComponent : public UActorComponent
{
    GENERATED_BODY()

public:
    UBPInventoryComponent();

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="BridgePoint|Inventory")
    float BackpackCapacityKg = 30.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="BridgePoint|Inventory")
    int32 BackpackSlotCapacity = 36;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="BridgePoint|Inventory")
    TArray<FBPInventoryItem> Items;

    UPROPERTY(BlueprintAssignable, Category="BridgePoint|Inventory")
    FBPInventoryWeightChanged OnInventoryWeightChanged;

    UFUNCTION(BlueprintCallable, Category="BridgePoint|Inventory")
    bool TryAddItem(const FBPInventoryItem& Item);

    UFUNCTION(BlueprintCallable, Category="BridgePoint|Inventory")
    bool RemoveItem(FName ItemId, int32 Quantity = 1);

    UFUNCTION(BlueprintCallable, Category="BridgePoint|Inventory")
    void SetBackpackCapacity(float CapacityKg, int32 SlotCapacity);

    UFUNCTION(BlueprintPure, Category="BridgePoint|Inventory")
    float GetTotalWeightKg() const;

    UFUNCTION(BlueprintPure, Category="BridgePoint|Inventory")
    float GetWeightRatio() const;

    UFUNCTION(BlueprintPure, Category="BridgePoint|Inventory")
    int32 GetUsedSlots() const;

private:
    void BroadcastWeight();
    void PushWeightToMovement() const;
};