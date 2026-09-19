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

#endif
