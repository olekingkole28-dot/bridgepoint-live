#if WITH_DEV_AUTOMATION_TESTS

#include "BridgePointEarthCloudSubsystem.h"
#include "Misc/AutomationTest.h"

IMPLEMENT_SIMPLE_AUTOMATION_TEST(
    FBridgePointEarthCloudSourceSchemaTest,
    "BridgePoint.Earth.Clouds.SourceSchema",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FBridgePointEarthCloudSourceSchemaTest::RunTest(const FString& Parameters)
{
    FBridgePointEarthCloudPoint Point;
    Point.Location.LatitudeDegrees = 40.7;
    Point.Location.LongitudeDegrees = -74.0;
    Point.Location.EllipsoidHeightMeters = 9500.0;
    Point.CloudTopHeightMeters = 9500.0f;
    Point.MaskClass = 3;
    Point.Probability = 0.95f;
    Point.OpacityHint = 0.90f;
    Point.SourceIndex = 0;

    TestTrue(TEXT("GOES cloud sample has a valid geographic coordinate"),
        Point.Location.IsValid());
    TestTrue(TEXT("Cloud top is within atmospheric height bounds"),
        Point.CloudTopHeightMeters >= 0.0f && Point.CloudTopHeightMeters <= 25000.0f);
    TestTrue(TEXT("Cloud mask class uses the NOAA four-level code domain"),
        Point.MaskClass >= 1 && Point.MaskClass <= 3);
    TestTrue(TEXT("Cloud probability remains normalized"),
        Point.Probability >= 0.0f && Point.Probability <= 1.0f);
    TestTrue(TEXT("Cloud opacity hint remains normalized"),
        Point.OpacityHint >= 0.0f && Point.OpacityHint <= 1.0f);
    return true;
}

#endif
