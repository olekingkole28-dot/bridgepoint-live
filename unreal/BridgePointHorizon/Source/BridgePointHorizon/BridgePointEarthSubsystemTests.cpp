#if WITH_DEV_AUTOMATION_TESTS

#include "BridgePointEarthSubsystem.h"
#include "Misc/AutomationTest.h"

IMPLEMENT_SIMPLE_AUTOMATION_TEST(
    FBridgePointEarthWgs84Test,
    "BridgePoint.Earth.Geodesy.WGS84",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FBridgePointEarthWgs84Test::RunTest(const FString& Parameters)
{
    FBridgePointEarthGeoCoordinate Coordinate;
    FVector3d Ecef = FVector3d::ZeroVector;

    Coordinate.LatitudeDegrees = 0.0;
    Coordinate.LongitudeDegrees = 0.0;
    Coordinate.EllipsoidHeightMeters = 0.0;
    TestTrue(TEXT("Equator/origin converts to ECEF"), Coordinate.TryToEarthCenteredEarthFixed(Ecef));
    TestTrue(TEXT("WGS84 semi-major axis is preserved"),
        FMath::Abs(Ecef.X - 6378137.0) < 0.01);
    TestTrue(TEXT("Prime-meridian Y is zero"), FMath::Abs(Ecef.Y) < 0.001);
    TestTrue(TEXT("Equator Z is zero"), FMath::Abs(Ecef.Z) < 0.001);

    Coordinate.LatitudeDegrees = 90.0;
    Coordinate.LongitudeDegrees = 0.0;
    TestTrue(TEXT("North pole converts to ECEF"), Coordinate.TryToEarthCenteredEarthFixed(Ecef));
    TestTrue(TEXT("WGS84 polar radius is preserved"),
        FMath::Abs(Ecef.Z - 6356752.314245) < 0.02);

    Coordinate.LatitudeDegrees = 91.0;
    TestFalse(TEXT("Latitude beyond the pole is rejected"),
        Coordinate.TryToEarthCenteredEarthFixed(Ecef));

    TestTrue(TEXT("Longitude wraps across the antimeridian"),
        FMath::Abs(FBridgePointEarthGeoCoordinate::NormalizeLongitude(181.0) + 179.0) < 0.000001);
    return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(
    FBridgePointEarthDetailTierTest,
    "BridgePoint.Earth.Rendering.DistanceTiers",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FBridgePointEarthDetailTierTest::RunTest(const FString& Parameters)
{
    TestTrue(TEXT("Orbit uses planetary tier"),
        UBridgePointEarthSubsystem::ResolveDetailTier(500000.0) ==
            EBridgePointEarthDetailTier::Planetary);
    TestTrue(TEXT("Country view uses regional tier"),
        UBridgePointEarthSubsystem::ResolveDetailTier(100000.0) ==
            EBridgePointEarthDetailTier::Regional);
    TestTrue(TEXT("City view uses local tier"),
        UBridgePointEarthSubsystem::ResolveDetailTier(5000.0) ==
            EBridgePointEarthDetailTier::Local);
    TestTrue(TEXT("Street view uses street tier"),
        UBridgePointEarthSubsystem::ResolveDetailTier(60.0) ==
            EBridgePointEarthDetailTier::Street);

    const FBridgePointEarthRenderBudget OrbitBudget =
        UBridgePointEarthSubsystem::ResolveRenderBudget(500000.0);
    const FBridgePointEarthRenderBudget StreetBudget =
        UBridgePointEarthSubsystem::ResolveRenderBudget(60.0);

    TestEqual(TEXT("Planet view has no local rain allocation"), OrbitBudget.RainParticles, 0);
    TestTrue(TEXT("Street view enables near-surface interactions"),
        StreetBudget.bEnableNearSurfaceInteractions);
    TestTrue(TEXT("Street view has a larger local effects budget"),
        StreetBudget.RainParticles > OrbitBudget.RainParticles);

    const FBridgePointEarthRenderBudget ScaledBudget =
        UBridgePointEarthSubsystem::ResolveRenderBudget(60.0, 0.5f);
    TestTrue(TEXT("Performance scale reduces the particle budget"),
        ScaledBudget.RainParticles < StreetBudget.RainParticles);
    return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(
    FBridgePointEarthEvidenceValidationTest,
    "BridgePoint.Earth.Provenance.Validation",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FBridgePointEarthEvidenceValidationTest::RunTest(const FString& Parameters)
{
    FBridgePointEarthEnvironmentSample Sample;
    Sample.Location.LatitudeDegrees = 40.7128;
    Sample.Location.LongitudeDegrees = -74.0060;
    Sample.Provenance.SourceId = TEXT("earth-qa-fixture");
    Sample.Provenance.SourceName = TEXT("BridgePoint QA fixture");
    Sample.Provenance.SourceVersion = TEXT("fixture-v1");
    Sample.Provenance.LicenseId = TEXT("CC0-1.0");
    Sample.Provenance.Attribution = TEXT("Synthetic QA fixture; not a real observation.");
    Sample.Provenance.RetrievedAtUtc = FDateTime(2026, 11, 12, 12, 0, 0);
    Sample.Provenance.ValidFromUtc = FDateTime(2026, 11, 12, 11, 0, 0);
    Sample.Provenance.ValidUntilUtc = FDateTime(2026, 11, 12, 13, 0, 0);
    Sample.EvidenceKind = EBridgePointEarthEvidenceKind::Simulated;
    Sample.Confidence = 0.75f;
    Sample.bHasWind = true;
    Sample.WindSpeedMetersPerSecond = 12.0f;
    Sample.WindDirectionDegrees = 270.0f;

    TestTrue(TEXT("Valid fixture is structurally accepted"),
        UBridgePointEarthSubsystem::IsEnvironmentSampleStructurallyValid(Sample));

    FBridgePointEarthEnvironmentSample MissingLicense = Sample;
    MissingLicense.Provenance.LicenseId.Reset();
    TestFalse(TEXT("Missing license cannot pass provenance validation"),
        UBridgePointEarthSubsystem::IsEnvironmentSampleStructurallyValid(MissingLicense));

    FBridgePointEarthEnvironmentSample InvalidWind = Sample;
    InvalidWind.WindSpeedMetersPerSecond = -1.0f;
    TestFalse(TEXT("Negative wind speed is rejected"),
        UBridgePointEarthSubsystem::IsEnvironmentSampleStructurallyValid(InvalidWind));

    FBridgePointEarthEnvironmentSample InvalidConfidence = Sample;
    InvalidConfidence.Confidence = 1.5f;
    TestFalse(TEXT("Confidence outside zero-to-one is rejected"),
        UBridgePointEarthSubsystem::IsEnvironmentSampleStructurallyValid(InvalidConfidence));

    FBridgePointEarthEnvironmentSample InvalidTime = Sample;
    InvalidTime.Provenance.ValidUntilUtc =
        InvalidTime.Provenance.ValidFromUtc - FTimespan::FromSeconds(1);
    TestFalse(TEXT("Inverted evidence validity window is rejected"),
        UBridgePointEarthSubsystem::IsEnvironmentSampleStructurallyValid(InvalidTime));
    return true;
}

#endif // WITH_DEV_AUTOMATION_TESTS
