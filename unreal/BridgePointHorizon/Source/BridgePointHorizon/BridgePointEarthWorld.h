#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "BridgePointEarthWorld.generated.h"

class ACesiumGeoreference;
class ACesium3DTileset;
class UCesiumUrlTemplateRasterOverlay;

/**
 * Runtime owner for the shared Cesium Earth globe.
 *
 * The initial imagery is NASA/NOAA daily VIIRS true-color browse imagery.
 * This is a planetary basemap only; it is not building photogrammetry and is
 * deliberately not presented as street-level imagery.
 */
UCLASS(BlueprintType)
class BRIDGEPOINTHORIZON_API ABridgePointEarthWorld : public AActor
{
    GENERATED_BODY()

public:
    ABridgePointEarthWorld();

    virtual void BeginPlay() override;
    virtual void EndPlay(const EEndPlayReason::Type EndPlayReason) override;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="BridgePoint|Earth|Origin")
    double OriginLatitudeDegrees = 41.5623;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="BridgePoint|Earth|Origin")
    double OriginLongitudeDegrees = -72.6506;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="BridgePoint|Earth|Origin")
    double OriginHeightMeters = 0.0;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="BridgePoint|Earth|Imagery")
    bool bEnableGlobalSatelliteImagery = true;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="BridgePoint|Earth|Imagery")
    int32 MaximumSatelliteImageryLevel = 9;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category="BridgePoint|Earth|Runtime")
    TObjectPtr<ACesiumGeoreference> Georeference;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category="BridgePoint|Earth|Runtime")
    TObjectPtr<ACesium3DTileset> BaseEllipsoidTileset;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category="BridgePoint|Earth|Runtime")
    TObjectPtr<UCesiumUrlTemplateRasterOverlay> SatelliteImageryOverlay;

    UFUNCTION(BlueprintCallable, Category="BridgePoint|Earth")
    bool InitializeEarth();

    UFUNCTION(BlueprintPure, Category="BridgePoint|Earth")
    FString GetSatelliteImageryAttribution() const
    {
        return SatelliteImageryAttribution;
    }

private:
    UPROPERTY(EditDefaultsOnly, Category="BridgePoint|Earth|Attribution")
    FString SatelliteImageryAttribution =
        TEXT("NASA GIBS / NOAA-20 VIIRS Corrected Reflectance True Color; daily browse imagery, default time.");

    bool bInitialized = false;

    bool CreateGeoreference();
    bool CreateBaseEllipsoid();
    bool CreateSatelliteImageryOverlay();
};
