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

IMPLEMENT_SIMPLE_AUTOMATION_TEST(
    FHorizonVaultEligibilityTest,
    "BridgePoint.Horizon.Movement.Vault.Eligibility",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FHorizonVaultEligibilityTest::RunTest(const FString& Parameters)
{
    TestTrue(
        TEXT("Forward grounded standing player can vault a valid obstacle"),
        AHorizonPlayerCharacter::CanStartVault(
            EHorizonMovementStance::Standing, true, false, 1.0f, 90.0f, true));
    TestTrue(
        TEXT("Crouched player can rise into a valid vault"),
        AHorizonPlayerCharacter::CanStartVault(
            EHorizonMovementStance::Crouched, true, false, 0.8f, 70.0f, true));
    TestFalse(
        TEXT("Backward input cannot accidentally trigger vault"),
        AHorizonPlayerCharacter::CanStartVault(
            EHorizonMovementStance::Standing, true, false, -1.0f, 90.0f, true));
    TestFalse(
        TEXT("Controller noise cannot trigger vault"),
        AHorizonPlayerCharacter::CanStartVault(
            EHorizonMovementStance::Standing, true, false, 0.12f, 90.0f, true));
    TestFalse(
        TEXT("Airborne players cannot begin a vault"),
        AHorizonPlayerCharacter::CanStartVault(
            EHorizonMovementStance::Standing, false, false, 1.0f, 90.0f, true));
    TestFalse(
        TEXT("ADS blocks an accidental vault"),
        AHorizonPlayerCharacter::CanStartVault(
            EHorizonMovementStance::Standing, true, true, 1.0f, 90.0f, true));
    TestFalse(
        TEXT("Low obstacles stay on normal movement"),
        AHorizonPlayerCharacter::CanStartVault(
            EHorizonMovementStance::Standing, true, false, 1.0f, 20.0f, true));
    TestFalse(
        TEXT("Tall walls cannot be vaulted"),
        AHorizonPlayerCharacter::CanStartVault(
            EHorizonMovementStance::Standing, true, false, 1.0f, 220.0f, true));
    TestFalse(
        TEXT("Blocked landing capsules fail closed"),
        AHorizonPlayerCharacter::CanStartVault(
            EHorizonMovementStance::Standing, true, false, 1.0f, 90.0f, false));
    TestFalse(
        TEXT("Prone stance cannot begin a vault"),
        AHorizonPlayerCharacter::CanStartVault(
            EHorizonMovementStance::Prone, true, false, 1.0f, 90.0f, true));
    TestEqual(
        TEXT("Vaulting cancels lean"),
        AHorizonPlayerCharacter::ResolveLeanTarget(
            1.0f, EHorizonMovementStance::Vaulting, false, 1.0f),
        0.0f);
    return true;
}

#endif
