#include "HorizonWorldCellRenderer.h"

#include "Misc/AutomationTest.h"

#if WITH_DEV_AUTOMATION_TESTS

IMPLEMENT_SIMPLE_AUTOMATION_TEST(
    FHorizonWorldBuildingLodBudgetTest,
    "BridgePoint.Horizon.World.LOD.BuildingDensityBudget",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FHorizonWorldBuildingLodBudgetTest::RunTest(const FString& Parameters)
{
    const FIntPoint City = AHorizonWorldCellRenderer::ResolveBuildingLodCounts(
        9000, 5200, 850);
    TestEqual(TEXT("City tier keeps collision bounded"), City.X, 850);
    TestEqual(TEXT("City tier preserves thousands of far silhouettes"), City.Y, 4350);
    TestEqual(TEXT("City tier respects the complete visible budget"), City.X + City.Y, 5200);

    const FIntPoint Sparse = AHorizonWorldCellRenderer::ResolveBuildingLodCounts(
        120, 5200, 850);
    TestEqual(TEXT("Sparse cells keep every source-backed building"), Sparse.X, 120);
    TestEqual(TEXT("Sparse cells need no far-only overflow"), Sparse.Y, 0);

    const FIntPoint Invalid = AHorizonWorldCellRenderer::ResolveBuildingLodCounts(
        -10, -1, -20);
    TestEqual(TEXT("Invalid budgets fail closed"), Invalid, FIntPoint::ZeroValue);
    return true;
}

#endif
