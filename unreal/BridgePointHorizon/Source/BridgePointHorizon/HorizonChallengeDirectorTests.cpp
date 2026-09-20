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


IMPLEMENT_SIMPLE_AUTOMATION_TEST(
    FHorizonRepeatableChallengeProgressTest,
    "BridgePoint.Horizon.Systems.Challenges.RepeatableProgress",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FHorizonRepeatableChallengeProgressTest::RunTest(const FString& Parameters)
{
    TestEqual(TEXT("Ordinary progress advances toward target"),
        UHorizonChallengeDirectorSubsystem::AdvanceProgressSafely(4, 3, 10), 7);
    TestEqual(TEXT("Progress clamps exactly at target"),
        UHorizonChallengeDirectorSubsystem::AdvanceProgressSafely(9, 50, 10), 10);
    TestEqual(TEXT("Huge progress addition cannot overflow backward"),
        UHorizonChallengeDirectorSubsystem::AdvanceProgressSafely(
            MAX_int32 - 2, MAX_int32, MAX_int32), MAX_int32);
    TestEqual(TEXT("Negative progress addition is rejected"),
        UHorizonChallengeDirectorSubsystem::AdvanceProgressSafely(4, -50, 10), 4);

    FHorizonChallengeRuntimeState Claimed;
    Claimed.ChallengeId = TEXT("hospital-42|0");
    Claimed.NPCSiteId = TEXT("hospital-42");
    Claimed.Definition.TargetCount = 3;
    Claimed.Progress = 3;
    Claimed.bCompleted = true;
    Claimed.bClaimed = true;
    Claimed.CompletedRuns = 7;

    const FHorizonChallengeRuntimeState Next =
        UHorizonChallengeDirectorSubsystem::PrepareNextRun(Claimed);
    TestEqual(TEXT("Repeatable challenge preserves stable NPC identity"),
        Next.ChallengeId, Claimed.ChallengeId);
    TestEqual(TEXT("Repeatable challenge clears prior progress"), Next.Progress, 0);
    TestFalse(TEXT("Repeatable challenge begins incomplete"), Next.bCompleted);
    TestFalse(TEXT("Repeatable challenge begins unclaimed"), Next.bClaimed);
    TestEqual(TEXT("Completed-run history survives challenge reset"), Next.CompletedRuns, 7);

    Claimed.bClaimed = false;
    const FHorizonChallengeRuntimeState Active =
        UHorizonChallengeDirectorSubsystem::PrepareNextRun(Claimed);
    TestEqual(TEXT("Active unclaimed challenge is never reset"), Active.Progress, 3);
    TestTrue(TEXT("Active completed challenge remains ready to claim"), Active.bCompleted);
    return true;
}


IMPLEMENT_SIMPLE_AUTOMATION_TEST(
    FHorizonBoundedChallengeSiteRankingTest,
    "BridgePoint.Horizon.Performance.Challenges.BoundedSiteRanking",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FHorizonBoundedChallengeSiteRankingTest::RunTest(const FString& Parameters)
{
    UHorizonChallengeDirectorSubsystem* Director =
        NewObject<UHorizonChallengeDirectorSubsystem>();
    TestNotNull(TEXT("Challenge director can evaluate placement without a game instance"), Director);
    if (!Director)
    {
        return false;
    }

    TArray<FHorizonNPCSiteCandidate> Candidates;
    Candidates.Reserve(1000);
    for (int32 Index = 0; Index < 1000; ++Index)
    {
        FHorizonNPCSiteCandidate Candidate;
        Candidate.SiteId = FString::Printf(TEXT("wilderness-%04d"), Index);
        Candidate.WildernessAffinity = static_cast<float>(Index) / 999.0f;
        Candidate.PedestrianAccess = 0.5f;
        Candidate.LocalDanger = 0.34f;
        Candidates.Add(Candidate);
    }

    const TArray<int32> Top = Director->SelectTopSiteIndices(
        EHorizonChallengeNPCRole::Ranger, Candidates, 100);
    TestEqual(TEXT("Large candidate pool remains capped to four ranked sites"), Top.Num(), 4);
    if (Top.Num() == 4)
    {
        TestEqual(TEXT("Highest-scoring site remains first"), Top[0], 999);
        TestEqual(TEXT("Second-highest site remains second"), Top[1], 998);
        TestEqual(TEXT("Third-highest site remains third"), Top[2], 997);
        TestEqual(TEXT("Fourth-highest site remains fourth"), Top[3], 996);
    }

    const FHorizonNPCSiteCandidate FirstPick = Director->PickStrategicSite(
        EHorizonChallengeNPCRole::Ranger, Candidates, 7781);
    const FHorizonNPCSiteCandidate RepeatPick = Director->PickStrategicSite(
        EHorizonChallengeNPCRole::Ranger, Candidates, 7781);
    TestEqual(TEXT("Bounded strategic selection remains deterministic for a seed"),
        FirstPick.SiteId, RepeatPick.SiteId);
    TestTrue(TEXT("Strategic selection stays inside the strongest four candidates"),
        FirstPick.SiteId == TEXT("wilderness-0999") ||
        FirstPick.SiteId == TEXT("wilderness-0998") ||
        FirstPick.SiteId == TEXT("wilderness-0997") ||
        FirstPick.SiteId == TEXT("wilderness-0996"));

    TArray<FHorizonNPCSiteCandidate> Tied;
    for (int32 Index = 0; Index < 6; ++Index)
    {
        FHorizonNPCSiteCandidate Candidate;
        Candidate.SiteId = FString::Printf(TEXT("tie-%d"), Index);
        Candidate.WildernessAffinity = 0.5f;
        Candidate.PedestrianAccess = 0.5f;
        Candidate.LocalDanger = 0.34f;
        Tied.Add(Candidate);
    }
    const TArray<int32> StableTies = Director->SelectTopSiteIndices(
        EHorizonChallengeNPCRole::Ranger, Tied, 4);
    TestEqual(TEXT("Equal-score selection remains capped"), StableTies.Num(), 4);
    if (StableTies.Num() == 4)
    {
        TestEqual(TEXT("Equal scores preserve source order"), StableTies[0], 0);
        TestEqual(TEXT("Equal-score cap preserves the fourth source item"), StableTies[3], 3);
    }
    return true;
}

#endif
