#if WITH_DEV_AUTOMATION_TESTS

#include "HorizonWeaponRuntimeComponent.h"

#include "Misc/AutomationTest.h"

IMPLEMENT_SIMPLE_AUTOMATION_TEST(
    FHorizonWeaponCadenceAndReloadTest,
    "BridgePoint.Horizon.Combat.Weapon.CadenceAndReload",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FHorizonWeaponCadenceAndReloadTest::RunTest(const FString& Parameters)
{
    TestTrue(TEXT("Loaded idle weapon can fire"),
        UHorizonWeaponRuntimeComponent::CanFireRound(1, false, 0.0f));
    TestFalse(TEXT("Cadence blocks early repeat shot"),
        UHorizonWeaponRuntimeComponent::CanFireRound(30, false, 0.04f));
    TestFalse(TEXT("Reloading blocks fire"),
        UHorizonWeaponRuntimeComponent::CanFireRound(12, true, 0.0f));
    TestFalse(TEXT("Empty magazine blocks fire"),
        UHorizonWeaponRuntimeComponent::CanFireRound(0, false, 0.0f));

    TestEqual(TEXT("Reload fills only missing rounds"),
        UHorizonWeaponRuntimeComponent::ComputeReloadTransfer(7, 50, 30), 23);
    TestEqual(TEXT("Reload respects reserve"),
        UHorizonWeaponRuntimeComponent::ComputeReloadTransfer(7, 5, 30), 5);
    TestEqual(TEXT("Full magazine transfers nothing"),
        UHorizonWeaponRuntimeComponent::ComputeReloadTransfer(30, 90, 30), 0);

    TestTrue(TEXT("Two hundred millisecond hitch preserves elapsed weapon time"),
        FMath::IsNearlyEqual(
            UHorizonWeaponRuntimeComponent::AdvanceCountdown(1.0f, 0.20f),
            0.80f));
    TestEqual(TEXT("Countdown overshoot clamps at zero"),
        UHorizonWeaponRuntimeComponent::AdvanceCountdown(0.05f, 0.20f),
        0.0f);
    TestEqual(TEXT("Negative frame delta cannot increase or consume a timer"),
        UHorizonWeaponRuntimeComponent::AdvanceCountdown(1.0f, -0.25f),
        1.0f);
    TestTrue(TEXT("Catastrophic stalls use a bounded half-second catch-up"),
        FMath::IsNearlyEqual(
            UHorizonWeaponRuntimeComponent::AdvanceCountdown(1.0f, 5.0f),
            0.50f));

    float NextCooldown = 0.0f;
    TestEqual(TEXT("Two hundred millisecond hitch preserves automatic fire cadence"),
        UHorizonWeaponRuntimeComponent::AdvanceAutomaticCadence(
            0.10f, 0.20f, 0.10f, 30, 6, NextCooldown),
        2);
    TestTrue(TEXT("Exact cadence catch-up schedules the next full interval"),
        FMath::IsNearlyEqual(NextCooldown, 0.10f));

    TestEqual(TEXT("Cadence catch-up never exceeds remaining magazine rounds"),
        UHorizonWeaponRuntimeComponent::AdvanceAutomaticCadence(
            0.0f, 0.50f, 0.10f, 2, 6, NextCooldown),
        2);
    TestEqual(TEXT("Cadence catch-up is bounded per frame"),
        UHorizonWeaponRuntimeComponent::AdvanceAutomaticCadence(
            0.0f, 0.50f, 0.02f, 30, 6, NextCooldown),
        6);
    TestEqual(TEXT("Bounded backlog remains due for the next frame"),
        NextCooldown,
        0.0f);
    TestEqual(TEXT("Invalid frame delta cannot synthesize automatic shots"),
        UHorizonWeaponRuntimeComponent::AdvanceAutomaticCadence(
            0.05f, -0.20f, 0.10f, 30, 6, NextCooldown),
        0);
    return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(
    FHorizonWeaponRecoilTest,
    "BridgePoint.Horizon.Combat.Weapon.Recoil",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FHorizonWeaponRecoilTest::RunTest(const FString& Parameters)
{
    const FVector2D HipFirst =
        UHorizonWeaponRuntimeComponent::ComputeRecoilImpulse(1, false, 1.0f, 0.4f);
    const FVector2D HipSecond =
        UHorizonWeaponRuntimeComponent::ComputeRecoilImpulse(2, false, 1.0f, 0.4f);
    const FVector2D AdsFirst =
        UHorizonWeaponRuntimeComponent::ComputeRecoilImpulse(1, true, 1.0f, 0.4f);

    TestTrue(TEXT("Recoil always lifts the muzzle"), HipFirst.X > 0.0f);
    TestTrue(TEXT("Horizontal recoil alternates predictably"), HipFirst.Y * HipSecond.Y < 0.0f);
    TestTrue(TEXT("ADS reduces recoil"), AdsFirst.Size() < HipFirst.Size());
    TestEqual(TEXT("Recoil pattern is deterministic"),
        HipFirst,
        UHorizonWeaponRuntimeComponent::ComputeRecoilImpulse(1, false, 1.0f, 0.4f));
    return true;
}

#endif
