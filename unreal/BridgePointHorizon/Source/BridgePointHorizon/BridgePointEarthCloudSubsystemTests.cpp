#if WITH_DEV_AUTOMATION_TESTS

#include "BridgePointEarthCloudSubsystem.h"
#include "Misc/AutomationTest.h"

IMPLEMENT_SIMPLE_AUTOMATION_TEST(
    FBridgePointEarthCloudFrameSequenceTest,
    "BridgePoint.Earth.Clouds.FrameSequence",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FBridgePointEarthCloudFrameSequenceTest::RunTest(const FString& Parameters)
{
    UBridgePointEarthCloudSubsystem* CloudSubsystem =
        NewObject<UBridgePointEarthCloudSubsystem>();
    TestNotNull(TEXT("Cloud subsystem fixture exists"), CloudSubsystem);
    if (!CloudSubsystem)
    {
        return false;
    }

    FBridgePointEarthCloudSource First;
    First.Satellite = TEXT("GOES19");
    First.ObservedAtUtc = FDateTime(2026, 11, 13, 4, 0, 0);
    First.PointCount = 100;

    FBridgePointEarthCloudSource Second = First;
    Second.ObservedAtUtc = FDateTime(2026, 11, 13, 4, 10, 0);
    Second.PointCount = 120;

    FBridgePointEarthCloudSource West = First;
    West.Satellite = TEXT("GOES18");
    West.ObservedAtUtc = FDateTime(2026, 11, 13, 4, 5, 0);
    West.PointCount = 50;

    CloudSubsystem->CloudSources.Add(First);
    CloudSubsystem->CloudSources.Add(West);
    CloudSubsystem->CloudSources.Add(Second);

    int32 Earlier = INDEX_NONE;
    int32 Later = INDEX_NONE;
    float Blend = 0.0f;

    TestTrue(TEXT("GOES-East selects bracketing observed frames"),
        CloudSubsystem->ResolveCloudFramePair(
            TEXT("GOES19"),
            FDateTime(2026, 11, 13, 4, 5, 0),
            Earlier,
            Later,
            Blend));
    TestEqual(TEXT("Earlier GOES-East frame index"), Earlier, 0);
    TestEqual(TEXT("Later GOES-East frame index"), Later, 2);
    TestTrue(TEXT("Five-minute point selects halfway blend"),
        FMath::Abs(Blend - 0.5f) < 0.001f);

    TestTrue(TEXT("Latest GOES-East frame is held briefly after observation"),
        CloudSubsystem->ResolveCloudFramePair(
            TEXT("GOES19"),
            FDateTime(2026, 11, 13, 4, 20, 0),
            Earlier,
            Later,
            Blend));
    TestEqual(TEXT("Latest frame hold uses the same source"), Earlier, Later);
    TestEqual(TEXT("Latest frame hold has zero blend"), Blend, 0.0f);

    TestFalse(TEXT("Historical time before the first observed frame fails closed"),
        CloudSubsystem->ResolveCloudFramePair(
            TEXT("GOES19"),
            FDateTime(2026, 11, 13, 3, 0, 0),
            Earlier,
            Later,
            Blend));

    TestFalse(TEXT("Unknown satellite does not borrow another satellite's frame"),
        CloudSubsystem->ResolveCloudFramePair(
            TEXT("HIMAWARI9"),
            FDateTime(2026, 11, 13, 4, 5, 0),
            Earlier,
            Later,
            Blend));
    return true;
}

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
    TestEqual(TEXT("Cloud top remains separate from the WGS84 ellipsoid-height coordinate"),
        Point.Location.EllipsoidHeightMeters, 0.0);
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
