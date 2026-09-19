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

#endif
