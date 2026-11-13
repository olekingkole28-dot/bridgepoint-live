#pragma once

#include "CoreMinimal.h"
#include "BridgePointEarthTypes.generated.h"

UENUM(BlueprintType)
enum class EBridgePointEarthEvidenceKind : uint8
{
    Observed UMETA(DisplayName="Observed"),
    Forecast UMETA(DisplayName="Forecast"),
    Modelled UMETA(DisplayName="Modelled"),
    Simulated UMETA(DisplayName="Simulated")
};

UENUM(BlueprintType)
enum class EBridgePointEarthDetailTier : uint8
{
    Planetary UMETA(DisplayName="Planetary"),
    Regional UMETA(DisplayName="Regional"),
    Local UMETA(DisplayName="Local"),
    Street UMETA(DisplayName="Street")
};

USTRUCT(BlueprintType)
struct BRIDGEPOINTHORIZON_API FBridgePointEarthGeoCoordinate
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="BridgePoint|Earth")
    double LatitudeDegrees = 0.0;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="BridgePoint|Earth")
    double LongitudeDegrees = 0.0;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="BridgePoint|Earth")
    double EllipsoidHeightMeters = 0.0;

    bool IsValid() const;
    static double NormalizeLongitude(double LongitudeDegrees);
    bool TryToEarthCenteredEarthFixed(FVector3d& OutPositionMeters) const;
};

USTRUCT(BlueprintType)
struct BRIDGEPOINTHORIZON_API FBridgePointEarthProvenance
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="BridgePoint|Earth|Provenance")
    FString SourceId;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="BridgePoint|Earth|Provenance")
    FString SourceName;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="BridgePoint|Earth|Provenance")
    FString SourceVersion;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="BridgePoint|Earth|Provenance")
    FString LicenseId;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="BridgePoint|Earth|Provenance")
    FString Attribution;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="BridgePoint|Earth|Provenance")
    FDateTime RetrievedAtUtc;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="BridgePoint|Earth|Provenance")
    FDateTime ValidFromUtc;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="BridgePoint|Earth|Provenance")
    FDateTime ValidUntilUtc;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="BridgePoint|Earth|Provenance")
    bool bCommerciallyCleared = false;
};

USTRUCT(BlueprintType)
struct BRIDGEPOINTHORIZON_API FBridgePointEarthEnvironmentSample
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="BridgePoint|Earth|Environment")
    FBridgePointEarthGeoCoordinate Location;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="BridgePoint|Earth|Environment")
    FBridgePointEarthProvenance Provenance;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="BridgePoint|Earth|Environment")
    EBridgePointEarthEvidenceKind EvidenceKind = EBridgePointEarthEvidenceKind::Observed;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="BridgePoint|Earth|Environment")
    float Confidence = 1.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="BridgePoint|Earth|Environment")
    bool bHasTemperature = false;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="BridgePoint|Earth|Environment", meta=(EditCondition="bHasTemperature"))
    float AirTemperatureC = 0.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="BridgePoint|Earth|Environment")
    bool bHasWind = false;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="BridgePoint|Earth|Environment", meta=(EditCondition="bHasWind"))
    float WindSpeedMetersPerSecond = 0.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="BridgePoint|Earth|Environment", meta=(EditCondition="bHasWind", ClampMin="0", ClampMax="360"))
    float WindDirectionDegrees = 0.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="BridgePoint|Earth|Environment")
    bool bHasPrecipitation = false;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="BridgePoint|Earth|Environment", meta=(EditCondition="bHasPrecipitation", ClampMin="0"))
    float PrecipitationMillimetersPerHour = 0.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="BridgePoint|Earth|Environment")
    bool bHasRelativeHumidity = false;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="BridgePoint|Earth|Environment", meta=(EditCondition="bHasRelativeHumidity", ClampMin="0", ClampMax="100"))
    float RelativeHumidityPercent = 0.0f;
};

USTRUCT(BlueprintType)
struct BRIDGEPOINTHORIZON_API FBridgePointEarthRenderBudget
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadOnly, Category="BridgePoint|Earth|Rendering")
    EBridgePointEarthDetailTier Tier = EBridgePointEarthDetailTier::Planetary;

    UPROPERTY(BlueprintReadOnly, Category="BridgePoint|Earth|Rendering")
    int32 CloudFieldCells = 0;

    UPROPERTY(BlueprintReadOnly, Category="BridgePoint|Earth|Rendering")
    int32 RainParticles = 0;

    UPROPERTY(BlueprintReadOnly, Category="BridgePoint|Earth|Rendering")
    int32 SnowParticles = 0;

    UPROPERTY(BlueprintReadOnly, Category="BridgePoint|Earth|Rendering")
    int32 SmokeParticles = 0;

    UPROPERTY(BlueprintReadOnly, Category="BridgePoint|Earth|Rendering")
    int32 InteractiveWaterCells = 0;

    UPROPERTY(BlueprintReadOnly, Category="BridgePoint|Earth|Rendering")
    int32 WindResponsiveFoliageInstances = 0;

    UPROPERTY(BlueprintReadOnly, Category="BridgePoint|Earth|Rendering")
    bool bEnableNearSurfaceInteractions = false;
};
