#pragma once

#include "CoreMinimal.h"
#include "Subsystems/WorldSubsystem.h"
#include "BridgePointEarthTypes.h"
#include "BridgePointEarthStreamingSubsystem.generated.h"

class ABPGeoTileProxyActor;
class IHttpRequest;
class UTexture2D;

struct FBPStreamedTileState
{
    FBPGeoTileKey Key;
    TArray<FBPGeoFeature> Features;
    TArray<float> TerrainHeights;
    int32 TerrainWidth = 0;
    int32 TerrainHeight = 0;
    TWeakObjectPtr<ABPGeoTileProxyActor> Proxy;
    TArray<TSharedPtr<IHttpRequest, ESPMode::ThreadSafe>> Requests;
    bool bBridgePointRequested = false;
    bool bOpenFreeMapRequested = false;
    bool bTerrainRequested = false;
};

UCLASS(Config=Game)
class BRIDGEPOINTEARTH_API UBridgePointEarthStreamingSubsystem : public UTickableWorldSubsystem
{
    GENERATED_BODY()

public:
    UPROPERTY(Config, EditAnywhere, BlueprintReadWrite, Category="BridgePoint|Data")
    FString BridgePointFunctionsUrl = TEXT("https://xdfsjztwgsbmabshzsjw.supabase.co/functions/v1");

    UPROPERTY(Config, EditAnywhere, BlueprintReadWrite, Category="BridgePoint|Data")
    FString PublicApiKey;

    UPROPERTY(Config, EditAnywhere, BlueprintReadWrite, Category="BridgePoint|Data")
    FString BridgePointBuildingTileName = TEXT("bridgepoint-public-building-tile-v5019");

    UPROPERTY(Config, EditAnywhere, BlueprintReadWrite, Category="BridgePoint|Data")
    FString OpenFreeMapTileTemplate = TEXT("https://tiles.openfreemap.org/planet/latest/{z}/{x}/{y}.pbf");

    UPROPERTY(Config, EditAnywhere, BlueprintReadWrite, Category="BridgePoint|Data")
    FString TerrariumTileTemplate = TEXT("https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png");

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="BridgePoint|Streaming", meta=(ClampMin="8", ClampMax="18"))
    int32 TileZoom = 14;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="BridgePoint|Streaming", meta=(ClampMin="0", ClampMax="2"))
    int32 TileRadius = 1;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="BridgePoint|Streaming", meta=(ClampMin="1", ClampMax="32"))
    int32 MaxConcurrentRequests = 8;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="BridgePoint|Streaming")
    int32 MaxBuildingFeaturesPerTile = 3500;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="BridgePoint|Streaming")
    bool bStreamOpenFreeMap = true;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="BridgePoint|Streaming")
    bool bStreamTerrariumElevation = true;

    UFUNCTION(BlueprintCallable, Category="BridgePoint|Geo")
    void ConfigureWorldOrigin(double Longitude, double Latitude);

    UFUNCTION(BlueprintCallable, Category="BridgePoint|Layers")
    void SetLayerEnabled(FName LayerTag, bool bEnabled);

    UFUNCTION(BlueprintPure, Category="BridgePoint|Layers")
    TArray<FBPWorldLayerDefinition> GetLayerCatalog() const;

    UFUNCTION(BlueprintCallable, Category="BridgePoint|Streaming")
    void ForceRefresh();

    UFUNCTION(BlueprintCallable, Category="BridgePoint|Streaming")
    void GetLoadedFeatures(TArray<FBPGeoFeature>& OutFeatures) const;

    virtual void Initialize(FSubsystemCollectionBase& Collection) override;
    virtual void Deinitialize() override;
    virtual void Tick(float DeltaTime) override;
    virtual TStatId GetStatId() const override { RETURN_QUICK_DECLARE_CYCLE_STAT(UBridgePointEarthStreamingSubsystem, STATGROUP_Tickables); }

private:
    TMap<FString, FBPStreamedTileState> Tiles;
    TMap<FName, bool> LayerEnabled;
    double WorldOriginLongitude = 0.0;
    double WorldOriginLatitude = 0.0;
    double RefreshAccumulator = 0.0;
    double LastPlayerLatitude = TNumericLimits<double>::QuietNaN();
    double LastPlayerLongitude = TNumericLimits<double>::QuietNaN();
    bool bWorldOriginConfigured = false;
    TArray<FBPWorldLayerDefinition> LayerCatalog;

    void BuildLayerCatalog();
    bool GetPlayerGeoLocation(double& OutLatitude, double& OutLongitude) const;
    void ReconcileTiles(double Latitude, double Longitude);
    void EnsureTile(const FBPGeoTileKey& Key);
    void StartVectorRequest(const FString& TileId, const FString& Source, const FString& Url);
    void StartTerrainRequest(const FString& TileId, const FString& Url);
    void HandleVectorResponse(const FString& TileId, const FString& Source, const TArray<uint8>& Bytes, bool bSuccess);
    void HandleTerrainResponse(const FString& TileId, const TArray<uint8>& Bytes, bool bSuccess);
    void UpdateProxy(const FString& TileId);
    void UnloadTile(const FString& TileId);
    int32 CountInFlightRequests() const;
    FString BuildTileUrl(const FString& Template, const FBPGeoTileKey& Key) const;
    FString BridgePointTileUrl(const FBPGeoTileKey& Key) const;
};