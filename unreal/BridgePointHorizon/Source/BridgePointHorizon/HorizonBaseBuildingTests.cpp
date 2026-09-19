#if WITH_DEV_AUTOMATION_TESTS

#include "HorizonBaseBuildingSubsystem.h"
#include "Misc/AutomationTest.h"

IMPLEMENT_SIMPLE_AUTOMATION_TEST(
    FHorizonBasePlacementTest,
    "BridgePoint.Horizon.Systems.Base.Placement",
    EAutomationTestFlags::ApplicationContextMask | EAutomationTestFlags::ProductFilter)

bool FHorizonBasePlacementTest::RunTest(const FString& Parameters)
{
    TArray<FHorizonBasePieceState> Pieces;
    const FTransform Origin(FRotator::ZeroRotator, FVector::ZeroVector, FVector::OneVector);

    TestTrue(
        TEXT("A new base must begin with a foundation"),
        UHorizonBaseBuildingSubsystem::CanPlacePiece(
            Pieces, EHorizonBasePieceType::Foundation, Origin));
    TestFalse(
        TEXT("A wall cannot float without a foundation"),
        UHorizonBaseBuildingSubsystem::CanPlacePiece(
            Pieces, EHorizonBasePieceType::Wall, Origin));

    FHorizonBasePieceState Foundation;
    Foundation.PieceId = TEXT("foundation");
    Foundation.PieceType = EHorizonBasePieceType::Foundation;
    Foundation.WorldTransform = Origin;
    Pieces.Add(Foundation);

    const FTransform AttachedWall(
        FRotator::ZeroRotator,
        FVector(400.0f, 0.0f, 0.0f),
        FVector::OneVector);
    TestTrue(
        TEXT("An attached wall is accepted"),
        UHorizonBaseBuildingSubsystem::CanPlacePiece(
            Pieces, EHorizonBasePieceType::Wall, AttachedWall));

    const FTransform Overlap(
        FRotator::ZeroRotator,
        FVector(10.0f, 0.0f, 0.0f),
        FVector::OneVector);
    TestFalse(
        TEXT("Overlapping pieces are rejected"),
        UHorizonBaseBuildingSubsystem::CanPlacePiece(
            Pieces, EHorizonBasePieceType::Wall, Overlap));

    const FTransform DistantRoof(
        FRotator::ZeroRotator,
        FVector(5000.0f, 0.0f, 0.0f),
        FVector::OneVector);
    TestFalse(
        TEXT("Disconnected pieces are rejected"),
        UHorizonBaseBuildingSubsystem::CanPlacePiece(
            Pieces, EHorizonBasePieceType::Roof, DistantRoof));
    TestFalse(
        TEXT("The configured piece cap is enforced"),
        UHorizonBaseBuildingSubsystem::CanPlacePiece(
            Pieces, EHorizonBasePieceType::Wall, AttachedWall, 1));

    return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(
    FHorizonBaseEconomyDurabilityTest,
    "BridgePoint.Horizon.Systems.Base.EconomyDurability",
    EAutomationTestFlags::ApplicationContextMask | EAutomationTestFlags::ProductFilter)

bool FHorizonBaseEconomyDurabilityTest::RunTest(const FString& Parameters)
{
    const TArray<FHorizonBaseMaterialCost> FoundationCost =
        UHorizonBaseBuildingSubsystem::GetPieceCost(EHorizonBasePieceType::Foundation);
    TestEqual(TEXT("Foundation has two material entries"), FoundationCost.Num(), 2);
    if (FoundationCost.Num() == 2)
    {
        TestEqual(TEXT("Foundation wood cost"), FoundationCost[0].ItemKey, FName(TEXT("wood")));
        TestEqual(TEXT("Foundation wood quantity"), FoundationCost[0].Quantity, 4);
        TestEqual(TEXT("Foundation stone cost"), FoundationCost[1].ItemKey, FName(TEXT("stone")));
        TestEqual(TEXT("Foundation stone quantity"), FoundationCost[1].Quantity, 2);
    }

    TestEqual(
        TEXT("Damage subtracts durability"),
        UHorizonBaseBuildingSubsystem::ComputeDamagedDurability(1.0f, 0.35f),
        0.65f);
    TestEqual(
        TEXT("Lethal damage clamps to zero"),
        UHorizonBaseBuildingSubsystem::ComputeDamagedDurability(0.2f, 2.0f),
        0.0f);
    TestEqual(
        TEXT("Repair clamps to full durability"),
        UHorizonBaseBuildingSubsystem::ComputeRepairedDurability(0.8f, 0.35f),
        1.0f);
    TestEqual(
        TEXT("Negative repair cannot reduce durability"),
        UHorizonBaseBuildingSubsystem::ComputeRepairedDurability(0.6f, -1.0f),
        0.6f);

    return true;
}

#endif
