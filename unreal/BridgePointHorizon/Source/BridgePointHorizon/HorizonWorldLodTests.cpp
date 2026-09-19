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

IMPLEMENT_SIMPLE_AUTOMATION_TEST(
    FHorizonWorldSourceRoofProfileTest,
    "BridgePoint.Horizon.World.Roofs.SourceProfiles",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FHorizonWorldSourceRoofProfileTest::RunTest(const FString& Parameters)
{
    TestEqual(
        TEXT("Explicit pyramidal roofs preserve source roof height"),
        AHorizonWorldCellRenderer::ResolveSourceRoofHeightMeters(
            TEXT("pyramidal"), 3.5, 12.0),
        3.5);
    TestEqual(
        TEXT("Roof profiles are case insensitive"),
        AHorizonWorldCellRenderer::ResolveSourceRoofHeightMeters(
            TEXT(" CONICAL "), 2.0, 9.0),
        2.0);
    TestEqual(
        TEXT("Unsupported roof shapes remain flat"),
        AHorizonWorldCellRenderer::ResolveSourceRoofHeightMeters(
            TEXT("flat"), 3.0, 10.0),
        0.0);
    TestEqual(
        TEXT("Missing source roof height does not invent a profile"),
        AHorizonWorldCellRenderer::ResolveSourceRoofHeightMeters(
            TEXT("pyramid"), 0.0, 10.0),
        0.0);
    TestEqual(
        TEXT("Roof height is bounded against total building height"),
        AHorizonWorldCellRenderer::ResolveSourceRoofHeightMeters(
            TEXT("cone"), 20.0, 10.0),
        4.5);
    TestEqual(
        TEXT("Invalid roof metadata fails closed"),
        AHorizonWorldCellRenderer::ResolveSourceRoofHeightMeters(
            TEXT("pyramid"), -2.0, 10.0),
        0.0);
    return true;
}

#endif
