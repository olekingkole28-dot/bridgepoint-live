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



IMPLEMENT_SIMPLE_AUTOMATION_TEST(
    FHorizonCombatHitDirectionTest,
    "BridgePoint.Horizon.Combat.HitReaction.Direction",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FHorizonCombatHitDirectionTest::RunTest(const FString& Parameters)
{
    const FVector Forward = FVector::ForwardVector;
    const FVector Right = FVector::RightVector;
    TestEqual(TEXT("Forward source resolves to front hit"),
        AHorizonPlayerCharacter::ResolveHitDirection(Forward, Right, Forward),
        EHorizonHitDirection::Front);
    TestEqual(TEXT("Right source resolves to right hit"),
        AHorizonPlayerCharacter::ResolveHitDirection(Forward, Right, Right),
        EHorizonHitDirection::Right);
    TestEqual(TEXT("Rear source resolves to rear hit"),
        AHorizonPlayerCharacter::ResolveHitDirection(Forward, Right, -Forward),
        EHorizonHitDirection::Rear);
    TestEqual(TEXT("Left source resolves to left hit"),
        AHorizonPlayerCharacter::ResolveHitDirection(Forward, Right, -Right),
        EHorizonHitDirection::Left);
    TestEqual(TEXT("Missing source direction fails safely to front"),
        AHorizonPlayerCharacter::ResolveHitDirection(
            Forward, Right, FVector::ZeroVector),
        EHorizonHitDirection::Front);
    return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(
    FHorizonCombatHitResolutionTest,
    "BridgePoint.Horizon.Combat.HitReaction.Resolution",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FHorizonCombatHitResolutionTest::RunTest(const FString& Parameters)
{
    const FVector Forward = FVector::ForwardVector;
    const FVector Right = FVector::RightVector;
    const FHorizonCombatHitFeedback BodyHit =
        AHorizonPlayerCharacter::ResolveCombatHit(
            40.0f, 100.0f, 50.0f, 100.0f, 50.0f,
            Forward, Right, Forward, false);
    TestEqual(TEXT("Armor absorbs sixty-five percent of a standard hit"),
        BodyHit.DamageToArmor, 26.0f);
    TestEqual(TEXT("Unabsorbed damage reaches health"),
        BodyHit.DamageToHealth, 14.0f);
    TestEqual(TEXT("Armor remainder is preserved"), BodyHit.ArmorRemaining, 24.0f);
    TestEqual(TEXT("Health remainder is preserved"), BodyHit.HealthRemaining, 86.0f);
    TestFalse(TEXT("Partial armor damage does not signal armor break"), BodyHit.bArmorBroken);
    TestFalse(TEXT("Nonlethal body hit remains nonlethal"), BodyHit.bLethal);

    const FHorizonCombatHitFeedback Headshot =
        AHorizonPlayerCharacter::ResolveCombatHit(
            40.0f, 100.0f, 50.0f, 100.0f, 50.0f,
            Forward, Right, Right, true);
    TestTrue(TEXT("Headshot applies stronger health damage"),
        Headshot.DamageToHealth > BodyHit.DamageToHealth);
    TestTrue(TEXT("Headshot flag survives feedback"), Headshot.bHeadshot);
    TestTrue(TEXT("Right-side damage kicks camera away from source"),
        Headshot.CameraImpulse.Y < 0.0f);
    TestTrue(TEXT("Reticle impulse remains normalized"),
        Headshot.ReticleImpulse01 >= 0.0f && Headshot.ReticleImpulse01 <= 1.0f);

    const FHorizonCombatHitFeedback Lethal =
        AHorizonPlayerCharacter::ResolveCombatHit(
            200.0f, 100.0f, 10.0f, 100.0f, 50.0f,
            Forward, Right, -Forward, false);
    TestTrue(TEXT("Depleted armor signals armor break"), Lethal.bArmorBroken);
    TestTrue(TEXT("Lethal hit reaches zero health"), Lethal.bLethal);
    TestEqual(TEXT("Lethal health clamps at zero"), Lethal.HealthRemaining, 0.0f);
    TestTrue(TEXT("Rear damage produces distinct pitch reaction"),
        Lethal.CameraImpulse.X > 0.0f);

    const FHorizonCombatHitFeedback Rejected =
        AHorizonPlayerCharacter::ResolveCombatHit(
            -20.0f, 100.0f, 50.0f, 100.0f, 50.0f,
            Forward, Right, Forward, false);
    TestEqual(TEXT("Negative damage cannot consume armor"), Rejected.DamageToArmor, 0.0f);
    TestEqual(TEXT("Negative damage cannot consume health"), Rejected.DamageToHealth, 0.0f);
    TestEqual(TEXT("Rejected damage has no reticle impulse"), Rejected.ReticleImpulse01, 0.0f);
    return true;
}



IMPLEMENT_SIMPLE_AUTOMATION_TEST(
    FHorizonMovementProfileRefreshBudgetTest,
    "BridgePoint.Horizon.Performance.Player.MovementProfileBudget",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FHorizonMovementProfileRefreshBudgetTest::RunTest(const FString& Parameters)
{
    float Accumulator = 0.0f;
    for (int32 Frame = 0; Frame < 6; ++Frame)
    {
        TestFalse(TEXT("Sub-budget movement frame avoids adaptive profile work"),
            AHorizonPlayerCharacter::ShouldRefreshMovementProfile(
                Accumulator, 0.016f, 0.10f, Accumulator));
    }
    TestTrue(TEXT("Adaptive movement profile refreshes at ten hertz"),
        AHorizonPlayerCharacter::ShouldRefreshMovementProfile(
            Accumulator, 0.016f, 0.10f, Accumulator));
    TestTrue(TEXT("Movement profile remainder stays below refresh interval"),
        Accumulator >= 0.0f && Accumulator < 0.10f);

    TestTrue(TEXT("Ordinary hitch produces one bounded refresh"),
        AHorizonPlayerCharacter::ShouldRefreshMovementProfile(
            0.0f, 0.20f, 0.10f, Accumulator));
    TestTrue(TEXT("Hitch remainder remains bounded"),
        Accumulator >= 0.0f && Accumulator < 0.10f);

    TestFalse(TEXT("Negative frame delta cannot synthesize profile work"),
        AHorizonPlayerCharacter::ShouldRefreshMovementProfile(
            0.0f, -1.0f, 0.10f, Accumulator));
    TestFalse(TEXT("Zero frame delta cannot synthesize profile work"),
        AHorizonPlayerCharacter::ShouldRefreshMovementProfile(
            0.0f, 0.0f, 0.10f, Accumulator));
    TestTrue(TEXT("Catastrophic stall remains a single refresh"),
        AHorizonPlayerCharacter::ShouldRefreshMovementProfile(
            0.0f, 20.0f, 0.10f, Accumulator));
    TestTrue(TEXT("Catastrophic stall cannot leave an unbounded backlog"),
        Accumulator >= 0.0f && Accumulator < 0.10f);
    return true;
}

#endif
