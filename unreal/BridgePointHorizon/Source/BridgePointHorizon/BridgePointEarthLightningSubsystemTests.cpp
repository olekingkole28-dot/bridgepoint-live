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

    return true;
}

#endif
