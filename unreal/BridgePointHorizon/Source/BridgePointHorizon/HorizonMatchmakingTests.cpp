#include "HorizonMatchmakingSubsystem.h"

#include "Misc/AutomationTest.h"

#if WITH_DEV_AUTOMATION_TESTS

namespace HorizonMatchmakingTest
{
FHorizonMatchProfile MakeProfile(const FString& PlayerId)
{
    FHorizonMatchProfile Profile;
    Profile.PlayerId = PlayerId;
    Profile.SkillMean = 25.0f;
    Profile.SkillUncertainty = 8.333f;
    Profile.CareerLevel = 35;
    Profile.LifetimeKills = 250;
    Profile.Prestige = 1;
    Profile.InputPool = EHorizonInputPool::Gamepad;
    Profile.PlatformPool = EHorizonPlatformPool::Console;
    Profile.EstimatedPingMs = 45;
    Profile.PartySize = 1;
    return Profile;
}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(
    FHorizonBalancedMatchTest,
    "BridgePoint.Horizon.Matchmaking.BalancedProfilesAreEligible",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FHorizonBalancedMatchTest::RunTest(const FString& Parameters)
{
    const UHorizonMatchmakingSubsystem* Subject = NewObject<UHorizonMatchmakingSubsystem>();
    const FHorizonMatchCompatibility Result = Subject->EvaluateCompatibility(
        HorizonMatchmakingTest::MakeProfile(TEXT("host")),
        HorizonMatchmakingTest::MakeProfile(TEXT("candidate")));

    TestTrue(TEXT("equivalent valid profiles are eligible"), Result.bEligible);
    TestTrue(TEXT("balanced compatibility remains high"), Result.Score01 >= 0.90f);
    TestTrue(TEXT("eligible profiles have no rejection reason"), Result.RejectionReason.IsEmpty());
    return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(
    FHorizonMatchmakingGuardrailsTest,
    "BridgePoint.Horizon.Matchmaking.InputLatencyAndPartyGuardrails",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FHorizonMatchmakingGuardrailsTest::RunTest(const FString& Parameters)
{
    const UHorizonMatchmakingSubsystem* Subject = NewObject<UHorizonMatchmakingSubsystem>();
    const FHorizonMatchProfile Host = HorizonMatchmakingTest::MakeProfile(TEXT("host"));

    FHorizonMatchProfile CrossInput = HorizonMatchmakingTest::MakeProfile(TEXT("cross-input"));
    CrossInput.InputPool = EHorizonInputPool::MouseKeyboard;
    FHorizonMatchCompatibility Result = Subject->EvaluateCompatibility(Host, CrossInput);
    TestFalse(TEXT("cross-input requires mutual opt-in"), Result.bEligible);
    TestEqual(TEXT("cross-input rejection is explainable"), Result.RejectionReason, FString(TEXT("INPUT_POOL_OPT_IN_REQUIRED")));

    FHorizonMatchProfile HighLatency = HorizonMatchmakingTest::MakeProfile(TEXT("high-latency"));
    HighLatency.EstimatedPingMs = 181;
    Result = Subject->EvaluateCompatibility(Host, HighLatency);
    TestFalse(TEXT("latency above the hard safety limit is rejected"), Result.bEligible);
    TestEqual(TEXT("latency rejection is explainable"), Result.RejectionReason, FString(TEXT("CONNECTION_OUTSIDE_LIMIT")));

    FHorizonMatchProfile InvalidParty = HorizonMatchmakingTest::MakeProfile(TEXT("invalid-party"));
    InvalidParty.PartySize = 5;
    Result = Subject->EvaluateCompatibility(Host, InvalidParty);
    TestFalse(TEXT("oversized parties are rejected"), Result.bEligible);
    TestEqual(TEXT("party rejection is explainable"), Result.RejectionReason, FString(TEXT("INVALID_PARTY_SIZE")));
    return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(
    FHorizonSkillUncertaintyTest,
    "BridgePoint.Horizon.Matchmaking.SkillUncertaintyWidensSearchFairly",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FHorizonSkillUncertaintyTest::RunTest(const FString& Parameters)
{
    const UHorizonMatchmakingSubsystem* Subject = NewObject<UHorizonMatchmakingSubsystem>();

    FHorizonMatchProfile Host = HorizonMatchmakingTest::MakeProfile(TEXT("host"));
    Host.SkillMean = 25.0f;
    Host.SkillUncertainty = 2.0f;

    FHorizonMatchProfile CertainCandidate = HorizonMatchmakingTest::MakeProfile(TEXT("certain"));
    CertainCandidate.SkillMean = 45.0f;
    CertainCandidate.SkillUncertainty = 2.0f;

    FHorizonMatchProfile UncertainCandidate = CertainCandidate;
    UncertainCandidate.PlayerId = TEXT("uncertain");
    UncertainCandidate.SkillUncertainty = 20.0f;

    const FHorizonMatchCompatibility Certain = Subject->EvaluateCompatibility(Host, CertainCandidate);
    const FHorizonMatchCompatibility Uncertain = Subject->EvaluateCompatibility(Host, UncertainCandidate);

    TestTrue(
        TEXT("uncertainty widens the search without changing the observed skill gap"),
        Uncertain.Score01 > Certain.Score01);
    TestEqual(TEXT("skill gap remains evidence-based"), Uncertain.SkillGap, Certain.SkillGap);
    return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(
    FHorizonCrossInputConsentTest,
    "BridgePoint.Horizon.Matchmaking.CrossInputRequiresMutualConsent",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FHorizonCrossInputConsentTest::RunTest(const FString& Parameters)
{
    const UHorizonMatchmakingSubsystem* Subject = NewObject<UHorizonMatchmakingSubsystem>();

    FHorizonMatchProfile Host = HorizonMatchmakingTest::MakeProfile(TEXT("host"));
    Host.bCrossInputOptIn = true;

    FHorizonMatchProfile Candidate = HorizonMatchmakingTest::MakeProfile(TEXT("candidate"));
    Candidate.InputPool = EHorizonInputPool::MouseKeyboard;

    TestFalse(
        TEXT("one-sided consent remains rejected"),
        Subject->EvaluateCompatibility(Host, Candidate).bEligible);

    Candidate.bCrossInputOptIn = true;
    const FHorizonMatchCompatibility Mutual = Subject->EvaluateCompatibility(Host, Candidate);
    TestTrue(TEXT("mutual cross-input consent permits evaluation"), Mutual.bEligible);
    TestTrue(TEXT("cross-input penalty remains bounded"), Mutual.Score01 >= 0.80f);
    return true;
}

#endif
