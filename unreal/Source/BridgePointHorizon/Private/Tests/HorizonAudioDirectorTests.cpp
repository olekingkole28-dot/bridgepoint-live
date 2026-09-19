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

IMPLEMENT_SIMPLE_AUTOMATION_TEST(
    FHorizonWeaponReportAcousticsTest,
    "BridgePoint.Horizon.Audio.Weapons.ReportAcoustics",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FHorizonWeaponReportAcousticsTest::RunTest(const FString& Parameters)
{
    UHorizonAudioDirectorSubsystem* Audio = NewObject<UHorizonAudioDirectorSubsystem>();
    TestNotNull(TEXT("Audio director should construct for weapon reports"), Audio);
    if (!Audio)
    {
        return false;
    }

    Audio->SetRegionalAmbience(EHorizonRegionalAmbience::Mountain);
    Audio->SetAcousticSpace(EHorizonAcousticSpace::Outdoor);
    const FHorizonWeaponReportMix NearRifle = Audio->GetWeaponReportMix(
        EHorizonWeaponReportClass::Rifle, 1000.0f, false, 17);
    const FHorizonWeaponReportMix FarRifle = Audio->GetWeaponReportMix(
        EHorizonWeaponReportClass::Rifle, 30000.0f, false, 17);
    TestTrue(TEXT("Distant reports arrive later"),
        FarRifle.PropagationDelaySeconds > NearRifle.PropagationDelaySeconds);
    TestTrue(TEXT("Distant reports attenuate"),
        FarRifle.ReportGain < NearRifle.ReportGain);

    Audio->SetAcousticSpace(EHorizonAcousticSpace::IndoorSmall);
    const FHorizonWeaponReportMix IndoorRifle = Audio->GetWeaponReportMix(
        EHorizonWeaponReportClass::Rifle, 1000.0f, false, 17);
    TestTrue(TEXT("Small rooms emphasize early reflections"),
        IndoorRifle.EarlyReflectionGain > NearRifle.EarlyReflectionGain);

    Audio->SetAcousticSpace(EHorizonAcousticSpace::Tunnel);
    const FHorizonWeaponReportMix TunnelRifle = Audio->GetWeaponReportMix(
        EHorizonWeaponReportClass::Rifle, 1000.0f, false, 17);
    TestTrue(TEXT("Tunnels produce a stronger tail than small rooms"),
        TunnelRifle.TailGain > IndoorRifle.TailGain);

    Audio->SetAcousticSpace(EHorizonAcousticSpace::Outdoor);
    const FHorizonWeaponReportMix Clear = Audio->GetWeaponReportMix(
        EHorizonWeaponReportClass::Precision, 8000.0f, false, 44);
    const FHorizonWeaponReportMix Occluded = Audio->GetWeaponReportMix(
        EHorizonWeaponReportClass::Precision, 8000.0f, true, 44);
    TestTrue(TEXT("Occlusion reduces weapon report gain"), Occluded.ReportGain < Clear.ReportGain);
    TestTrue(TEXT("Occlusion lowers weapon report cutoff"), Occluded.LowPassCutoffHz < Clear.LowPassCutoffHz);

    const FHorizonWeaponReportMix Suppressed = Audio->GetWeaponReportMix(
        EHorizonWeaponReportClass::Suppressed, 1000.0f, false, 9);
    TestTrue(TEXT("Suppressed reports favor mechanism over muzzle"),
        Suppressed.MechanicalGain > Suppressed.ReportGain);
    TestTrue(TEXT("Suppressed reports have shorter reach"),
        Suppressed.MaxDistanceCm < NearRifle.MaxDistanceCm);

    const FHorizonWeaponReportMix Repeat = Audio->GetWeaponReportMix(
        EHorizonWeaponReportClass::Precision, 8000.0f, false, 44);
    TestEqual(TEXT("Seeded weapon report pitch is deterministic"), Repeat.Pitch, Clear.Pitch);
    return true;
}


IMPLEMENT_SIMPLE_AUTOMATION_TEST(
    FHorizonUiFeedbackClarityTest,
    "BridgePoint.Horizon.Audio.UIFeedback.Clarity",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FHorizonUiFeedbackClarityTest::RunTest(const FString& Parameters)
{
    const FHorizonUiFeedbackMix Empty = UHorizonAudioDirectorSubsystem::BuildUiFeedbackMix(
        EHorizonUiFeedbackCue::Empty, 1.0f, 27);
    const FHorizonUiFeedbackMix ReloadStart = UHorizonAudioDirectorSubsystem::BuildUiFeedbackMix(
        EHorizonUiFeedbackCue::ReloadStart, 1.0f, 27);
    const FHorizonUiFeedbackMix ReloadComplete = UHorizonAudioDirectorSubsystem::BuildUiFeedbackMix(
        EHorizonUiFeedbackCue::ReloadComplete, 0.0f, 9);
    const FHorizonUiFeedbackMix Repeat = UHorizonAudioDirectorSubsystem::BuildUiFeedbackMix(
        EHorizonUiFeedbackCue::Empty, 1.0f, 27);

    TestTrue(TEXT("Critical empty cue remains clearer than routine reload start in combat"),
        Empty.Gain > ReloadStart.Gain);
    TestTrue(TEXT("Empty cue emphasizes the low warning tone"),
        Empty.LowToneGain > Empty.HighToneGain);
    TestTrue(TEXT("Reload completion emphasizes the high confirmation tone"),
        ReloadComplete.HighToneGain > ReloadComplete.LowToneGain);
    TestTrue(TEXT("UI feedback is listener relative"), Empty.bListenerRelative);
    TestTrue(TEXT("UI feedback gain remains restrained"), Empty.Gain <= 0.82f);
    TestTrue(TEXT("UI feedback ducking cannot mask combat"),
        Empty.TransientDuck >= 0.0f && Empty.TransientDuck <= 0.08f);
    TestEqual(TEXT("Seeded UI feedback pitch is deterministic"), Repeat.Pitch, Empty.Pitch);
    TestEqual(TEXT("Seeded UI feedback gain is deterministic"), Repeat.Gain, Empty.Gain);
    return true;
}

#endif
