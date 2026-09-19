#if WITH_DEV_AUTOMATION_TESTS

#include "HorizonGeneratedInterior.h"

#include "Misc/AutomationTest.h"

IMPLEMENT_SIMPLE_AUTOMATION_TEST(
    FHorizonInteriorDoorTickBudgetTest,
    "BridgePoint.Horizon.Interior.Performance.DoorTickBudget",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FHorizonInteriorDoorTickBudgetTest::RunTest(const FString& Parameters)
{
    TestTrue(
        TEXT("Exact target is settled"),
        AHorizonGeneratedInterior::IsDoorAnimationSettled(95.0f, 95.0f));
    TestTrue(
        TEXT("Near target is settled"),
        AHorizonGeneratedInterior::IsDoorAnimationSettled(94.95f, 95.0f));
    TestTrue(
        TEXT("Wrapped angle is settled"),
        AHorizonGeneratedInterior::IsDoorAnimationSettled(179.98f, -180.0f));
    TestFalse(
        TEXT("Active swing remains awake"),
        AHorizonGeneratedInterior::IsDoorAnimationSettled(35.0f, 95.0f));
    TestFalse(
        TEXT("Negative tolerance fails closed"),
        AHorizonGeneratedInterior::IsDoorAnimationSettled(94.99f, 95.0f, -1.0f));
    return true;
}

#endif
