#include "HorizonSurvivalSubsystem.h"

#include "Kismet/GameplayStatics.h"

#include <initializer_list>

const TCHAR* UHorizonSurvivalSubsystem::SaveSlot = TEXT("BridgePointHorizonSurvival");

void UHorizonSurvivalSubsystem::Initialize(FSubsystemCollectionBase& Collection)
{
    Super::Initialize(Collection);

    if (USaveGame* Loaded = UGameplayStatics::LoadGameFromSlot(SaveSlot, 0))
    {
        State = Cast<UHorizonSurvivalSaveGame>(Loaded);
    }

    if (!State)
    {
        State = Cast<UHorizonSurvivalSaveGame>(
            UGameplayStatics::CreateSaveGameObject(UHorizonSurvivalSaveGame::StaticClass()));
        State->Inventory.Add(TEXT("ration"), 2);
        State->Inventory.Add(TEXT("clean_water"), 2);
        State->Inventory.Add(TEXT("bandage"), 1);
        SaveState();
    }
}

float UHorizonSurvivalSubsystem::GetItemUnitWeightKg(FName ItemKey)
{
    if (ItemKey == TEXT("wood")) return 0.70f;
    if (ItemKey == TEXT("stone")) return 1.00f;
    if (ItemKey == TEXT("cloth")) return 0.15f;
    if (ItemKey == TEXT("charcoal")) return 0.20f;
    if (ItemKey == TEXT("scrap_metal")) return 0.90f;
    if (ItemKey == TEXT("clean_water")) return 1.00f;
    if (ItemKey == TEXT("ration")) return 0.40f;
    if (ItemKey == TEXT("bandage")) return 0.15f;
    if (ItemKey == TEXT("campfire_kit")) return 4.20f;
    if (ItemKey == TEXT("water_filter")) return 0.80f;
    if (ItemKey == TEXT("repair_kit")) return 1.80f;
    return 0.0f;
}

float UHorizonSurvivalSubsystem::ComputeInventoryWeightKg(
    const TMap<FName, int32>& Inventory)
{
    float Total = 0.0f;
    for (const TPair<FName, int32>& Entry : Inventory)
    {
        Total += GetItemUnitWeightKg(Entry.Key) * FMath::Max(0, Entry.Value);
    }
    return FMath::Max(0.0f, Total);
}

bool UHorizonSurvivalSubsystem::CanAffordIngredients(
    const TMap<FName, int32>& Inventory,
    const TArray<FHorizonCraftingIngredient>& Items)
{
    if (Items.IsEmpty())
    {
        return false;
    }

    TMap<FName, int32> Required;
    for (const FHorizonCraftingIngredient& Ingredient : Items)
    {
        if (Ingredient.ItemKey.IsNone() || Ingredient.Quantity <= 0)
        {
            return false;
        }

        int32& TotalRequired = Required.FindOrAdd(Ingredient.ItemKey);
        if (TotalRequired > MAX_int32 - Ingredient.Quantity)
        {
            return false;
        }
        TotalRequired += Ingredient.Quantity;
    }

    for (const TPair<FName, int32>& Requirement : Required)
    {
        const int32* Available = Inventory.Find(Requirement.Key);
        if (!Available || *Available < Requirement.Value)
        {
            return false;
        }
    }
    return true;
}

bool UHorizonSurvivalSubsystem::CanAffordRecipe(
    const TMap<FName, int32>& Inventory,
    const FHorizonCraftingRecipe& Recipe)
{
    return !Recipe.OutputItemKey.IsNone() &&
        Recipe.OutputQuantity > 0 &&
        CanAffordIngredients(Inventory, Recipe.Ingredients);
}

bool UHorizonSurvivalSubsystem::TryBuildInventoryAfterAddition(
    const TMap<FName, int32>& Inventory,
    const TArray<FHorizonCraftingIngredient>& Items,
    float CarryCapacityKg,
    TMap<FName, int32>& OutInventory)
{
    OutInventory.Reset();
    if (Items.IsEmpty())
    {
        return false;
    }

    TMap<FName, int32> Additions;
    for (const FHorizonCraftingIngredient& Item : Items)
    {
        if (Item.ItemKey.IsNone() ||
            Item.Quantity <= 0 ||
            GetItemUnitWeightKg(Item.ItemKey) <= KINDA_SMALL_NUMBER)
        {
            return false;
        }

        int32& Total = Additions.FindOrAdd(Item.ItemKey);
        if (Total > MAX_int32 - Item.Quantity)
        {
            return false;
        }
        Total += Item.Quantity;
    }

    TMap<FName, int32> ResultInventory = Inventory;
    for (const TPair<FName, int32>& Addition : Additions)
    {
        int32& Existing = ResultInventory.FindOrAdd(Addition.Key);
        if (Existing < 0 || Existing > MAX_int32 - Addition.Value)
        {
            return false;
        }
        Existing += Addition.Value;
    }

    const float Capacity = FMath::Clamp(CarryCapacityKg, 1.0f, 100.0f);
    if (ComputeInventoryWeightKg(ResultInventory) > Capacity + KINDA_SMALL_NUMBER)
    {
        return false;
    }

    OutInventory = MoveTemp(ResultInventory);
    return true;
}

FHorizonSurvivalState UHorizonSurvivalSubsystem::SimulateNeeds(
    const FHorizonSurvivalState& Input,
    float DeltaHours,
    bool bSprinting,
    bool bInShelter)
{
    FHorizonSurvivalState Result = Input;
    const float Hours = FMath::Clamp(DeltaHours, 0.0f, 24.0f);
    const float SprintHungerMultiplier = bSprinting ? 1.60f : 1.0f;
    const float SprintThirstMultiplier = bSprinting ? 1.90f : 1.0f;
    const float ShelterHungerMultiplier = bInShelter ? 0.78f : 1.0f;
    const float ShelterThirstMultiplier = bInShelter ? 0.82f : 1.0f;

    Result.Hunger01 = FMath::Clamp(
        Input.Hunger01 - Hours * 0.035f * SprintHungerMultiplier * ShelterHungerMultiplier,
        0.0f,
        1.0f);
    Result.Thirst01 = FMath::Clamp(
        Input.Thirst01 - Hours * 0.055f * SprintThirstMultiplier * ShelterThirstMultiplier,
        0.0f,
        1.0f);

    float DeprivationDamagePerHour = 0.0f;
    if (Result.Hunger01 <= KINDA_SMALL_NUMBER)
    {
        DeprivationDamagePerHour += 0.06f;
    }
    if (Result.Thirst01 <= KINDA_SMALL_NUMBER)
    {
        DeprivationDamagePerHour += 0.10f;
    }
    Result.Health01 = FMath::Clamp(
        Input.Health01 - Hours * DeprivationDamagePerHour,
        0.0f,
        1.0f);
    return Result;
}

FHorizonSurvivalState UHorizonSurvivalSubsystem::GetSurvivalState() const
{
    FHorizonSurvivalState Result;
    Result.CarryCapacityKg = FMath::Clamp(CarryCapacityKg, 1.0f, 100.0f);
    if (State)
    {
        Result.Inventory = State->Inventory;
        Result.Hunger01 = State->Hunger01;
        Result.Thirst01 = State->Thirst01;
        Result.Health01 = State->Health01;
        Result.CarriedWeightKg = ComputeInventoryWeightKg(State->Inventory);
    }
    return Result;
}

int32 UHorizonSurvivalSubsystem::GetItemQuantity(FName ItemKey) const
{
    if (!State)
    {
        return 0;
    }

    const int32* Quantity = State->Inventory.Find(ItemKey);
    return Quantity ? FMath::Max(0, *Quantity) : 0;
}

int32 UHorizonSurvivalSubsystem::TryAddItem(FName ItemKey, int32 RequestedQuantity)
{
    if (!State || ItemKey.IsNone() || RequestedQuantity <= 0)
    {
        return 0;
    }

    const float UnitWeight = GetItemUnitWeightKg(ItemKey);
    if (UnitWeight <= KINDA_SMALL_NUMBER)
    {
        return 0;
    }

    const float Capacity = FMath::Clamp(CarryCapacityKg, 1.0f, 100.0f);
    const float AvailableWeight = FMath::Max(
        0.0f,
        Capacity - ComputeInventoryWeightKg(State->Inventory));
    const int32 WeightLimitedQuantity = FMath::FloorToInt(AvailableWeight / UnitWeight);
    const int32 AddedQuantity = FMath::Clamp(
        RequestedQuantity,
        0,
        WeightLimitedQuantity);

    if (AddedQuantity <= 0)
    {
        return 0;
    }

    State->Inventory.FindOrAdd(ItemKey) += AddedQuantity;
    SaveState();
    BroadcastChanged();
    return AddedQuantity;
}

bool UHorizonSurvivalSubsystem::TryRemoveItem(FName ItemKey, int32 Quantity)
{
    if (!State || ItemKey.IsNone() || Quantity <= 0)
    {
        return false;
    }

    int32* Available = State->Inventory.Find(ItemKey);
    if (!Available || *Available < Quantity)
    {
        return false;
    }

    *Available -= Quantity;
    if (*Available <= 0)
    {
        State->Inventory.Remove(ItemKey);
    }
    SaveState();
    BroadcastChanged();
    return true;
}

bool UHorizonSurvivalSubsystem::TryAddItemsAtomically(
    const TArray<FHorizonCraftingIngredient>& Items)
{
    if (!State)
    {
        return false;
    }

    TMap<FName, int32> ResultInventory;
    if (!TryBuildInventoryAfterAddition(
            State->Inventory,
            Items,
            CarryCapacityKg,
            ResultInventory))
    {
        return false;
    }

    State->Inventory = MoveTemp(ResultInventory);
    SaveState();
    BroadcastChanged();
    return true;
}

bool UHorizonSurvivalSubsystem::TryConsumeItemsAtomically(
    const TArray<FHorizonCraftingIngredient>& Items)
{
    if (!State || !CanAffordIngredients(State->Inventory, Items))
    {
        return false;
    }

    TMap<FName, int32> ResultInventory = State->Inventory;
    TMap<FName, int32> Required;
    for (const FHorizonCraftingIngredient& Item : Items)
    {
        Required.FindOrAdd(Item.ItemKey) += Item.Quantity;
    }

    for (const TPair<FName, int32>& Requirement : Required)
    {
        int32& Quantity = ResultInventory.FindChecked(Requirement.Key);
        Quantity -= Requirement.Value;
        if (Quantity <= 0)
        {
            ResultInventory.Remove(Requirement.Key);
        }
    }

    State->Inventory = MoveTemp(ResultInventory);
    SaveState();
    BroadcastChanged();
    return true;
}

TArray<FHorizonCraftingRecipe> UHorizonSurvivalSubsystem::GetDefaultRecipes() const
{
    TArray<FHorizonCraftingRecipe> Recipes;

    auto AddRecipe = [&Recipes](
        FName RecipeKey,
        FName OutputKey,
        int32 OutputQuantity,
        std::initializer_list<TPair<FName, int32>> IngredientPairs)
    {
        FHorizonCraftingRecipe Recipe;
        Recipe.RecipeKey = RecipeKey;
        Recipe.OutputItemKey = OutputKey;
        Recipe.OutputQuantity = OutputQuantity;
        for (const TPair<FName, int32>& Pair : IngredientPairs)
        {
            FHorizonCraftingIngredient Ingredient;
            Ingredient.ItemKey = Pair.Key;
            Ingredient.Quantity = Pair.Value;
            Recipe.Ingredients.Add(Ingredient);
        }
        Recipes.Add(Recipe);
    };

    AddRecipe(TEXT("craft_bandage"), TEXT("bandage"), 1, {{TEXT("cloth"), 2}});
    AddRecipe(TEXT("craft_campfire"), TEXT("campfire_kit"), 1,
        {{TEXT("wood"), 4}, {TEXT("stone"), 3}});
    AddRecipe(TEXT("craft_water_filter"), TEXT("water_filter"), 1,
        {{TEXT("cloth"), 1}, {TEXT("charcoal"), 2}});
    AddRecipe(TEXT("craft_repair_kit"), TEXT("repair_kit"), 1,
        {{TEXT("scrap_metal"), 2}, {TEXT("cloth"), 1}});
    return Recipes;
}

bool UHorizonSurvivalSubsystem::FindRecipe(
    FName RecipeKey,
    FHorizonCraftingRecipe& OutRecipe) const
{
    for (const FHorizonCraftingRecipe& Recipe : GetDefaultRecipes())
    {
        if (Recipe.RecipeKey == RecipeKey)
        {
            OutRecipe = Recipe;
            return true;
        }
    }
    return false;
}

bool UHorizonSurvivalSubsystem::TryCraft(FName RecipeKey)
{
    if (!State)
    {
        return false;
    }

    FHorizonCraftingRecipe Recipe;
    if (!FindRecipe(RecipeKey, Recipe) || !CanAffordRecipe(State->Inventory, Recipe))
    {
        return false;
    }

    // Build the complete result first. A failed capacity check consumes nothing.
    TMap<FName, int32> ResultInventory = State->Inventory;
    for (const FHorizonCraftingIngredient& Ingredient : Recipe.Ingredients)
    {
        int32& Quantity = ResultInventory.FindChecked(Ingredient.ItemKey);
        Quantity -= Ingredient.Quantity;
        if (Quantity <= 0)
        {
            ResultInventory.Remove(Ingredient.ItemKey);
        }
    }
    ResultInventory.FindOrAdd(Recipe.OutputItemKey) += Recipe.OutputQuantity;

    const float Capacity = FMath::Clamp(CarryCapacityKg, 1.0f, 100.0f);
    if (ComputeInventoryWeightKg(ResultInventory) > Capacity + KINDA_SMALL_NUMBER)
    {
        return false;
    }

    State->Inventory = MoveTemp(ResultInventory);
    SaveState();
    BroadcastChanged();
    return true;
}

bool UHorizonSurvivalSubsystem::ConsumeItem(FName ItemKey)
{
    if (!State || GetItemQuantity(ItemKey) <= 0)
    {
        return false;
    }

    if (ItemKey == TEXT("ration"))
    {
        State->Hunger01 = FMath::Clamp(State->Hunger01 + 0.30f, 0.0f, 1.0f);
    }
    else if (ItemKey == TEXT("clean_water"))
    {
        State->Thirst01 = FMath::Clamp(State->Thirst01 + 0.40f, 0.0f, 1.0f);
    }
    else if (ItemKey == TEXT("bandage"))
    {
        State->Health01 = FMath::Clamp(State->Health01 + 0.25f, 0.0f, 1.0f);
    }
    else
    {
        return false;
    }

    int32& Quantity = State->Inventory.FindChecked(ItemKey);
    --Quantity;
    if (Quantity <= 0)
    {
        State->Inventory.Remove(ItemKey);
    }
    SaveState();
    BroadcastChanged();
    return true;
}

void UHorizonSurvivalSubsystem::AdvanceSurvivalHours(
    float DeltaHours,
    bool bSprinting,
    bool bInShelter)
{
    if (!State || DeltaHours <= 0.0f)
    {
        return;
    }

    const FHorizonSurvivalState Next = SimulateNeeds(
        GetSurvivalState(),
        DeltaHours,
        bSprinting,
        bInShelter);
    State->Hunger01 = Next.Hunger01;
    State->Thirst01 = Next.Thirst01;
    State->Health01 = Next.Health01;
    SaveState();
    BroadcastChanged();
}

void UHorizonSurvivalSubsystem::ResetForNewSurvivor()
{
    if (!State)
    {
        State = Cast<UHorizonSurvivalSaveGame>(
            UGameplayStatics::CreateSaveGameObject(UHorizonSurvivalSaveGame::StaticClass()));
    }

    State->Inventory.Reset();
    State->Inventory.Add(TEXT("ration"), 2);
    State->Inventory.Add(TEXT("clean_water"), 2);
    State->Inventory.Add(TEXT("bandage"), 1);
    State->Hunger01 = 1.0f;
    State->Thirst01 = 1.0f;
    State->Health01 = 1.0f;
    SaveState();
    BroadcastChanged();
}

void UHorizonSurvivalSubsystem::SaveState()
{
    if (State)
    {
        UGameplayStatics::SaveGameToSlot(State, SaveSlot, 0);
    }
}

void UHorizonSurvivalSubsystem::BroadcastChanged()
{
    OnSurvivalStateChanged.Broadcast(GetSurvivalState());
}
