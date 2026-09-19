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
