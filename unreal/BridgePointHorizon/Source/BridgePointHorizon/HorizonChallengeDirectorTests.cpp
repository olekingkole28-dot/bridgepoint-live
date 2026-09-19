#if WITH_DEV_AUTOMATION_TESTS

#include "HorizonChallengeDirectorSubsystem.h"

#include "Misc/AutomationTest.h"

IMPLEMENT_SIMPLE_AUTOMATION_TEST(
    FHorizonChallengeSurvivalRewardIntegrationTest,
    "BridgePoint.Horizon.Systems.Challenges.SurvivalRewardIntegration",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FHorizonChallengeSurvivalRewardIntegrationTest::RunTest(const FString& Parameters)
{
    TestEqual(TEXT("Medic reward enters usable bandage inventory"),
        UHorizonChallengeDirectorSubsystem::ResolveSurvivalInventoryItem(TEXT("FIRST_AID_KIT")),
        FName(TEXT("bandage")));
    TestEqual(TEXT("Quartermaster reward enters weighted salvage inventory"),
        UHorizonChallengeDirectorSubsystem::ResolveSurvivalInventoryItem(TEXT("AMMO_CACHE")),
        FName(TEXT("scrap_metal")));
    TestEqual(TEXT("Ranger reward enters consumable ration inventory"),
        UHorizonChallengeDirectorSubsystem::ResolveSurvivalInventoryItem(TEXT("SURVIVAL_CACHE")),
        FName(TEXT("ration")));
    TestEqual(TEXT("Mechanic reward enters craftable repair inventory"),
        UHorizonChallengeDirectorSubsystem::ResolveSurvivalInventoryItem(TEXT("VEHICLE_PART_CACHE")),
        FName(TEXT("repair_kit")));
    TestTrue(TEXT("Unknown reward keys fail closed"),
        UHorizonChallengeDirectorSubsystem::ResolveSurvivalInventoryItem(TEXT("UNRECOGNIZED_ITEM")).IsNone());

    FHorizonChallengeReward Reward;
    Reward.RewardKey = TEXT("FIRST_AID_KIT");
    Reward.Amount = 2;
    Reward.bFreeReward = true;
    Reward.Kind = EHorizonChallengeRewardKind::SurvivalItem;
    TestEqual(TEXT("Medic kit expands to four usable bandages"),
        UHorizonChallengeDirectorSubsystem::ResolveSurvivalInventoryQuantity(Reward), 4);
    TestEqual(TEXT("Capacity overflow is deferred exactly once"),
        UHorizonChallengeDirectorSubsystem::ComputeDeferredRewardAmount(4, 1), 3);
    TestEqual(TEXT("Over-grant cannot create negative deferred inventory"),
        UHorizonChallengeDirectorSubsystem::ComputeDeferredRewardAmount(2, 4), 0);
    TestEqual(TEXT("Invalid requested quantity cannot create inventory"),
        UHorizonChallengeDirectorSubsystem::ComputeDeferredRewardAmount(-2, 0), 0);
    return true;
}

#endif
