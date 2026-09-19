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


IMPLEMENT_SIMPLE_AUTOMATION_TEST(
    FHorizonWorldTerrainReliefTintTest,
    "BridgePoint.Horizon.World.Terrain.SourceReliefTint",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FHorizonWorldTerrainReliefTintTest::RunTest(const FString& Parameters)
{
    const FLinearColor Low = AHorizonWorldCellRenderer::ResolveTerrainReliefTint(
        10.0, 10.0, 110.0, 0.0);
    const FLinearColor High = AHorizonWorldCellRenderer::ResolveTerrainReliefTint(
        110.0, 10.0, 110.0, 0.0);
    const FLinearColor Rough = AHorizonWorldCellRenderer::ResolveTerrainReliefTint(
        110.0, 10.0, 110.0, 80.0);
    const FLinearColor Flat = AHorizonWorldCellRenderer::ResolveTerrainReliefTint(
        25.0, 25.0, 25.0, 0.0);
    const FLinearColor Invalid = AHorizonWorldCellRenderer::ResolveTerrainReliefTint(
        25.0, 40.0, 20.0, 0.0);

    TestTrue(TEXT("Higher sourced elevation receives lighter relief tint"), High.R > Low.R);
    TestTrue(TEXT("Abrupt sourced relief receives bounded contrast"), Rough.R < High.R);
    TestTrue(TEXT("Relief tint stays opaque"), FMath::IsNearlyEqual(High.A, 1.0f));
    TestTrue(TEXT("Flat terrain remains in a bounded neutral range"), Flat.R > 0.60f && Flat.R < 0.90f);
    TestTrue(TEXT("Invalid source range fails to neutral tint"), FMath::IsNearlyEqual(Invalid.R, 0.62f));
    return true;
}

#endif
