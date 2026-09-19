#if WITH_DEV_AUTOMATION_TESTS

#include "HorizonLootSubsystem.h"

#include "Misc/AutomationTest.h"

namespace HorizonLootTests
{
static int32 TotalQuantity(const TArray<FHorizonLootStack>& Stacks)
{
    int32 Total = 0;
    for (const FHorizonLootStack& Stack : Stacks)
    {
        Total += FMath::Max(0, Stack.Quantity);
    }
    return Total;
}

static FString Signature(const FHorizonLootDrop& Drop)
{
    FString Value;
    for (const FHorizonLootStack& Stack : Drop.Stacks)
    {
        Value += Stack.ItemKey.ToString();
        Value += TEXT(":");
        Value += FString::FromInt(Stack.Quantity);
        Value += TEXT("|");
    }
    return Value;
}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(
    FHorizonLootDeterminismTest,
    "BridgePoint.Horizon.Systems.Loot.Determinism",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FHorizonLootDeterminismTest::RunTest(const FString& Parameters)
{
    FHorizonLootContext Context;
    Context.DropId = FGuid(1, 2, 3, 4);
    Context.Seed = 7721;
    Context.Source = EHorizonLootSource::Enemy;
    Context.QualityBias = 0.15f;

    const FHorizonLootDrop First = UHorizonLootSubsystem::RollLoot(Context);
    const FHorizonLootDrop Second = UHorizonLootSubsystem::RollLoot(Context);
    TestTrue(TEXT("Valid gameplay drop is generated"), !First.Stacks.IsEmpty());
    TestEqual(
        TEXT("Same drop identity and seed produce the same loot"),
        HorizonLootTests::Signature(First),
        HorizonLootTests::Signature(Second));
    TestTrue(TEXT("Loot remains gameplay-earned"), First.bGameplayEarned);

    Context.DropId.Invalidate();
    TestTrue(
        TEXT("Invalid drop identity fails closed"),
        UHorizonLootSubsystem::RollLoot(Context).Stacks.IsEmpty());
    return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(
    FHorizonLootProgressionBoundsTest,
    "BridgePoint.Horizon.Systems.Loot.ProgressionBounds",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FHorizonLootProgressionBoundsTest::RunTest(const FString& Parameters)
{
    FHorizonLootContext Low;
    Low.DropId = FGuid(10, 20, 30, 40);
    Low.Seed = 991;
    Low.Source = EHorizonLootSource::WorldContainer;
    Low.QualityBias = -0.25f;

    FHorizonLootContext High = Low;
    High.QualityBias = 0.50f;
    const FHorizonLootDrop LowDrop = UHorizonLootSubsystem::RollLoot(Low);
    const FHorizonLootDrop HighDrop = UHorizonLootSubsystem::RollLoot(High);
    TestTrue(
        TEXT("Bounded quality bias never reduces the number of awarded units"),
        HorizonLootTests::TotalQuantity(HighDrop.Stacks) >=
            HorizonLootTests::TotalQuantity(LowDrop.Stacks));
    TestTrue(
        TEXT("Quality remains bounded to five deterministic rolls"),
        HighDrop.Stacks.Num() <= 5);

    FHorizonLootContext Boss = Low;
    Boss.Source = EHorizonLootSource::Boss;
    const FHorizonLootDrop BossDrop = UHorizonLootSubsystem::RollLoot(Boss);
    TestTrue(
        TEXT("Boss source grants at least as many units as an ordinary container"),
        HorizonLootTests::TotalQuantity(BossDrop.Stacks) >=
            HorizonLootTests::TotalQuantity(LowDrop.Stacks));
    return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(
    FHorizonLootCapacityTest,
    "BridgePoint.Horizon.Systems.Loot.CapacitySafety",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FHorizonLootCapacityTest::RunTest(const FString& Parameters)
{
    FHorizonLootStack Water;
    Water.ItemKey = TEXT("clean_water");
    Water.Quantity = 2;

    TArray<FHorizonLootStack> Accepted;
    TArray<FHorizonLootStack> Remainder;
    UHorizonLootSubsystem::SplitLootByCapacity(
        {Water},
        {},
        1.0f,
        Accepted,
        Remainder);
    TestEqual(
        TEXT("Only weight-safe quantity enters inventory"),
        HorizonLootTests::TotalQuantity(Accepted),
        1);
    TestEqual(
        TEXT("Overflow remains deferred exactly once"),
        HorizonLootTests::TotalQuantity(Remainder),
        1);

    FHorizonLootStack Unknown;
    Unknown.ItemKey = TEXT("unregistered_loot");
    Unknown.Quantity = 3;
    UHorizonLootSubsystem::SplitLootByCapacity(
        {Unknown},
        {},
        35.0f,
        Accepted,
        Remainder);
    TestTrue(TEXT("Unknown item never enters inventory"), Accepted.IsEmpty());
    TestEqual(
        TEXT("Unknown item remains isolated for safe recovery"),
        HorizonLootTests::TotalQuantity(Remainder),
        3);

    TMap<FName, int32> FullInventory;
    FullInventory.Add(TEXT("stone"), 1);
    UHorizonLootSubsystem::SplitLootByCapacity(
        {Water},
        FullInventory,
        1.0f,
        Accepted,
        Remainder);
    TestTrue(TEXT("Full inventory accepts no overweight loot"), Accepted.IsEmpty());
    TestEqual(
        TEXT("Full inventory loses no loot"),
        HorizonLootTests::TotalQuantity(Remainder),
        2);
    return true;
}

#endif
