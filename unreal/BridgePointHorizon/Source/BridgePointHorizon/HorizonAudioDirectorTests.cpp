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



IMPLEMENT_SIMPLE_AUTOMATION_TEST(
    FHorizonEnvironmentalEmitterAudioTest,
    "BridgePoint.Horizon.Audio.Environment.FireWaterEmitters",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FHorizonEnvironmentalEmitterAudioTest::RunTest(const FString& Parameters)
{
    const FHorizonEnvironmentalEmitterMix QuietFire =
        UHorizonAudioDirectorSubsystem::BuildFireEmitterMix(
            EHorizonFireAudioClass::Campfire, 0.25f, 500.0f,
            EHorizonAcousticSpace::Outdoor, false, 31);
    const FHorizonEnvironmentalEmitterMix IntenseFire =
        UHorizonAudioDirectorSubsystem::BuildFireEmitterMix(
            EHorizonFireAudioClass::Campfire, 1.0f, 500.0f,
            EHorizonAcousticSpace::Outdoor, false, 31);
    TestTrue(TEXT("Fire intensity raises the continuous bed"),
        IntenseFire.BedGain > QuietFire.BedGain);
    TestTrue(TEXT("Fire intensity raises transient crackle"),
        IntenseFire.TransientGain > QuietFire.TransientGain);

    const FHorizonEnvironmentalEmitterMix Campfire =
        UHorizonAudioDirectorSubsystem::BuildFireEmitterMix(
            EHorizonFireAudioClass::Campfire, 1.0f, 1000.0f,
            EHorizonAcousticSpace::Outdoor, false, 52);
    const FHorizonEnvironmentalEmitterMix Wildfire =
        UHorizonAudioDirectorSubsystem::BuildFireEmitterMix(
            EHorizonFireAudioClass::Wildfire, 1.0f, 1000.0f,
            EHorizonAcousticSpace::Outdoor, false, 52);
    TestTrue(TEXT("Wildfire projects farther than a campfire"),
        Wildfire.MaxDistanceCm > Campfire.MaxDistanceCm);
    TestTrue(TEXT("Wildfire carries more low-frequency energy"),
        Wildfire.LowFrequencyGain > Campfire.LowFrequencyGain);

    const FHorizonEnvironmentalEmitterMix FarFire =
        UHorizonAudioDirectorSubsystem::BuildFireEmitterMix(
            EHorizonFireAudioClass::StructureFire, 0.9f, 22000.0f,
            EHorizonAcousticSpace::Outdoor, false, 7);
    const FHorizonEnvironmentalEmitterMix NearFire =
        UHorizonAudioDirectorSubsystem::BuildFireEmitterMix(
            EHorizonFireAudioClass::StructureFire, 0.9f, 1000.0f,
            EHorizonAcousticSpace::Outdoor, false, 7);
    const FHorizonEnvironmentalEmitterMix IndoorFire =
        UHorizonAudioDirectorSubsystem::BuildFireEmitterMix(
            EHorizonFireAudioClass::StructureFire, 0.9f, 1000.0f,
            EHorizonAcousticSpace::IndoorSmall, false, 7);
    const FHorizonEnvironmentalEmitterMix OccludedFire =
        UHorizonAudioDirectorSubsystem::BuildFireEmitterMix(
            EHorizonFireAudioClass::StructureFire, 0.9f, 1000.0f,
            EHorizonAcousticSpace::Outdoor, true, 7);
    TestTrue(TEXT("Distance attenuates fire emitters"),
        FarFire.BedGain < NearFire.BedGain);
    TestTrue(TEXT("Interior walls attenuate exterior fire"),
        IndoorFire.BedGain < NearFire.BedGain);
    TestTrue(TEXT("Fire occlusion lowers the detail cutoff"),
        OccludedFire.LowPassCutoffHz < NearFire.LowPassCutoffHz);

    const FHorizonEnvironmentalEmitterMix ZeroFire =
        UHorizonAudioDirectorSubsystem::BuildFireEmitterMix(
            EHorizonFireAudioClass::Campfire, -2.0f, 0.0f,
            EHorizonAcousticSpace::Outdoor, false, 1);
    TestEqual(TEXT("Invalid fire intensity fails silent"), ZeroFire.BedGain, 0.0f);

    const FHorizonEnvironmentalEmitterMix SlowStream =
        UHorizonAudioDirectorSubsystem::BuildWaterEmitterMix(
            EHorizonWaterAudioClass::Stream, 0.25f, 600.0f,
            EHorizonAcousticSpace::Outdoor, false, 16);
    const FHorizonEnvironmentalEmitterMix FastStream =
        UHorizonAudioDirectorSubsystem::BuildWaterEmitterMix(
            EHorizonWaterAudioClass::Stream, 1.0f, 600.0f,
            EHorizonAcousticSpace::Outdoor, false, 16);
    TestTrue(TEXT("Water flow raises the continuous bed"),
        FastStream.BedGain > SlowStream.BedGain);
    TestTrue(TEXT("Water flow raises transient splashes"),
        FastStream.TransientGain > SlowStream.TransientGain);

    const FHorizonEnvironmentalEmitterMix Drip =
        UHorizonAudioDirectorSubsystem::BuildWaterEmitterMix(
            EHorizonWaterAudioClass::Drip, 1.0f, 500.0f,
            EHorizonAcousticSpace::Outdoor, false, 19);
    const FHorizonEnvironmentalEmitterMix Surf =
        UHorizonAudioDirectorSubsystem::BuildWaterEmitterMix(
            EHorizonWaterAudioClass::Surf, 1.0f, 500.0f,
            EHorizonAcousticSpace::Outdoor, false, 19);
    TestTrue(TEXT("Surf projects farther than individual drips"),
        Surf.MaxDistanceCm > Drip.MaxDistanceCm);
    TestTrue(TEXT("Surf carries more low-frequency energy"),
        Surf.LowFrequencyGain > Drip.LowFrequencyGain);

    const FHorizonEnvironmentalEmitterMix TunnelWater =
        UHorizonAudioDirectorSubsystem::BuildWaterEmitterMix(
            EHorizonWaterAudioClass::Stream, 0.8f, 800.0f,
            EHorizonAcousticSpace::Tunnel, false, 81);
    const FHorizonEnvironmentalEmitterMix OutdoorWater =
        UHorizonAudioDirectorSubsystem::BuildWaterEmitterMix(
            EHorizonWaterAudioClass::Stream, 0.8f, 800.0f,
            EHorizonAcousticSpace::Outdoor, false, 81);
    const FHorizonEnvironmentalEmitterMix OccludedWater =
        UHorizonAudioDirectorSubsystem::BuildWaterEmitterMix(
            EHorizonWaterAudioClass::Stream, 0.8f, 800.0f,
            EHorizonAcousticSpace::Outdoor, true, 81);
    const FHorizonEnvironmentalEmitterMix RepeatWater =
        UHorizonAudioDirectorSubsystem::BuildWaterEmitterMix(
            EHorizonWaterAudioClass::Stream, 0.8f, 800.0f,
            EHorizonAcousticSpace::Outdoor, false, 81);
    TestTrue(TEXT("Tunnel water receives a stronger reverberant tail"),
        TunnelWater.ReverbSend > OutdoorWater.ReverbSend);
    TestTrue(TEXT("Water occlusion lowers the detail cutoff"),
        OccludedWater.LowPassCutoffHz < OutdoorWater.LowPassCutoffHz);
    TestEqual(TEXT("Seeded water pitch is deterministic"),
        RepeatWater.Pitch, OutdoorWater.Pitch);
    TestEqual(TEXT("Seeded water detail is deterministic"),
        RepeatWater.DetailGain, OutdoorWater.DetailGain);
    return true;
}


IMPLEMENT_SIMPLE_AUTOMATION_TEST(
    FHorizonVehicleAudioRuntimeMixTest,
    "BridgePoint.Horizon.Audio.Vehicles.RuntimeMix",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FHorizonVehicleAudioRuntimeMixTest::RunTest(const FString& Parameters)
{
    const FHorizonVehicleAudioMix EngineOff =
        UHorizonAudioDirectorSubsystem::BuildVehicleAudioMix(
            EHorizonVehicleAudioClass::Sedan, false, 0.0f, 0.0f, 1.0f,
            0.0f, true, false, 18);
    const FHorizonVehicleAudioMix Idle =
        UHorizonAudioDirectorSubsystem::BuildVehicleAudioMix(
            EHorizonVehicleAudioClass::Sedan, true, 0.0f, 0.05f, 1.0f,
            0.0f, true, false, 18);
    const FHorizonVehicleAudioMix Moving =
        UHorizonAudioDirectorSubsystem::BuildVehicleAudioMix(
            EHorizonVehicleAudioClass::Sedan, true, 95.0f, 0.50f, 1.0f,
            0.0f, true, false, 18);
    TestEqual(TEXT("Stopped engine has no engine layer"), EngineOff.EngineGain, 0.0f);
    TestEqual(TEXT("Stopped engine has no exhaust layer"), EngineOff.ExhaustGain, 0.0f);
    TestTrue(TEXT("Road speed raises powertrain pitch"), Moving.Pitch > Idle.Pitch);
    TestTrue(TEXT("Road speed introduces tire noise"), Moving.TireGain > Idle.TireGain);

    const FHorizonVehicleAudioMix Sedan =
        UHorizonAudioDirectorSubsystem::BuildVehicleAudioMix(
            EHorizonVehicleAudioClass::Sedan, true, 80.0f, 0.70f, 1.0f,
            500.0f, false, false, 42);
    const FHorizonVehicleAudioMix Pickup =
        UHorizonAudioDirectorSubsystem::BuildVehicleAudioMix(
            EHorizonVehicleAudioClass::Pickup, true, 80.0f, 0.70f, 1.0f,
            500.0f, false, false, 42);
    TestTrue(TEXT("Pickup exhaust has more body than sedan"),
        Pickup.ExhaustGain > Sedan.ExhaustGain);

    const FHorizonVehicleAudioMix Damaged =
        UHorizonAudioDirectorSubsystem::BuildVehicleAudioMix(
            EHorizonVehicleAudioClass::Offroad, true, 55.0f, 0.65f, 0.18f,
            0.0f, true, false, 77);
    const FHorizonVehicleAudioMix Healthy =
        UHorizonAudioDirectorSubsystem::BuildVehicleAudioMix(
            EHorizonVehicleAudioClass::Offroad, true, 55.0f, 0.65f, 1.0f,
            0.0f, true, false, 77);
    TestTrue(TEXT("Damage increases mechanical rattle"),
        Damaged.MechanicalRattleGain > Healthy.MechanicalRattleGain);
    TestTrue(TEXT("Critical damage creates sputter"), Damaged.DamageSputter01 > 0.0f);

    const FHorizonVehicleAudioMix Cabin =
        UHorizonAudioDirectorSubsystem::BuildVehicleAudioMix(
            EHorizonVehicleAudioClass::UtilityVan, true, 70.0f, 0.60f, 1.0f,
            1000.0f, true, false, 9);
    const FHorizonVehicleAudioMix Exterior =
        UHorizonAudioDirectorSubsystem::BuildVehicleAudioMix(
            EHorizonVehicleAudioClass::UtilityVan, true, 70.0f, 0.60f, 1.0f,
            1000.0f, false, false, 9);
    const FHorizonVehicleAudioMix Occluded =
        UHorizonAudioDirectorSubsystem::BuildVehicleAudioMix(
            EHorizonVehicleAudioClass::UtilityVan, true, 70.0f, 0.60f, 1.0f,
            1000.0f, false, true, 9);
    const FHorizonVehicleAudioMix Distant =
        UHorizonAudioDirectorSubsystem::BuildVehicleAudioMix(
            EHorizonVehicleAudioClass::UtilityVan, true, 70.0f, 0.60f, 1.0f,
            30000.0f, false, false, 9);
    const FHorizonVehicleAudioMix Repeat =
        UHorizonAudioDirectorSubsystem::BuildVehicleAudioMix(
            EHorizonVehicleAudioClass::UtilityVan, true, 70.0f, 0.60f, 1.0f,
            1000.0f, false, false, 9);

    TestTrue(TEXT("Cabin filters exterior powertrain detail"),
        Cabin.LowPassCutoffHz < Exterior.LowPassCutoffHz);
    TestTrue(TEXT("Occlusion lowers vehicle cutoff"),
        Occluded.LowPassCutoffHz < Exterior.LowPassCutoffHz);
    TestTrue(TEXT("Distance attenuates vehicle engine"),
        Distant.EngineGain < Exterior.EngineGain);
    TestEqual(TEXT("Seeded vehicle pitch is deterministic"), Repeat.Pitch, Exterior.Pitch);
    TestEqual(TEXT("Seeded vehicle engine gain is deterministic"),
        Repeat.EngineGain, Exterior.EngineGain);
    return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(
    FHorizonRuntimeFootstepCadenceTest,
    "BridgePoint.Horizon.Audio.Footsteps.RuntimeCadence",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FHorizonRuntimeFootstepCadenceTest::RunTest(const FString& Parameters)
{
    float AccumulatedDistanceCm = 0.0f;
    TestEqual(TEXT("Sub-stride travel emits no footstep"),
        UHorizonAudioDirectorSubsystem::ConsumeFootstepDistance(
            70.0f, 160.0f, 2, AccumulatedDistanceCm),
        0);
    TestEqual(TEXT("Sub-stride distance is retained"),
        AccumulatedDistanceCm,
        70.0f);
    TestEqual(TEXT("Crossing one stride emits one footstep"),
        UHorizonAudioDirectorSubsystem::ConsumeFootstepDistance(
            100.0f, 160.0f, 2, AccumulatedDistanceCm),
        1);
    TestEqual(TEXT("Cadence preserves distance remainder"),
        AccumulatedDistanceCm,
        10.0f);

    AccumulatedDistanceCm = 0.0f;
    TestEqual(TEXT("Hitch catch-up is bounded to two footsteps"),
        UHorizonAudioDirectorSubsystem::ConsumeFootstepDistance(
            2000.0f, 160.0f, 2, AccumulatedDistanceCm),
        2);
    TestTrue(TEXT("Hitch catch-up cannot retain a burst backlog"),
        AccumulatedDistanceCm < 160.0f);

    AccumulatedDistanceCm = 20.0f;
    TestEqual(TEXT("Invalid negative travel emits no footstep"),
        UHorizonAudioDirectorSubsystem::ConsumeFootstepDistance(
            -50.0f, 160.0f, 2, AccumulatedDistanceCm),
        0);

    TestEqual(TEXT("Road material resolves to asphalt"),
        UHorizonAudioDirectorSubsystem::ResolveFootstepSurfaceName(
            TEXT("PM_Road_Asphalt")),
        EHorizonFootstepSurface::Asphalt);
    TestEqual(TEXT("Puddle material resolves to shallow water"),
        UHorizonAudioDirectorSubsystem::ResolveFootstepSurfaceName(
            TEXT("Wet_Puddle")),
        EHorizonFootstepSurface::ShallowWater);
    TestEqual(TEXT("Unknown material safely defaults to concrete"),
        UHorizonAudioDirectorSubsystem::ResolveFootstepSurfaceName(
            TEXT("UnknownSurface")),
        EHorizonFootstepSurface::Concrete);

    UHorizonAudioDirectorSubsystem* Audio =
        NewObject<UHorizonAudioDirectorSubsystem>();
    TestNotNull(TEXT("Audio director should construct for footstep events"), Audio);
    if (!Audio)
    {
        return false;
    }

    const FHorizonFootstepEvent First = Audio->EmitFootstep(
        EHorizonFootstepSurface::Metal,
        0.8f,
        false,
        FVector(10.0f, 20.0f, 30.0f),
        12);
    const FHorizonFootstepEvent Repeat = Audio->EmitFootstep(
        EHorizonFootstepSurface::Metal,
        0.8f,
        false,
        FVector(10.0f, 20.0f, 30.0f),
        12);
    TestEqual(TEXT("Seeded runtime footstep pitch is deterministic"),
        Repeat.Mix.Pitch,
        First.Mix.Pitch);
    TestEqual(TEXT("Seeded runtime footstep gain is deterministic"),
        Repeat.Mix.Volume,
        First.Mix.Volume);
    TestTrue(TEXT("Footstep alternates left and right feet"),
        First.bLeftFoot);
    TestTrue(TEXT("Metal runtime step preserves surface identity"),
        First.Mix.LowFrequencyGain > 0.70f);
    return true;
}

#endif
