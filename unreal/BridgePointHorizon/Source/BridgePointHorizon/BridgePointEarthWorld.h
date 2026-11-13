#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "BridgePointEarthWorld.generated.h"

class ACesiumGeoreference;
class ACesium3DTileset;
class UCesiumUrlTemplateRasterOverlay;
class ACesiumSunSky;

UCLASS(BlueprintType)
class BRIDGEPOINTHORIZON_API ABridgePointEarthWorld : public AActor
{
    GENERATED_BODY()

public:
    ABridgePointEarthWorld();
    virtual void BeginPlay() override;
    virtual void Tick(float DeltaSeconds) override;
    virtual void EndPlay(const EEndPlayReason::Type EndPlayReason) override;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="BridgePoint|Earth|Origin")
    double OriginLatitudeDegrees = 41.5623;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="BridgePoint|Earth|Origin")
    double OriginLongitudeDegrees = -72.6506;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="BridgePoint|Earth|Origin")
    double OriginHeightMeters = 0.0;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="BridgePoint|Earth|Atmosphere")
    bool bEnableAstronomicalSunSky = true;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="BridgePoint|Earth|Atmosphere", meta=(ClampMin="0.25", ClampMax="60.0"))
    float SunUpdateIntervalSeconds = 1.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="BridgePoint|Earth|Terrain")
    bool bPreferCesiumWorldTerrain = true;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="BridgePoint|Earth|Buildings")
    bool bEnableCesiumOSMBuildings = true;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="BridgePoint|Earth|Imagery")
    bool bEnableGlobalSatelliteImagery = true;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="BridgePoint|Earth|Imagery", meta=(ClampMin="0", ClampMax="9"))
    int32 MaximumSatelliteImageryLevel = 9;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="BridgePoint|Earth|Streaming", meta=(ClampMin="2.0", ClampMax="64.0"))
    double TerrainMaximumScreenSpaceError = 8.0;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="BridgePoint|Earth|Streaming", meta=(ClampMin="2.0", ClampMax="64.0"))
    double BuildingsMaximumScreenSpaceError = 12.0;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category="BridgePoint|Earth|Runtime")
    TObjectPtr<ACesiumGeoreference> Georeference;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category="BridgePoint|Earth|Runtime")
    TObjectPtr<ACesiumSunSky> SunSky;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category="BridgePoint|Earth|Runtime")
    TObjectPtr<ACesium3DTileset> BaseEllipsoidTileset;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category="BridgePoint|Earth|Runtime")
    TObjectPtr<ACesium3DTileset> WorldTerrainTileset;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category="BridgePoint|Earth|Runtime")
    TObjectPtr<ACesium3DTileset> OSMBuildingsTileset;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category="BridgePoint|Earth|Runtime")
    TObjectPtr<ACesium3DTileset> ActiveSurfaceTileset;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category="BridgePoint|Earth|Runtime")
    TObjectPtr<UCesiumUrlTemplateRasterOverlay> SatelliteImageryOverlay;

    UFUNCTION(BlueprintCallable, Category="BridgePoint|Earth")
    bool InitializeEarth();

    UFUNCTION(BlueprintPure, Category="BridgePoint|Earth")
    FString GetSatelliteImageryAttribution() const
    {
        return SatelliteImageryAttribution;
    }

    UFUNCTION(BlueprintPure, Category="BridgePoint|Earth")
    bool IsUsingIonTerrain() const { return WorldTerrainTileset != nullptr; }

    UFUNCTION(BlueprintPure, Category="BridgePoint|Earth")
    bool IsUsingOSMBuildings() const { return OSMBuildingsTileset != nullptr; }

private:
    UPROPERTY(EditDefaultsOnly, Category="BridgePoint|Earth|Attribution")
    FString SatelliteImageryAttribution =
        TEXT("NASA GIBS / NOAA-20 VIIRS Corrected Reflectance True Color; daily browse imagery, default time.");

    UPROPERTY(EditDefaultsOnly, Category="BridgePoint|Earth|Security")
    FString IonTokenEnvironmentVariable = TEXT("BRIDGEPOINT_CESIUM_ION_TOKEN");

    bool bInitialized = false;
    float SunUpdateAccumulatorSeconds = 0.0f;

    FString ReadIonAccessToken() const;
    bool CreateSunSky();
    void UpdateSunFromSimulationClock();
    bool CreateGeoreference();
    bool CreateBaseEllipsoid();
    bool CreateWorldTerrain(const FString& IonToken);
    bool CreateOSMBuildings(const FString& IonToken);
    bool CreateSatelliteImageryOverlay();
    ACesium3DTileset* SpawnIonTileset(int64 AssetId, const FString& IonToken, double MaximumScreenSpaceError);
};
