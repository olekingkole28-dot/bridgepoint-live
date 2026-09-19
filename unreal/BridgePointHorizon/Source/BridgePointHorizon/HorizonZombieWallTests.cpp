#if WITH_DEV_AUTOMATION_TESTS

#include "HorizonZombieWallController.h"

#include "Misc/AutomationTest.h"

IMPLEMENT_SIMPLE_AUTOMATION_TEST(
    FHorizonZombieWallTickBudgetTest,
    "BridgePoint.Horizon.Performance.YearOneWallTickBudget",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FHorizonZombieWallTickBudgetTest::RunTest(const FString& Parameters)
{
    const float DormantInterval =
        AHorizonZombieWallController::ResolveWallTickInterval(true, false);
    const float ActiveInterval =
        AHorizonZombieWallController::ResolveWallTickInterval(true, true);
    const float ManualInterval =
        AHorizonZombieWallController::ResolveWallTickInterval(false, false);

    TestTrue(TEXT("Dormant Year One wall polls no faster than twice per second"),
        DormantInterval >= 2.0f);
    TestTrue(TEXT("Active wall updates faster than dormant wall"),
        ActiveInterval < DormantInterval);
    TestTrue(TEXT("Active wall remains bounded below render-frame frequency"),
        ActiveInterval >= 0.25f);
    TestTrue(TEXT("Manual wall does not pay per-frame polling cost"),
        ManualInterval >= 2.0f);
    TestTrue(TEXT("All wall intervals remain finite"),
        FMath::IsFinite(DormantInterval) &&
        FMath::IsFinite(ActiveInterval) &&
        FMath::IsFinite(ManualInterval));
    return true;
}

#endif
