#include "HorizonInfectedDirectorSubsystem.h"

#include "Misc/AutomationTest.h"
#include "UObject/UObjectGlobals.h"

#if WITH_DEV_AUTOMATION_TESTS

IMPLEMENT_SIMPLE_AUTOMATION_TEST(
    FHorizonInfectedLurkerStalkerRosterTest,
    "BridgePoint.Horizon.Systems.Infected.LurkerStalkerRoster",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FHorizonInfectedLurkerStalkerRosterTest::RunTest(const FString& Parameters)
{
    UHorizonInfectedDirectorSubsystem* Director =
        NewObject<UHorizonInfectedDirectorSubsystem>();
    TestNotNull(TEXT("Infected director can be created for deterministic tuning QA"), Director);
    if (!Director)
    {
        return false;
    }

    const FHorizonInfectedTuning Early = Director->GetTuning(1, 0.5f, 0.5f, 0.0f);
    const FHorizonInfectedTuning Late = Director->GetTuning(365, 0.5f, 0.8f, 0.0f);

    TestTrue(TEXT("Lurkers are present from the early residual infected pool"),
        Early.LurkerChance > 0.0f);
    TestEqual(TEXT("Stalkers stay out of the earliest event days"),
        Early.StalkerChance, 0.0f);
    TestTrue(TEXT("Stalkers phase into the later event"),
        Late.StalkerChance > 0.0f);
    TestTrue(TEXT("Lurker chance remains bounded"),
        Late.LurkerChance <= 0.15f);
    TestTrue(TEXT("Stalker chance remains bounded"),
        Late.StalkerChance <= 0.08f);

    const float LurkerSpeed =
        Director->GetMovementSpeedMps(EHorizonInfectedArchetype::Lurker);
    const float StalkerSpeed =
        Director->GetMovementSpeedMps(EHorizonInfectedArchetype::Stalker);
    const float SprinterSpeed =
        Director->GetMovementSpeedMps(EHorizonInfectedArchetype::Sprinter);

    TestTrue(TEXT("Lurker stays faster than a shambler but slower than a stalker"),
        LurkerSpeed > Director->GetMovementSpeedMps(EHorizonInfectedArchetype::Shambler) &&
        LurkerSpeed < StalkerSpeed);
    TestTrue(TEXT("Stalker stays below sprinter speed"),
        StalkerSpeed < SprinterSpeed);
    TestFalse(TEXT("Lurker does not inherit spider/orc hopping"),
        Director->ShouldHop(EHorizonInfectedArchetype::Lurker));
    TestFalse(TEXT("Stalker does not inherit spider/orc hopping"),
        Director->ShouldHop(EHorizonInfectedArchetype::Stalker));

    bool bSawLurker = false;
    bool bSawStalker = false;
    for (int32 Seed = 0; Seed < 10000 && (!bSawLurker || !bSawStalker); ++Seed)
    {
        const EHorizonInfectedArchetype Picked =
            Director->PickArchetype(365, 0.5f, 0.8f, Seed);
        bSawLurker |= Picked == EHorizonInfectedArchetype::Lurker;
        bSawStalker |= Picked == EHorizonInfectedArchetype::Stalker;
    }

    TestTrue(TEXT("Late deterministic spawn rolls can produce a Lurker"), bSawLurker);
    TestTrue(TEXT("Late deterministic spawn rolls can produce a Stalker"), bSawStalker);
    return true;
}

#endif
