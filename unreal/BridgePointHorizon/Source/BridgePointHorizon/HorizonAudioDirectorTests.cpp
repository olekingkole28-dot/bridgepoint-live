#if WITH_DEV_AUTOMATION_TESTS

#include "HorizonAudioDirectorSubsystem.h"

#include "Misc/AutomationTest.h"

IMPLEMENT_SIMPLE_AUTOMATION_TEST(
    FHorizonRegionalAmbienceIdentityTest,
    "BridgePoint.Horizon.Audio.RegionalAmbience.Identity",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FHorizonRegionalAmbienceIdentityTest::RunTest(const FString& Parameters)
{
    UHorizonAudioDirectorSubsystem* Audio = NewObject<UHorizonAudioDirectorSubsystem>();
    TestNotNull(TEXT("Audio director should construct"), Audio);
    if (!Audio)
    {
        return false;
    }

    Audio->SetAcousticSpace(EHorizonAcousticSpace::Outdoor);
    Audio->SetRegionalAmbience(EHorizonRegionalAmbience::SoutheastWetlands);
    const FHorizonRegionalAmbienceMix Wetlands = Audio->GetRegionalAmbienceMix();
    TestTrue(TEXT("Wetlands should emphasize fauna"), Wetlands.FaunaGain > Wetlands.UrbanHumGain);
    TestTrue(TEXT("Wetlands should emphasize water"), Wetlands.WaterGain > 0.70f);

    Audio->SetRegionalAmbience(EHorizonRegionalAmbience::DesertSouthwest);
    const FHorizonRegionalAmbienceMix Desert = Audio->GetRegionalAmbienceMix();
    TestTrue(TEXT("Desert should emphasize wind over water"), Desert.WindGain > Desert.WaterGain);
    TestTrue(TEXT("Regional profiles should remain audibly distinct"),
        Wetlands.FaunaGain > Desert.FaunaGain && Wetlands.WaterGain > Desert.WaterGain);
    return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(
    FHorizonAcousticTransmissionTest,
    "BridgePoint.Horizon.Audio.RegionalAmbience.AcousticTransmission",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FHorizonAcousticTransmissionTest::RunTest(const FString& Parameters)
{
    UHorizonAudioDirectorSubsystem* Audio = NewObject<UHorizonAudioDirectorSubsystem>();
    TestNotNull(TEXT("Audio director should construct"), Audio);
    if (!Audio)
    {
        return false;
    }

    Audio->SetRegionalAmbience(EHorizonRegionalAmbience::PacificForest);
    Audio->SetAcousticSpace(EHorizonAcousticSpace::Outdoor);
    const FHorizonRegionalAmbienceMix Outdoor = Audio->GetRegionalAmbienceMix();

    Audio->SetAcousticSpace(EHorizonAcousticSpace::IndoorSmall);
    const FHorizonRegionalAmbienceMix Interior = Audio->GetRegionalAmbienceMix();
    TestEqual(TEXT("Small-room exterior transmission"), Interior.InteriorTransmission, 0.24f);
    TestTrue(TEXT("Interior should attenuate exterior fauna"), Interior.FaunaGain < Outdoor.FaunaGain);
    TestTrue(TEXT("Interior should attenuate exterior vegetation"), Interior.VegetationGain < Outdoor.VegetationGain);

    Audio->SetAcousticSpace(EHorizonAcousticSpace::Rooftop);
    const FHorizonRegionalAmbienceMix Rooftop = Audio->GetRegionalAmbienceMix();
    TestTrue(TEXT("Rooftop wind should remain fully exposed"), Rooftop.WindGain > Outdoor.WindGain);
    return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(
    FHorizonCreatureVocalDirectionTest,
    "BridgePoint.Horizon.Audio.Creatures.VocalDirection",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FHorizonCreatureVocalDirectionTest::RunTest(const FString& Parameters)
{
    UHorizonAudioDirectorSubsystem* Audio = NewObject<UHorizonAudioDirectorSubsystem>();
    TestNotNull(TEXT("Audio director should construct for creature vocals"), Audio);
    if (!Audio)
    {
        return false;
    }

    Audio->SetAcousticSpace(EHorizonAcousticSpace::Outdoor);
    const FHorizonCreatureVocalMix ShamblerIdle = Audio->GetCreatureVocalMix(
        EHorizonCreatureVocalArchetype::Shambler,
        EHorizonCreatureVocalIntent::Idle,
        800.0f,
        false,
        42);
    const FHorizonCreatureVocalMix ShamblerAttack = Audio->GetCreatureVocalMix(
        EHorizonCreatureVocalArchetype::Shambler,
        EHorizonCreatureVocalIntent::Attack,
        800.0f,
        false,
        42);
    TestTrue(TEXT("Attack vocal is stronger than idle vocal"),
        ShamblerAttack.Volume > ShamblerIdle.Volume);

    const FHorizonCreatureVocalMix Screamer = Audio->GetCreatureVocalMix(
        EHorizonCreatureVocalArchetype::Screamer,
        EHorizonCreatureVocalIntent::Alert,
        800.0f,
        false,
        11);
    TestTrue(TEXT("Screamer emphasizes the scream layer"),
        Screamer.ScreamLayerGain > Screamer.GrowlLayerGain);
    TestTrue(TEXT("Screamer projects farther than a shambler"),
        Screamer.MaxDistanceCm > ShamblerAttack.MaxDistanceCm);

    const FHorizonCreatureVocalMix Clear = Audio->GetCreatureVocalMix(
        EHorizonCreatureVocalArchetype::Sprinter,
        EHorizonCreatureVocalIntent::Attack,
        5000.0f,
        false,
        8);
    const FHorizonCreatureVocalMix Occluded = Audio->GetCreatureVocalMix(
        EHorizonCreatureVocalArchetype::Sprinter,
        EHorizonCreatureVocalIntent::Attack,
        5000.0f,
        true,
        8);
    TestTrue(TEXT("Occlusion reduces creature vocal volume"), Occluded.Volume < Clear.Volume);
    TestTrue(TEXT("Occlusion lowers creature vocal cutoff"),
        Occluded.LowPassCutoffHz < Clear.LowPassCutoffHz);

    const FHorizonCreatureVocalMix Repeat = Audio->GetCreatureVocalMix(
        EHorizonCreatureVocalArchetype::Sprinter,
        EHorizonCreatureVocalIntent::Attack,
        5000.0f,
        false,
        8);
    TestEqual(TEXT("Seeded creature vocal pitch is deterministic"), Repeat.Pitch, Clear.Pitch);
    TestEqual(TEXT("Seeded creature vocal volume is deterministic"), Repeat.Volume, Clear.Volume);
    return true;
}

#endif
