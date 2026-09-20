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
    FHorizonWorldRoofTriangulationWindingTest,
    "BridgePoint.Horizon.World.Roofs.TriangulationWinding",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FHorizonWorldRoofTriangulationWindingTest::RunTest(const FString& Parameters)
{
    const TArray<FVector2D> CounterClockwise = {
        FVector2D(0.0, 0.0),
        FVector2D(8.0, 0.0),
        FVector2D(8.0, 3.0),
        FVector2D(0.0, 3.0)
    };
    const TArray<FVector2D> Clockwise = {
        FVector2D(0.0, 0.0),
        FVector2D(0.0, 3.0),
        FVector2D(8.0, 3.0),
        FVector2D(8.0, 0.0)
    };

    auto SignedTriangleArea = [](const TArray<FVector2D>& Polygon, const TArray<int32>& Indices)
    {
        double Area = 0.0;
        for (int32 Tri = 0; Tri + 2 < Indices.Num(); Tri += 3)
        {
            const FVector2D& A = Polygon[Indices[Tri]];
            const FVector2D& B = Polygon[Indices[Tri + 1]];
            const FVector2D& C = Polygon[Indices[Tri + 2]];
            Area += static_cast<double>(
                (B.X - A.X) * (C.Y - A.Y) -
                (B.Y - A.Y) * (C.X - A.X)) * 0.5;
        }
        return Area;
    };

    const TArray<int32> CounterClockwiseTriangles =
        AHorizonWorldCellRenderer::TriangulateRoofFootprint(CounterClockwise);
    const TArray<int32> ClockwiseTriangles =
        AHorizonWorldCellRenderer::TriangulateRoofFootprint(Clockwise);

    TestEqual(
        TEXT("Counter-clockwise quad produces two roof triangles"),
        CounterClockwiseTriangles.Num(),
        6);
    TestEqual(
        TEXT("Clockwise quad produces two roof triangles"),
        ClockwiseTriangles.Num(),
        6);
    TestTrue(
        TEXT("Counter-clockwise roof preserves positive winding and full area"),
        FMath::IsNearlyEqual(
            SignedTriangleArea(CounterClockwise, CounterClockwiseTriangles),
            24.0));
    TestTrue(
        TEXT("Clockwise roof remaps indices to positive winding and full area"),
        FMath::IsNearlyEqual(
            SignedTriangleArea(Clockwise, ClockwiseTriangles),
            24.0));
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
    TestEqual(
        TEXT("Explicit rectangular gable resolves to gabled profile"),
        AHorizonWorldCellRenderer::ResolveSourceRoofProfile(TEXT("gabled"), 4),
        EHorizonSourceRoofProfile::Gabled);
    TestEqual(
        TEXT("Explicit rectangular hip resolves to hipped profile"),
        AHorizonWorldCellRenderer::ResolveSourceRoofProfile(TEXT("hipped"), 4),
        EHorizonSourceRoofProfile::Hipped);
    TestEqual(
        TEXT("Source gable height is preserved on rectangular footprints"),
        AHorizonWorldCellRenderer::ResolveSourceRoofHeightMeters(
            TEXT("gable"), 2.8, 11.0, 4),
        2.8);
    TestEqual(
        TEXT("Non-rectangular gables fail flat instead of inventing topology"),
        AHorizonWorldCellRenderer::ResolveSourceRoofProfile(TEXT("gabled"), 6),
        EHorizonSourceRoofProfile::Flat);
    TestEqual(
        TEXT("Missing footprint topology cannot create a gable"),
        AHorizonWorldCellRenderer::ResolveSourceRoofHeightMeters(
            TEXT("gabled"), 2.8, 11.0),
        0.0);
    TestEqual(
        TEXT("Explicit rectangular skillion resolves to sloped profile"),
        AHorizonWorldCellRenderer::ResolveSourceRoofProfile(TEXT("skillion"), 4),
        EHorizonSourceRoofProfile::Skillion);
    TestEqual(
        TEXT("Shed alias resolves to skillion profile"),
        AHorizonWorldCellRenderer::ResolveSourceRoofProfile(TEXT("shed"), 4),
        EHorizonSourceRoofProfile::Skillion);
    TestEqual(
        TEXT("Source skillion height is preserved"),
        AHorizonWorldCellRenderer::ResolveSourceRoofHeightMeters(
            TEXT("skillion"), 2.4, 9.0, 4),
        2.4);
    TestEqual(
        TEXT("Non-rectangular skillion fails flat"),
        AHorizonWorldCellRenderer::ResolveSourceRoofProfile(TEXT("skillion"), 5),
        EHorizonSourceRoofProfile::Flat);

    const TArray<FVector2D> WideFootprint = {
        FVector2D(0.0, 0.0),
        FVector2D(10.0, 0.0),
        FVector2D(10.0, 4.0),
        FVector2D(0.0, 4.0)
    };
    TestEqual(
        TEXT("Wide skillion selects a source-ring long edge"),
        AHorizonWorldCellRenderer::ResolveSkillionHighEdge(WideFootprint),
        FIntPoint(0, 1));

    const TArray<FVector2D> TallFootprint = {
        FVector2D(0.0, 0.0),
        FVector2D(4.0, 0.0),
        FVector2D(4.0, 10.0),
        FVector2D(0.0, 10.0)
    };
    TestEqual(
        TEXT("Tall skillion follows the footprint longest axis"),
        AHorizonWorldCellRenderer::ResolveSkillionHighEdge(TallFootprint),
        FIntPoint(3, 0));

    const TArray<FVector2D> DegenerateFootprint = {
        FVector2D::ZeroVector,
        FVector2D::ZeroVector,
        FVector2D(1.0, 1.0),
        FVector2D(0.0, 1.0)
    };
    TestEqual(
        TEXT("Degenerate skillion footprint fails closed"),
        AHorizonWorldCellRenderer::ResolveSkillionHighEdge(DegenerateFootprint),
        FIntPoint(-1, -1));

    TestEqual(
        TEXT("Explicit rectangular mansard resolves to inset profile"),
        AHorizonWorldCellRenderer::ResolveSourceRoofProfile(TEXT("mansard"), 4),
        EHorizonSourceRoofProfile::Mansard);
    TestEqual(
        TEXT("Source mansard height is preserved"),
        AHorizonWorldCellRenderer::ResolveSourceRoofHeightMeters(
            TEXT("mansard"), 3.0, 14.0, 4),
        3.0);
    TestEqual(
        TEXT("Non-rectangular mansard fails flat"),
        AHorizonWorldCellRenderer::ResolveSourceRoofProfile(TEXT("mansard"), 5),
        EHorizonSourceRoofProfile::Flat);

    const TArray<FVector2D> MansardInset =
        AHorizonWorldCellRenderer::ResolveMansardInsetFootprint(WideFootprint);
    TestEqual(
        TEXT("Valid mansard creates a four-corner inset"),
        MansardInset.Num(),
        4);
    TestTrue(
        TEXT("Mansard inset remains inside the source footprint"),
        MansardInset.Num() == 4 &&
        FMath::IsNearlyEqual(MansardInset[0].X, 1.1) &&
        FMath::IsNearlyEqual(MansardInset[0].Y, 0.44));

    const TArray<FVector2D> ConcaveFootprint = {
        FVector2D(0.0, 0.0),
        FVector2D(6.0, 0.0),
        FVector2D(2.0, 1.0),
        FVector2D(0.0, 4.0)
    };
    TestTrue(
        TEXT("Concave mansard footprint fails closed"),
        AHorizonWorldCellRenderer::ResolveMansardInsetFootprint(
            ConcaveFootprint).IsEmpty());
    TestTrue(
        TEXT("Degenerate mansard footprint fails closed"),
        AHorizonWorldCellRenderer::ResolveMansardInsetFootprint(
            DegenerateFootprint).IsEmpty());
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
