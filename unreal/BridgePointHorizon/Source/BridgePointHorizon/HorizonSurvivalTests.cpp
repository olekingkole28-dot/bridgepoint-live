#if WITH_DEV_AUTOMATION_TESTS

#include "HorizonSurvivalSubsystem.h"

#include "Misc/AutomationTest.h"

IMPLEMENT_SIMPLE_AUTOMATION_TEST(
    FHorizonCraftingAtomicityTest,
    "BridgePoint.Horizon.Systems.Survival.CraftingAtomicity",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FHorizonCraftingAtomicityTest::RunTest(const FString& Parameters)
{
    FHorizonCraftingRecipe Recipe;
    Recipe.RecipeKey = TEXT("craft_bandage");
    Recipe.OutputItemKey = TEXT("bandage");
    Recipe.OutputQuantity = 1;

    FHorizonCraftingIngredient Cloth;
    Cloth.ItemKey = TEXT("cloth");
    Cloth.Quantity = 2;
    Recipe.Ingredients.Add(Cloth);

    TMap<FName, int32> Inventory;
    Inventory.Add(TEXT("cloth"), 2);
    TestTrue(
        TEXT("Exact ingredients can craft"),
        UHorizonSurvivalSubsystem::CanAffordRecipe(Inventory, Recipe));

    Inventory[TEXT("cloth")] = 1;
    TestFalse(
        TEXT("Insufficient ingredients fail before consumption"),
        UHorizonSurvivalSubsystem::CanAffordRecipe(Inventory, Recipe));

    Recipe.OutputQuantity = 0;
    TestFalse(
        TEXT("Invalid output quantity fails closed"),
        UHorizonSurvivalSubsystem::CanAffordRecipe(Inventory, Recipe));

    Inventory[TEXT("cloth")] = 3;
    TArray<FHorizonCraftingIngredient> DuplicateDebit;
    FHorizonCraftingIngredient FirstDebit;
    FirstDebit.ItemKey = TEXT("cloth");
    FirstDebit.Quantity = 2;
    DuplicateDebit.Add(FirstDebit);
    FHorizonCraftingIngredient SecondDebit;
    SecondDebit.ItemKey = TEXT("cloth");
    SecondDebit.Quantity = 2;
    DuplicateDebit.Add(SecondDebit);
    TestFalse(
        TEXT("Duplicate material entries aggregate before debit"),
        UHorizonSurvivalSubsystem::CanAffordIngredients(Inventory, DuplicateDebit));

    Inventory[TEXT("cloth")] = 4;
    TestTrue(
        TEXT("Exact aggregated material debit is affordable"),
        UHorizonSurvivalSubsystem::CanAffordIngredients(Inventory, DuplicateDebit));

    SecondDebit.Quantity = -1;
    DuplicateDebit[1] = SecondDebit;
    TestFalse(
        TEXT("Invalid debit quantities fail closed"),
        UHorizonSurvivalSubsystem::CanAffordIngredients(Inventory, DuplicateDebit));
    return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(
    FHorizonSurvivalNeedsTest,
    "BridgePoint.Horizon.Systems.Survival.Needs",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FHorizonSurvivalNeedsTest::RunTest(const FString& Parameters)
{
    FHorizonSurvivalState Full;
    const FHorizonSurvivalState Walking =
        UHorizonSurvivalSubsystem::SimulateNeeds(Full, 2.0f, false, false);
    const FHorizonSurvivalState Sprinting =
        UHorizonSurvivalSubsystem::SimulateNeeds(Full, 2.0f, true, false);
    const FHorizonSurvivalState Sheltered =
        UHorizonSurvivalSubsystem::SimulateNeeds(Full, 2.0f, false, true);

    TestTrue(TEXT("Thirst drains faster than hunger"), Walking.Thirst01 < Walking.Hunger01);
    TestTrue(TEXT("Sprinting increases hunger drain"), Sprinting.Hunger01 < Walking.Hunger01);
    TestTrue(TEXT("Sprinting increases thirst drain"), Sprinting.Thirst01 < Walking.Thirst01);
    TestTrue(TEXT("Shelter reduces hunger drain"), Sheltered.Hunger01 > Walking.Hunger01);
    TestTrue(TEXT("Shelter reduces thirst drain"), Sheltered.Thirst01 > Walking.Thirst01);

    FHorizonSurvivalState Deprived;
    Deprived.Hunger01 = 0.0f;
    Deprived.Thirst01 = 0.0f;
    Deprived.Health01 = 1.0f;
    const FHorizonSurvivalState Damaged =
        UHorizonSurvivalSubsystem::SimulateNeeds(Deprived, 2.0f, false, false);
    TestTrue(TEXT("Combined deprivation damages health"), Damaged.Health01 < 1.0f);
    TestTrue(TEXT("Health remains clamped"), Damaged.Health01 >= 0.0f);
    return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(
    FHorizonInventoryWeightTest,
    "BridgePoint.Horizon.Systems.Survival.InventoryWeight",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FHorizonInventoryWeightTest::RunTest(const FString& Parameters)
{
    TMap<FName, int32> Inventory;
    Inventory.Add(TEXT("clean_water"), 2);
    Inventory.Add(TEXT("ration"), 3);
    Inventory.Add(TEXT("cloth"), -5);

    const float Weight = UHorizonSurvivalSubsystem::ComputeInventoryWeightKg(Inventory);
    TestTrue(TEXT("Known inventory weight is deterministic"), FMath::IsNearlyEqual(Weight, 3.2f));
    TestTrue(
        TEXT("Unknown items have no exploitable negative weight"),
        UHorizonSurvivalSubsystem::GetItemUnitWeightKg(TEXT("unknown_item")) == 0.0f);
    return true;
}


IMPLEMENT_SIMPLE_AUTOMATION_TEST(
    FHorizonInventoryAtomicAdditionTest,
    "BridgePoint.Horizon.Systems.Survival.AtomicInventoryAddition",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FHorizonInventoryAtomicAdditionTest::RunTest(const FString& Parameters)
{
    TMap<FName, int32> Inventory;
    Inventory.Add(TEXT("ration"), 1);

    FHorizonCraftingIngredient ClothA;
    ClothA.ItemKey = TEXT("cloth");
    ClothA.Quantity = 1;
    FHorizonCraftingIngredient ClothB = ClothA;
    ClothB.Quantity = 2;

    TMap<FName, int32> Result;
    TestTrue(
        TEXT("Multi-stack addition validates as one transaction"),
        UHorizonSurvivalSubsystem::TryBuildInventoryAfterAddition(
            Inventory,
            {ClothA, ClothB},
            1.0f,
            Result));
    TestEqual(
        TEXT("Duplicate additions aggregate exactly once"),
        Result.FindRef(TEXT("cloth")),
        3);
    TestEqual(
        TEXT("Existing inventory is preserved"),
        Result.FindRef(TEXT("ration")),
        1);

    FHorizonCraftingIngredient Water;
    Water.ItemKey = TEXT("clean_water");
    Water.Quantity = 2;
    TestFalse(
        TEXT("Over-capacity transaction fails before mutation"),
        UHorizonSurvivalSubsystem::TryBuildInventoryAfterAddition(
            {},
            {Water},
            1.0f,
            Result));
    TestTrue(TEXT("Failed capacity transaction exposes no partial result"), Result.IsEmpty());

    FHorizonCraftingIngredient Unknown;
    Unknown.ItemKey = TEXT("unknown_item");
    Unknown.Quantity = 1;
    TestFalse(
        TEXT("Unknown item addition fails closed"),
        UHorizonSurvivalSubsystem::TryBuildInventoryAfterAddition(
            {},
            {Unknown},
            35.0f,
            Result));
    TestTrue(TEXT("Unknown item creates no partial result"), Result.IsEmpty());

    TMap<FName, int32> OverflowInventory;
    OverflowInventory.Add(TEXT("cloth"), MAX_int32);
    TestFalse(
        TEXT("Quantity overflow fails closed"),
        UHorizonSurvivalSubsystem::TryBuildInventoryAfterAddition(
            OverflowInventory,
            {ClothA},
            100.0f,
            Result));
    TestTrue(TEXT("Overflow creates no partial result"), Result.IsEmpty());
    return true;
}

#endif
