#include "BPInventoryComponent.h"
#include "BPExplorerMovementComponent.h"
#include "GameFramework/Character.h"

UBPInventoryComponent::UBPInventoryComponent()
{
    PrimaryComponentTick.bCanEverTick = false;
}

float UBPInventoryComponent::GetTotalWeightKg() const
{
    double Weight = 0.0;
    for (const FBPInventoryItem& Item : Items) Weight += Item.GetTotalWeightKg();
    return static_cast<float>(Weight);
}

float UBPInventoryComponent::GetWeightRatio() const
{
    return BackpackCapacityKg > 0.0f ? FMath::Clamp(GetTotalWeightKg()/BackpackCapacityKg,0.0f,1.0f) : 1.0f;
}

int32 UBPInventoryComponent::GetUsedSlots() const
{
    return Items.Num();
}

bool UBPInventoryComponent::TryAddItem(const FBPInventoryItem& Item)
{
    if (Item.ItemId.IsNone() || Item.Quantity <= 0 || Item.UnitWeightKg < 0.0f) return false;
    if (GetTotalWeightKg()+Item.GetTotalWeightKg()>BackpackCapacityKg) return false;

    int32 ExistingStackSpace=0;
    for (const FBPInventoryItem& Existing:Items)
        if (Existing.ItemId==Item.ItemId && Existing.UnitWeightKg==Item.UnitWeightKg)
            ExistingStackSpace+=FMath::Max(0,Existing.MaxStack-Existing.Quantity);
    const int32 NewStacks=FMath::CeilToInt(static_cast<float>(FMath::Max(0,Item.Quantity-ExistingStackSpace))/FMath::Max(1,Item.MaxStack));
    if (GetUsedSlots()+NewStacks>BackpackSlotCapacity) return false;

    int32 Remaining=Item.Quantity;
    for (FBPInventoryItem& Existing:Items)
    {
        if (Existing.ItemId!=Item.ItemId || Existing.Quantity>=Existing.MaxStack) continue;
        const int32 Added=FMath::Min(Remaining,Existing.MaxStack-Existing.Quantity);
        Existing.Quantity+=Added;
        Remaining-=Added;
        if (Remaining<=0) break;
    }
    while (Remaining>0)
    {
        FBPInventoryItem NewStack=Item;
        NewStack.Quantity=FMath::Min(Remaining,FMath::Max(1,Item.MaxStack));
        Items.Add(MoveTemp(NewStack));
        Remaining-=Items.Last().Quantity;
    }
    BroadcastWeight();
    return true;
}

bool UBPInventoryComponent::RemoveItem(FName ItemId, int32 Quantity)
{
    if (ItemId.IsNone() || Quantity<=0) return false;
    int32 Remaining=Quantity;
    for (int32 I=Items.Num()-1;I>=0 && Remaining>0;--I)
    {
        if (Items[I].ItemId!=ItemId) continue;
        const int32 Removed=FMath::Min(Remaining,Items[I].Quantity);
        Items[I].Quantity-=Removed;
        Remaining-=Removed;
        if (Items[I].Quantity<=0) Items.RemoveAt(I);
    }
    if (Remaining==Quantity) return false;
    BroadcastWeight();
    return true;
}

void UBPInventoryComponent::SetBackpackCapacity(float CapacityKg, int32 SlotCapacity)
{
    BackpackCapacityKg=FMath::Max(1.0f,CapacityKg);
    BackpackSlotCapacity=FMath::Max(1,SlotCapacity);
    BroadcastWeight();
}

void UBPInventoryComponent::BroadcastWeight()
{
    const float Weight=GetTotalWeightKg();
    OnInventoryWeightChanged.Broadcast(Weight,BackpackCapacityKg);
    PushWeightToMovement();
}

void UBPInventoryComponent::PushWeightToMovement() const
{
    if (ACharacter* Character=Cast<ACharacter>(GetOwner()))
        if (UBPExplorerMovementComponent* Movement=Cast<UBPExplorerMovementComponent>(Character->GetCharacterMovement()))
            Movement->SetCarryWeight(GetTotalWeightKg(),BackpackCapacityKg);
}