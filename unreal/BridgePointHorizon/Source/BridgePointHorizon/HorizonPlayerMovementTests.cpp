#if WITH_DEV_AUTOMATION_TESTS

#include "HorizonPlayerCharacter.h"

#include "Misc/AutomationTest.h"

IMPLEMENT_SIMPLE_AUTOMATION_TEST(
    FHorizonLeanResolverTest,
    "BridgePoint.Horizon.Movement.Lean.Resolver",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FHorizonLeanResolverTest::RunTest(const FString& Parameters)
{
    TestEqual(
        TEXT("Full right lean stays normalized"),
        AHorizonPlayerCharacter::ResolveLeanTarget(
            1.0f, EHorizonMovementStance::Standing, false, 1.0f),
        1.0f);
    TestEqual(
        TEXT("Full left lean stays normalized"),
        AHorizonPlayerCharacter::ResolveLeanTarget(
            -1.0f, EHorizonMovementStance::Crouched, false, 1.0f),
        -1.0f);
    TestEqual(
        TEXT("Controller noise remains inside deadzone"),
        AHorizonPlayerCharacter::ResolveLeanTarget(
            0.04f, EHorizonMovementStance::Standing, false, 1.0f),
        0.0f);

    const float PartiallyBlocked = AHorizonPlayerCharacter::ResolveLeanTarget(
        1.0f, EHorizonMovementStance::Standing, false, 0.50f);
    TestTrue(
        TEXT("Wall obstruction reduces but does not reverse lean"),
        PartiallyBlocked > 0.0f && PartiallyBlocked < 0.50f);
    TestEqual(
        TEXT("Near wall margin fully cancels lean"),
        AHorizonPlayerCharacter::ResolveLeanTarget(
            1.0f, EHorizonMovementStance::Standing, false, 0.05f),
        0.0f);

    TestEqual(
        TEXT("Sprint cancels lean"),
        AHorizonPlayerCharacter::ResolveLeanTarget(
            1.0f, EHorizonMovementStance::Standing, true, 1.0f),
        0.0f);
    TestEqual(
        TEXT("Prone cancels lean"),
        AHorizonPlayerCharacter::ResolveLeanTarget(
            1.0f, EHorizonMovementStance::Prone, false, 1.0f),
        0.0f);
    TestEqual(
        TEXT("Slide cancels lean"),
        AHorizonPlayerCharacter::ResolveLeanTarget(
            -1.0f, EHorizonMovementStance::Sliding, false, 1.0f),
        0.0f);
    return true;
}

#endif
