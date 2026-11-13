#if WITH_DEV_AUTOMATION_TESTS

#include "BridgePointEarthLightningSubsystem.h"
#include "Misc/AutomationTest.h"

IMPLEMENT_SIMPLE_AUTOMATION_TEST(
    FBridgePointEarthLightningQualityTest,
    "BridgePoint.Earth.Lightning.QualityAndGeometry",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FBridgePointEarthLightningQualityTest::RunTest(const FString& Parameters)
{
    FBridgePointEarthLightningFlash Flash;
    Flash.FlashId = 17;
    Flash.Centroid.LatitudeDegrees = 40.7;
    Flash.Centroid.LongitudeDegrees = -74.0;
    Flash.Centroid.EllipsoidHeightMeters = 0.0;
    Flash.FirstEventUtc = FDateTime(2026, 11, 13, 4, 30, 0);
    Flash.LastEventUtc = FDateTime(2026, 11, 13, 4, 30, 0) + FTimespan::FromMilliseconds(300);
    Flash.RadiantEnergyJoules = 3.2;
    Flash.FootprintAreaSquareMeters = 180000.0;
    Flash.QualityFlag = 0;
    Flash.Satellite = TEXT("GOES19");
    Flash.DetectionKind = TEXT("GLM_optical_flash");

    TestTrue(TEXT("Quality-valid flash centroid passes source validation"),
        UBridgePointEarthLightningSubsystem::IsFlashStructurallyValid(Flash));

    FBridgePointEarthLightningFlash BadQuality = Flash;
    BadQuality.QualityFlag = 1;
    TestFalse(TEXT("Degraded GLM quality flag is rejected"),
        UBridgePointEarthLightningSubsystem::IsFlashStructurallyValid(BadQuality));

    FBridgePointEarthLightningFlash InvalidTime = Flash;
    InvalidTime.LastEventUtc = InvalidTime.FirstEventUtc - FTimespan::FromSeconds(1);
    TestFalse(TEXT("Negative flash duration is rejected"),
        UBridgePointEarthLightningSubsystem::IsFlashStructurallyValid(InvalidTime));

    FBridgePointEarthLightningFlash InvalidEnergy = Flash;
    InvalidEnergy.RadiantEnergyJoules = -1.0;
    TestFalse(TEXT("Negative optical energy is rejected"),
        UBridgePointEarthLightningSubsystem::IsFlashStructurallyValid(InvalidEnergy));

    FBridgePointEarthLightningFlash BadCoordinate = Flash;
    BadCoordinate.Centroid.LatitudeDegrees = 95.0;
    TestFalse(TEXT("Out-of-range flash centroid is rejected"),
        UBridgePointEarthLightningSubsystem::IsFlashStructurallyValid(BadCoordinate));


    FBridgePointEarthLightningSource Source;
    const FDateTime NowUtc(2026, 11, 13, 4, 40, 0);
    Source.GeneratedAtUtc = NowUtc;
    Source.LatestEventUtc = NowUtc - FTimespan::FromSeconds(240);
    TestFalse(TEXT("Newly generated manifest cannot make four-minute-old flashes fresh"),
        UBridgePointEarthLightningSubsystem::IsSourceFreshAt(Source, NowUtc, 120));

    Source.LatestEventUtc = NowUtc - FTimespan::FromSeconds(30);
    TestTrue(TEXT("Recent actual GLM event remains fresh"),
        UBridgePointEarthLightningSubsystem::IsSourceFreshAt(Source, NowUtc, 120));

    Source.LatestEventUtc = NowUtc + FTimespan::FromSeconds(1);
    TestFalse(TEXT("Future-dated GLM event fails closed"),
        UBridgePointEarthLightningSubsystem::IsSourceFreshAt(Source, NowUtc, 120));

    Source.LatestEventUtc = NowUtc - FTimespan::FromSeconds(10);
    TestFalse(TEXT("Invalid negative freshness window fails closed"),
        UBridgePointEarthLightningSubsystem::IsSourceFreshAt(Source, NowUtc, -1));

    return true;
}

#endif
