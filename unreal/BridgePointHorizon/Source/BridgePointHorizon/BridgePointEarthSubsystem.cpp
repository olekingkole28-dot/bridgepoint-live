#include "BridgePointEarthSubsystem.h"

#include "Math/UnrealMathUtility.h"

namespace BridgePointEarth
{
    constexpr double Wgs84SemiMajorAxisMeters = 6378137.0;
    constexpr double Wgs84Flattening = 1.0 / 298.257223563;
    constexpr double Wgs84EccentricitySquared =
        Wgs84Flattening * (2.0 - Wgs84Flattening);
    constexpr double EarthMeanRadiusKilometers = 6371.0088;
}

bool FBridgePointEarthGeoCoordinate::IsValid() const
{
    return FMath::IsFinite(LatitudeDegrees) &&
        FMath::IsFinite(LongitudeDegrees) &&
        FMath::IsFinite(EllipsoidHeightMeters) &&
        LatitudeDegrees >= -90.0 &&
        LatitudeDegrees <= 90.0 &&
        LongitudeDegrees >= -180.0 &&
        LongitudeDegrees <= 180.0;
}

double FBridgePointEarthGeoCoordinate::NormalizeLongitude(double Longitude)
{
    if (!FMath::IsFinite(Longitude))
    {
        return 0.0;
    }

    double Wrapped = FMath::Fmod(Longitude + 180.0, 360.0);
    if (Wrapped < 0.0)
    {
        Wrapped += 360.0;
    }
    return Wrapped - 180.0;
}

bool FBridgePointEarthGeoCoordinate::TryToEarthCenteredEarthFixed(
    FVector3d& OutPositionMeters) const
{
    if (!IsValid())
    {
        OutPositionMeters = FVector3d::ZeroVector;
        return false;
    }

    const double LatitudeRadians = FMath::DegreesToRadians(LatitudeDegrees);
    const double LongitudeRadians = FMath::DegreesToRadians(LongitudeDegrees);
    const double SinLatitude = FMath::Sin(LatitudeRadians);
    const double CosLatitude = FMath::Cos(LatitudeRadians);
    const double PrimeVerticalRadius =
        BridgePointEarth::Wgs84SemiMajorAxisMeters /
        FMath::Sqrt(1.0 -
            BridgePointEarth::Wgs84EccentricitySquared *
            SinLatitude * SinLatitude);

    const double Height = EllipsoidHeightMeters;
    OutPositionMeters.X =
        (PrimeVerticalRadius + Height) * CosLatitude * FMath::Cos(LongitudeRadians);
    OutPositionMeters.Y =
        (PrimeVerticalRadius + Height) * CosLatitude * FMath::Sin(LongitudeRadians);
    OutPositionMeters.Z =
        (PrimeVerticalRadius *
            (1.0 - BridgePointEarth::Wgs84EccentricitySquared) + Height) *
        SinLatitude;

    return true;
}

void UBridgePointEarthSubsystem::Initialize(FSubsystemCollectionBase& Collection)
{
    Super::Initialize(Collection);
    SimulationClockUtc = FDateTime::UtcNow();
    SimulationTimeScale = 1.0;
    bSimulationPaused = false;

    SimulationTickerHandle = FTSTicker::GetCoreTicker().AddTicker(
        FTickerDelegate::CreateUObject(
            this,
            &UBridgePointEarthSubsystem::TickSimulationClock));
}

void UBridgePointEarthSubsystem::Deinitialize()
{
    if (SimulationTickerHandle.IsValid())
    {
        FTSTicker::GetCoreTicker().RemoveTicker(SimulationTickerHandle);
        SimulationTickerHandle.Reset();
    }

    EnvironmentSamples.Reset();
    Super::Deinitialize();
}

void UBridgePointEarthSubsystem::SetSimulationClockUtc(FDateTime NewSimulationTimeUtc)
{
    SimulationClockUtc = NewSimulationTimeUtc;
}

void UBridgePointEarthSubsystem::SetSimulationTimeScale(double NewTimeScale)
{
    if (!FMath::IsFinite(NewTimeScale))
    {
        return;
    }

    SimulationTimeScale = FMath::Clamp(NewTimeScale, -86400.0, 86400.0);
}

void UBridgePointEarthSubsystem::SetSimulationPaused(bool bNewPaused)
{
    bSimulationPaused = bNewPaused;
}

bool UBridgePointEarthSubsystem::TickSimulationClock(float DeltaSeconds)
{
    if (!bSimulationPaused &&
        FMath::IsFinite(DeltaSeconds) &&
        DeltaSeconds > 0.0f &&
        !FMath::IsNearlyZero(SimulationTimeScale))
    {
        const double AdvanceSeconds =
            static_cast<double>(DeltaSeconds) * SimulationTimeScale;
        SimulationClockUtc += FTimespan::FromSeconds(AdvanceSeconds);
    }

    return true;
}

bool UBridgePointEarthSubsystem::IsEnvironmentSampleStructurallyValid(
    const FBridgePointEarthEnvironmentSample& Sample)
{
    const FBridgePointEarthProvenance& Source = Sample.Provenance;

    if (!Sample.Location.IsValid() ||
        Source.SourceId.TrimStartAndEnd().IsEmpty() ||
        Source.SourceName.TrimStartAndEnd().IsEmpty() ||
        Source.LicenseId.TrimStartAndEnd().IsEmpty() ||
        Source.Attribution.TrimStartAndEnd().IsEmpty() ||
        Source.RetrievedAtUtc.GetTicks() <= 0 ||
        Source.ValidFromUtc.GetTicks() <= 0 ||
        Source.ValidUntilUtc < Source.ValidFromUtc ||
        !FMath::IsFinite(Sample.Confidence) ||
        Sample.Confidence < 0.0f ||
        Sample.Confidence > 1.0f)
    {
        return false;
    }

    if (Sample.bHasTemperature &&
        (!FMath::IsFinite(Sample.AirTemperatureC) ||
            Sample.AirTemperatureC < -120.0f ||
            Sample.AirTemperatureC > 80.0f))
    {
        return false;
    }

    if (Sample.bHasWind &&
        (!FMath::IsFinite(Sample.WindSpeedMetersPerSecond) ||
            !FMath::IsFinite(Sample.WindDirectionDegrees) ||
            Sample.WindSpeedMetersPerSecond < 0.0f ||
            Sample.WindSpeedMetersPerSecond > 250.0f ||
            Sample.WindDirectionDegrees < 0.0f ||
            Sample.WindDirectionDegrees > 360.0f))
    {
        return false;
    }

    if (Sample.bHasPrecipitation &&
        (!FMath::IsFinite(Sample.PrecipitationMillimetersPerHour) ||
            Sample.PrecipitationMillimetersPerHour < 0.0f ||
            Sample.PrecipitationMillimetersPerHour > 2000.0f))
    {
        return false;
    }

    if (Sample.bHasRelativeHumidity &&
        (!FMath::IsFinite(Sample.RelativeHumidityPercent) ||
            Sample.RelativeHumidityPercent < 0.0f ||
            Sample.RelativeHumidityPercent > 100.0f))
    {
        return false;
    }

    return true;
}

bool UBridgePointEarthSubsystem::AddEnvironmentSample(
    const FBridgePointEarthEnvironmentSample& Sample)
{
    if (!IsEnvironmentSampleStructurallyValid(Sample))
    {
        return false;
    }

    EnvironmentSamples.RemoveAll(
        [&Sample](const FBridgePointEarthEnvironmentSample& Existing)
        {
            return Existing.Provenance.SourceId == Sample.Provenance.SourceId &&
                Existing.Provenance.ValidFromUtc == Sample.Provenance.ValidFromUtc &&
                FMath::Abs(Existing.Location.LatitudeDegrees -
                    Sample.Location.LatitudeDegrees) < 0.000001 &&
                FMath::Abs(FBridgePointEarthGeoCoordinate::NormalizeLongitude(
                    Existing.Location.LongitudeDegrees -
                    Sample.Location.LongitudeDegrees)) < 0.000001;
        });

    if (EnvironmentSamples.Num() >= MaximumEnvironmentSamples)
    {
        int32 OldestIndex = 0;
        for (int32 Index = 1; Index < EnvironmentSamples.Num(); ++Index)
        {
            if (EnvironmentSamples[Index].Provenance.RetrievedAtUtc <
                EnvironmentSamples[OldestIndex].Provenance.RetrievedAtUtc)
            {
                OldestIndex = Index;
            }
        }
        EnvironmentSamples.RemoveAt(OldestIndex);
    }

    EnvironmentSamples.Add(Sample);
    return true;
}

double UBridgePointEarthSubsystem::GreatCircleDistanceKilometers(
    double LatitudeA,
    double LongitudeA,
    double LatitudeB,
    double LongitudeB)
{
    const double LatA = FMath::DegreesToRadians(LatitudeA);
    const double LatB = FMath::DegreesToRadians(LatitudeB);
    const double DeltaLat = LatB - LatA;
    const double DeltaLon = FMath::DegreesToRadians(
        FBridgePointEarthGeoCoordinate::NormalizeLongitude(LongitudeB - LongitudeA));

    const double SinHalfLat = FMath::Sin(DeltaLat * 0.5);
    const double SinHalfLon = FMath::Sin(DeltaLon * 0.5);
    const double A = SinHalfLat * SinHalfLat +
        FMath::Cos(LatA) * FMath::Cos(LatB) *
        SinHalfLon * SinHalfLon;
    const double ClampedA = FMath::Clamp(A, 0.0, 1.0);
    const double CentralAngle = 2.0 * FMath::Atan2(
        FMath::Sqrt(ClampedA),
        FMath::Sqrt(1.0 - ClampedA));

    return BridgePointEarth::EarthMeanRadiusKilometers * CentralAngle;
}

bool UBridgePointEarthSubsystem::FindEnvironmentAtLocation(
    double LatitudeDegrees,
    double LongitudeDegrees,
    double MaximumDistanceKilometers,
    bool bIncludeForecastAndModelled,
    bool bIncludeSimulated,
    FBridgePointEarthEnvironmentSample& OutSample) const
{
    OutSample = FBridgePointEarthEnvironmentSample();

    FBridgePointEarthGeoCoordinate Query;
    Query.LatitudeDegrees = LatitudeDegrees;
    Query.LongitudeDegrees = LongitudeDegrees;

    if (!Query.IsValid() ||
        !FMath::IsFinite(MaximumDistanceKilometers) ||
        MaximumDistanceKilometers < 0.0)
    {
        return false;
    }

    const FBridgePointEarthEnvironmentSample* BestSample = nullptr;
    double BestScore = TNumericLimits<double>::Max();

    for (const FBridgePointEarthEnvironmentSample& Candidate : EnvironmentSamples)
    {
        if (SimulationClockUtc < Candidate.Provenance.ValidFromUtc ||
            SimulationClockUtc > Candidate.Provenance.ValidUntilUtc)
        {
            continue;
        }

        if ((Candidate.EvidenceKind == EBridgePointEarthEvidenceKind::Forecast ||
             Candidate.EvidenceKind == EBridgePointEarthEvidenceKind::Modelled) &&
            !bIncludeForecastAndModelled)
        {
            continue;
        }

        if (Candidate.EvidenceKind == EBridgePointEarthEvidenceKind::Simulated &&
            !bIncludeSimulated)
        {
            continue;
        }

        const double DistanceKm = GreatCircleDistanceKilometers(
            LatitudeDegrees,
            LongitudeDegrees,
            Candidate.Location.LatitudeDegrees,
            Candidate.Location.LongitudeDegrees);

        if (DistanceKm > MaximumDistanceKilometers)
        {
            continue;
        }

        double EvidencePenalty = 0.0;
        switch (Candidate.EvidenceKind)
        {
            case EBridgePointEarthEvidenceKind::Observed: EvidencePenalty = 0.0; break;
            case EBridgePointEarthEvidenceKind::Modelled: EvidencePenalty = 0.05; break;
            case EBridgePointEarthEvidenceKind::Forecast: EvidencePenalty = 0.10; break;
            case EBridgePointEarthEvidenceKind::Simulated: EvidencePenalty = 0.15; break;
            default: EvidencePenalty = 1.0; break;
        }

        const double Score = DistanceKm + EvidencePenalty;
        if (Score < BestScore)
        {
            BestScore = Score;
            BestSample = &Candidate;
        }
    }

    if (!BestSample)
    {
        return false;
    }

    OutSample = *BestSample;
    return true;
}

void UBridgePointEarthSubsystem::ClearEnvironmentSamples()
{
    EnvironmentSamples.Reset();
}

EBridgePointEarthDetailTier UBridgePointEarthSubsystem::ResolveDetailTier(
    double CameraAltitudeMeters)
{
    if (!FMath::IsFinite(CameraAltitudeMeters) || CameraAltitudeMeters < 0.0)
    {
        return EBridgePointEarthDetailTier::Planetary;
    }
    if (CameraAltitudeMeters >= 250000.0)
    {
        return EBridgePointEarthDetailTier::Planetary;
    }
    if (CameraAltitudeMeters >= 25000.0)
    {
        return EBridgePointEarthDetailTier::Regional;
    }
    if (CameraAltitudeMeters >= 750.0)
    {
        return EBridgePointEarthDetailTier::Local;
    }
    return EBridgePointEarthDetailTier::Street;
}

FBridgePointEarthRenderBudget UBridgePointEarthSubsystem::ResolveRenderBudget(
    double CameraAltitudeMeters,
    float PerformanceScale)
{
    FBridgePointEarthRenderBudget Budget;
    Budget.Tier = ResolveDetailTier(CameraAltitudeMeters);

    const float Scale = FMath::Clamp(
        FMath::IsFinite(PerformanceScale) ? PerformanceScale : 1.0f,
        0.1f,
        1.5f);

    switch (Budget.Tier)
    {
        case EBridgePointEarthDetailTier::Planetary:
            Budget.CloudFieldCells = 192;
            break;
        case EBridgePointEarthDetailTier::Regional:
            Budget.CloudFieldCells = 512;
            Budget.RainParticles = 4000;
            Budget.SnowParticles = 2000;
            Budget.SmokeParticles = 1200;
            Budget.InteractiveWaterCells = 16;
            Budget.WindResponsiveFoliageInstances = 250;
            break;
        case EBridgePointEarthDetailTier::Local:
            Budget.CloudFieldCells = 256;
            Budget.RainParticles = 9000;
            Budget.SnowParticles = 6000;
            Budget.SmokeParticles = 2400;
            Budget.InteractiveWaterCells = 48;
            Budget.WindResponsiveFoliageInstances = 1200;
            Budget.bEnableNearSurfaceInteractions = true;
            break;
        case EBridgePointEarthDetailTier::Street:
            Budget.CloudFieldCells = 128;
            Budget.RainParticles = 18000;
            Budget.SnowParticles = 14000;
            Budget.SmokeParticles = 6000;
            Budget.InteractiveWaterCells = 128;
            Budget.WindResponsiveFoliageInstances = 3000;
            Budget.bEnableNearSurfaceInteractions = true;
            break;
        default:
            break;
    }

    Budget.CloudFieldCells = FMath::RoundToInt(Budget.CloudFieldCells * Scale);
    Budget.RainParticles = FMath::RoundToInt(Budget.RainParticles * Scale);
    Budget.SnowParticles = FMath::RoundToInt(Budget.SnowParticles * Scale);
    Budget.SmokeParticles = FMath::RoundToInt(Budget.SmokeParticles * Scale);
    Budget.InteractiveWaterCells = FMath::RoundToInt(Budget.InteractiveWaterCells * Scale);
    Budget.WindResponsiveFoliageInstances =
        FMath::RoundToInt(Budget.WindResponsiveFoliageInstances * Scale);

    return Budget;
}
