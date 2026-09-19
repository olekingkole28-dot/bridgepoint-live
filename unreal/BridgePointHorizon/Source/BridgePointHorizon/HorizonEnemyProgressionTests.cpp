#include "HorizonEnemyProgressionSubsystem.h"

#include "Misc/AutomationTest.h"

#if WITH_DEV_AUTOMATION_TESTS

IMPLEMENT_SIMPLE_AUTOMATION_TEST(
    FHorizonEnemyProgressionCapabilityTest,
    "BridgePoint.Horizon.Systems.Enemies.CapabilityScaling",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FHorizonEnemyProgressionCapabilityTest::RunTest(const FString& Parameters)
{
    FHorizonEnemyProgressionContext Solo;
    const FHorizonEnemyTierProfile Baseline =
        UHorizonEnemyProgressionSubsystem::BuildTierProfile(Solo);

    FHorizonEnemyProgressionContext Squad;
    Squad.PlayerCount = 4;
    Squad.AverageCareerLevel = 80.0f;
    Squad.AveragePrestige = 20.0f;
    Squad.AverageGearScore = 85.0f;
    Squad.RecentWinRate01 = 0.8f;
    Squad.WorldThreat01 = 0.8f;
    const FHorizonEnemyTierProfile Advanced =
        UHorizonEnemyProgressionSubsystem::BuildTierProfile(Squad);

    TestTrue(TEXT("Capable squads receive a larger encounter budget"),
        Advanced.EncounterBudget > Baseline.EncounterBudget);
    TestTrue(TEXT("Capable squads permit more special infected"),
        Advanced.MaxSpecialInfected > Baseline.MaxSpecialInfected);
    TestTrue(TEXT("Health scaling stays below the hard cap"),
        Advanced.HealthMultiplier <= 1.42f);
    TestTrue(TEXT("Damage scaling stays below the hard cap"),
        Advanced.DamageMultiplier <= 1.34f);
    TestTrue(TEXT("Speed scaling stays below the hard cap"),
        Advanced.SpeedMultiplier <= 1.10f);
    return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(
    FHorizonEnemyProgressionRecoveryTest,
    "BridgePoint.Horizon.Systems.Enemies.LossRecovery",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FHorizonEnemyProgressionRecoveryTest::RunTest(const FString& Parameters)
{
    const float AfterStrongWin = UHorizonEnemyProgressionSubsystem::ComputeNextWorldThreat(
        0.5f, true, 1.0f);
    const float AfterLoss = UHorizonEnemyProgressionSubsystem::ComputeNextWorldThreat(
        0.5f, false, 0.0f);

    TestTrue(TEXT("Strong wins raise world threat"), AfterStrongWin > 0.5f);
    TestTrue(TEXT("Losses create recovery space"), AfterLoss < 0.5f);
    TestTrue(TEXT("Loss recovery is stronger than one win increase"),
        (0.5f - AfterLoss) > (AfterStrongWin - 0.5f));
    TestEqual(TEXT("Threat clamps at zero"),
        UHorizonEnemyProgressionSubsystem::ComputeNextWorldThreat(0.0f, false, 0.0f),
        0.0f);
    TestEqual(TEXT("Threat clamps at one"),
        UHorizonEnemyProgressionSubsystem::ComputeNextWorldThreat(1.0f, true, 1.0f),
        1.0f);
    return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(
    FHorizonEnemyProgressionPrestigeGuardTest,
    "BridgePoint.Horizon.Systems.Enemies.PrestigeGuardrail",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FHorizonEnemyProgressionPrestigeGuardTest::RunTest(const FString& Parameters)
{
    FHorizonEnemyProgressionContext Capped;
    Capped.AveragePrestige = 100.0f;
    const float AtCap = UHorizonEnemyProgressionSubsystem::BuildTierProfile(Capped).DifficultyScalar;

    FHorizonEnemyProgressionContext Invalid = Capped;
    Invalid.AveragePrestige = 10000.0f;
    const float AboveCap = UHorizonEnemyProgressionSubsystem::BuildTierProfile(Invalid).DifficultyScalar;

    TestEqual(TEXT("Prestige above 100 cannot inflate encounter pressure"), AboveCap, AtCap);
    TestTrue(TEXT("Prestige alone cannot create boss encounters"),
        !UHorizonEnemyProgressionSubsystem::BuildTierProfile(Capped).bBossEligible);
    return true;
}

#endif
