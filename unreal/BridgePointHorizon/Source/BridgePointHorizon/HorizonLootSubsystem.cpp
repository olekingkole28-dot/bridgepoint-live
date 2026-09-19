#include "HorizonLootSubsystem.h"

#include "HorizonSurvivalSubsystem.h"
#include "Engine/GameInstance.h"
#include "Kismet/GameplayStatics.h"

const TCHAR* UHorizonLootSubsystem::SaveSlot = TEXT("BridgePointHorizonLoot");

namespace HorizonLoot
{
struct FCandidate
{
    FName ItemKey;
    float Weight;
    int32 MinimumQuantity;
    int32 MaximumQuantity;
};

static void AddOrMerge(TArray<FHorizonLootStack>& Stacks, FName ItemKey, int32 Quantity)
{
    if (ItemKey.IsNone() || Quantity <= 0)
    {
        return;
    }

    for (FHorizonLootStack& Stack : Stacks)
    {
        if (Stack.ItemKey == ItemKey)
        {
            Stack.Quantity = Stack.Quantity > MAX_int32 - Quantity
                ? MAX_int32
                : Stack.Quantity + Quantity;
            return;
        }
    }

    FHorizonLootStack Stack;
    Stack.ItemKey = ItemKey;
    Stack.Quantity = Quantity;
    Stacks.Add(Stack);
}

static int32 SourceBonus(EHorizonLootSource Source)
{
    switch (Source)
    {
        case EHorizonLootSource::EliteEnemy: return 1;
        case EHorizonLootSource::Boss: return 2;
        case EHorizonLootSource::Quest: return 1;
        default: return 0;
    }
}
}

void UHorizonLootSubsystem::Initialize(FSubsystemCollectionBase& Collection)
{
    Super::Initialize(Collection);

    if (USaveGame* Loaded = UGameplayStatics::LoadGameFromSlot(SaveSlot, 0))
    {
        State = Cast<UHorizonLootSaveGame>(Loaded);
    }

    if (!State)
    {
        State = Cast<UHorizonLootSaveGame>(
            UGameplayStatics::CreateSaveGameObject(UHorizonLootSaveGame::StaticClass()));
        SaveState();
    }
}

FHorizonLootDrop UHorizonLootSubsystem::RollLoot(const FHorizonLootContext& Context)
{
    FHorizonLootDrop Drop;
    Drop.DropId = Context.DropId;
    Drop.bGameplayEarned = true;
    if (!Context.DropId.IsValid())
    {
        return Drop;
    }

    const float Quality = FMath::Clamp(Context.QualityBias, -0.25f, 0.50f);
    const float PositiveQuality = FMath::Max(0.0f, Quality);
    const int32 RollCount = FMath::Clamp(
        1 + HorizonLoot::SourceBonus(Context.Source) +
            FMath::FloorToInt(PositiveQuality * 4.0f),
        1,
        5);

    TArray<HorizonLoot::FCandidate> Candidates = {
        {TEXT("wood"), 20.0f, 1, 3},
        {TEXT("stone"), 15.0f, 1, 2},
        {TEXT("cloth"), 19.0f, 1, 3},
        {TEXT("scrap_metal"), 17.0f, 1, 2},
        {TEXT("ration"), 9.0f + PositiveQuality * 3.0f, 1, 2},
        {TEXT("clean_water"), 9.0f + PositiveQuality * 3.0f, 1, 2},
        {TEXT("bandage"), 5.0f + PositiveQuality * 7.0f, 1, 2},
        {TEXT("repair_kit"), 1.0f + PositiveQuality * 6.0f, 1, 1}
    };

    if (Context.Source == EHorizonLootSource::Enemy)
    {
        Candidates[0].Weight *= 0.35f;
        Candidates[1].Weight *= 0.35f;
    }
    else if (Context.Source == EHorizonLootSource::Boss)
    {
        Candidates[6].Weight += 6.0f;
        Candidates[7].Weight += 8.0f;
    }

    float TotalWeight = 0.0f;
    for (const HorizonLoot::FCandidate& Candidate : Candidates)
    {
        TotalWeight += Candidate.Weight;
    }

    FRandomStream Stream(Context.Seed ^ static_cast<int32>(GetTypeHash(Context.DropId)));
    for (int32 RollIndex = 0; RollIndex < RollCount; ++RollIndex)
    {
        float Selection = Stream.FRandRange(0.0f, TotalWeight);
        const HorizonLoot::FCandidate* Chosen = &Candidates.Last();
        for (const HorizonLoot::FCandidate& Candidate : Candidates)
        {
            Selection -= Candidate.Weight;
            if (Selection <= 0.0f)
            {
                Chosen = &Candidate;
                break;
            }
        }

        const int32 QualityQuantityBonus =
            PositiveQuality >= 0.35f && Stream.FRand() < PositiveQuality ? 1 : 0;
        HorizonLoot::AddOrMerge(
            Drop.Stacks,
            Chosen->ItemKey,
            Stream.RandRange(Chosen->MinimumQuantity, Chosen->MaximumQuantity) +
                QualityQuantityBonus);
    }

    return Drop;
}

FHorizonLootDrop UHorizonLootSubsystem::GenerateDrop(
    const FHorizonLootContext& Context) const
{
    return RollLoot(Context);
}

void UHorizonLootSubsystem::SplitLootByCapacity(
    const TArray<FHorizonLootStack>& Stacks,
    const TMap<FName, int32>& ExistingInventory,
    float CarryCapacityKg,
    TArray<FHorizonLootStack>& OutAccepted,
    TArray<FHorizonLootStack>& OutRemainder)
{
    OutAccepted.Reset();
    OutRemainder.Reset();

    const float Capacity = FMath::Clamp(CarryCapacityKg, 1.0f, 100.0f);
    float AvailableWeight = FMath::Max(
        0.0f,
        Capacity - UHorizonSurvivalSubsystem::ComputeInventoryWeightKg(ExistingInventory));

    for (const FHorizonLootStack& Stack : Stacks)
    {
        const float UnitWeight =
            UHorizonSurvivalSubsystem::GetItemUnitWeightKg(Stack.ItemKey);
        if (Stack.ItemKey.IsNone() || Stack.Quantity <= 0 ||
            UnitWeight <= KINDA_SMALL_NUMBER)
        {
            HorizonLoot::AddOrMerge(
                OutRemainder,
                Stack.ItemKey,
                FMath::Max(0, Stack.Quantity));
            continue;
        }

        const int32 CapacityQuantity =
            FMath::Max(0, FMath::FloorToInt((AvailableWeight + KINDA_SMALL_NUMBER) / UnitWeight));
        const int32 AcceptedQuantity = FMath::Min(Stack.Quantity, CapacityQuantity);
        HorizonLoot::AddOrMerge(OutAccepted, Stack.ItemKey, AcceptedQuantity);
        HorizonLoot::AddOrMerge(
            OutRemainder,
            Stack.ItemKey,
            Stack.Quantity - AcceptedQuantity);
        AvailableWeight = FMath::Max(
            0.0f,
            AvailableWeight - AcceptedQuantity * UnitWeight);
    }
}

FHorizonLootCollectionResult UHorizonLootSubsystem::CollectDrop(
    const FHorizonLootDrop& Drop)
{
    FHorizonLootCollectionResult Result;
    if (!State || !Drop.DropId.IsValid() || !Drop.bGameplayEarned ||
        State->ClaimedDropIds.Contains(Drop.DropId) ||
        FindDeferredDrop(Drop.DropId) != INDEX_NONE)
    {
        Result.bAlreadyClaimed =
            State && Drop.DropId.IsValid() &&
            (State->ClaimedDropIds.Contains(Drop.DropId) ||
             FindDeferredDrop(Drop.DropId) != INDEX_NONE);
        return Result;
    }

    UGameInstance* GameInstance = GetGameInstance();
    UHorizonSurvivalSubsystem* Survival = GameInstance
        ? GameInstance->GetSubsystem<UHorizonSurvivalSubsystem>()
        : nullptr;
    if (!Survival)
    {
        return Result;
    }

    const FHorizonSurvivalState SurvivalState = Survival->GetSurvivalState();
    TArray<FHorizonLootStack> Planned;
    SplitLootByCapacity(
        Drop.Stacks,
        SurvivalState.Inventory,
        SurvivalState.CarryCapacityKg,
        Planned,
        Result.Deferred);

    TArray<FHorizonCraftingIngredient> AtomicAdditions;
    AtomicAdditions.Reserve(Planned.Num());
    for (const FHorizonLootStack& Stack : Planned)
    {
        FHorizonCraftingIngredient Addition;
        Addition.ItemKey = Stack.ItemKey;
        Addition.Quantity = Stack.Quantity;
        AtomicAdditions.Add(Addition);
    }

    if (!AtomicAdditions.IsEmpty() &&
        Survival->TryAddItemsAtomically(AtomicAdditions))
    {
        Result.Collected = Planned;
    }
    else
    {
        for (const FHorizonLootStack& Stack : Planned)
        {
            HorizonLoot::AddOrMerge(
                Result.Deferred,
                Stack.ItemKey,
                Stack.Quantity);
        }
    }

    State->ClaimedDropIds.Add(Drop.DropId);
    if (!Result.Deferred.IsEmpty())
    {
        FHorizonDeferredLootDrop Deferred;
        Deferred.DropId = Drop.DropId;
        Deferred.Stacks = Result.Deferred;
        State->DeferredDrops.Add(MoveTemp(Deferred));
    }
    SaveState();
    return Result;
}

FHorizonLootCollectionResult UHorizonLootSubsystem::ClaimDeferredDrop(FGuid DropId)
{
    FHorizonLootCollectionResult Result;
    const int32 DeferredIndex = FindDeferredDrop(DropId);
    if (!State || DeferredIndex == INDEX_NONE)
    {
        return Result;
    }

    UGameInstance* GameInstance = GetGameInstance();
    UHorizonSurvivalSubsystem* Survival = GameInstance
        ? GameInstance->GetSubsystem<UHorizonSurvivalSubsystem>()
        : nullptr;
    if (!Survival)
    {
        return Result;
    }

    const FHorizonSurvivalState SurvivalState = Survival->GetSurvivalState();
    TArray<FHorizonLootStack> Planned;
    SplitLootByCapacity(
        State->DeferredDrops[DeferredIndex].Stacks,
        SurvivalState.Inventory,
        SurvivalState.CarryCapacityKg,
        Planned,
        Result.Deferred);

    TArray<FHorizonCraftingIngredient> AtomicAdditions;
    AtomicAdditions.Reserve(Planned.Num());
    for (const FHorizonLootStack& Stack : Planned)
    {
        FHorizonCraftingIngredient Addition;
        Addition.ItemKey = Stack.ItemKey;
        Addition.Quantity = Stack.Quantity;
        AtomicAdditions.Add(Addition);
    }

    if (!AtomicAdditions.IsEmpty() &&
        Survival->TryAddItemsAtomically(AtomicAdditions))
    {
        Result.Collected = Planned;
    }
    else
    {
        for (const FHorizonLootStack& Stack : Planned)
        {
            HorizonLoot::AddOrMerge(
                Result.Deferred,
                Stack.ItemKey,
                Stack.Quantity);
        }
    }

    if (Result.Deferred.IsEmpty())
    {
        State->DeferredDrops.RemoveAt(DeferredIndex);
    }
    else
    {
        State->DeferredDrops[DeferredIndex].Stacks = Result.Deferred;
    }
    SaveState();
    return Result;
}

TArray<FHorizonDeferredLootDrop> UHorizonLootSubsystem::GetDeferredDrops() const
{
    return State ? State->DeferredDrops : TArray<FHorizonDeferredLootDrop>();
}

int32 UHorizonLootSubsystem::FindDeferredDrop(FGuid DropId) const
{
    if (!State || !DropId.IsValid())
    {
        return INDEX_NONE;
    }

    for (int32 Index = 0; Index < State->DeferredDrops.Num(); ++Index)
    {
        if (State->DeferredDrops[Index].DropId == DropId)
        {
            return Index;
        }
    }
    return INDEX_NONE;
}

void UHorizonLootSubsystem::SaveState()
{
    if (State)
    {
        UGameplayStatics::SaveGameToSlot(State, SaveSlot, 0);
    }
}
