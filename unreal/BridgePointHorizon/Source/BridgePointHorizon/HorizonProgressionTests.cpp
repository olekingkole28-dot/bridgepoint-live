#include "HorizonProgressionSubsystem.h"

#if WITH_DEV_AUTOMATION_TESTS

#include "Misc/AutomationTest.h"

IMPLEMENT_SIMPLE_AUTOMATION_TEST(
    FHorizonPrestigeProfileRewardTest,
    "BridgePoint.Horizon.Systems.Progression.ProfileRewards",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FHorizonPrestigeProfileRewardTest::RunTest(const FString& Parameters)
{
    TestEqual(TEXT("First prestige unlocks a badge"),
        UHorizonProgressionSubsystem::GetPrestigeProfileRewardType(1),
        EHorizonRewardType::Badge);
    TestEqual(TEXT("Ninth prestige remains a badge"),
        UHorizonProgressionSubsystem::GetPrestigeProfileRewardType(9),
        EHorizonRewardType::Badge);
    TestEqual(TEXT("Every tenth prestige unlocks a banner"),
        UHorizonProgressionSubsystem::GetPrestigeProfileRewardType(10),
        EHorizonRewardType::Banner);
    TestEqual(TEXT("Prestige one hundred unlocks a banner"),
        UHorizonProgressionSubsystem::GetPrestigeProfileRewardType(100),
        EHorizonRewardType::Banner);
    TestEqual(TEXT("Invalid prestige cannot synthesize a banner"),
        UHorizonProgressionSubsystem::GetPrestigeProfileRewardType(0),
        EHorizonRewardType::Badge);
    return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(
    FHorizonProfileCosmeticEligibilityTest,
    "BridgePoint.Horizon.Systems.Progression.ProfileCosmeticEligibility",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FHorizonProfileCosmeticEligibilityTest::RunTest(const FString& Parameters)
{
    const TArray<FString> BadgeUnlocks = {
        TEXT("PRESTIGE_COSMETIC_001"),
        TEXT("SURVIVOR_BADGE_ALPHA")
    };
    const TArray<FString> BannerUnlocks = {
        TEXT("PRESTIGE_COSMETIC_010")
    };

    TestTrue(TEXT("Earned badge can be equipped"),
        UHorizonProgressionSubsystem::CanEquipProfileCosmetic(
            EHorizonRewardType::Badge,
            TEXT("PRESTIGE_COSMETIC_001"),
            BadgeUnlocks));
    TestTrue(TEXT("Whitespace is normalized before badge lookup"),
        UHorizonProgressionSubsystem::CanEquipProfileCosmetic(
            EHorizonRewardType::Badge,
            TEXT("  SURVIVOR_BADGE_ALPHA  "),
            BadgeUnlocks));
    TestTrue(TEXT("Earned banner can be equipped"),
        UHorizonProgressionSubsystem::CanEquipProfileCosmetic(
            EHorizonRewardType::Banner,
            TEXT("PRESTIGE_COSMETIC_010"),
            BannerUnlocks));
    TestFalse(TEXT("Locked badge cannot be equipped"),
        UHorizonProgressionSubsystem::CanEquipProfileCosmetic(
            EHorizonRewardType::Badge,
            TEXT("PRESTIGE_COSMETIC_099"),
            BadgeUnlocks));
    TestFalse(TEXT("Empty profile key fails closed"),
        UHorizonProgressionSubsystem::CanEquipProfileCosmetic(
            EHorizonRewardType::Banner,
            TEXT("   "),
            BannerUnlocks));
    TestFalse(TEXT("Non-profile reward cannot be equipped as identity"),
        UHorizonProgressionSubsystem::CanEquipProfileCosmetic(
            EHorizonRewardType::Salvage,
            TEXT("DAILY_SALVAGE"),
            BadgeUnlocks));
    return true;
}

#endif
