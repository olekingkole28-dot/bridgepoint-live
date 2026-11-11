#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "BridgePointEarthTypes.h"
#include "BPGeoTileProxyActor.generated.h"

class UProceduralMeshComponent;

DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FBPOnGeoTileImpact, AActor*, HitActor, const FHitResult&, Hit);

UCLASS(BlueprintType)
class BRIDGEPOINT_EARTH_API ABPGeoTileProxyActor : public AActor
{
    GENERATED_BODY()

public:
    ABPGeoTileProxyActor();

    UFUNCTION(BlueprintCallable, Category="BridgePoint|World")
    void InitializeTile(const FBPGeoTileKey& InTile, double OriginLongitude, double OriginLatitude, const TArray<FBPGeoFeature>& InFeatures);

    UFUNCTION(BlueprintCallable, Category="BridgePoint|World")
    void SetTerrainGrid(const TArray<float>& HeightsMeters, int32 Width, int32 Height);

    UFUNCTION(BlueprintCallable, Category="BridgePoint|World")
    void SetLayerEnabled(FName LayerTag, bool bEnabled);

    UFUNCTION(BlueprintCallable, Category="BridgePoint|World")
    void NotifyTileImpact(const FHitResult& Hit);

    UFUNCTION(BlueprintPure, Category="BridgePoint|World")
    const TArray<FBPGeoFeature>& GetSourceFeatures() const { return Features; }

    UPROPERTY(BlueprintAssignable, Category="BridgePoint|Combat")
    FBPOnGeoTileImpact OnTileImpact;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category="BridgePoint|World")
    TObjectPtr<UProceduralMeshComponent> TerrainMesh;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="BridgePoint|World")
    float DefaultRoadWidthMeters = 4.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="BridgePoint|World")
    float RuntimeGeometryZOffsetCm = 5.0f;

private:
    UPROPERTY()
    TObjectPtr<USceneComponent> SceneRoot;

    UPROPERTY(Transient)
    TArray<TObjectPtr<UProceduralMeshComponent>> LayerMeshes;

    UPROPERTY(Transient)
    TArray<FName> LayerMeshTags;

    FBPGeoTileKey Tile;
    FVector2D TileCenterLonLat = FVector2D::ZeroVector;
    double WorldOriginLongitude = 0.0;
    double WorldOriginLatitude = 0.0;
    TArray<FBPGeoFeature> Features;

    UProceduralMeshComponent* FindOrCreateLayerMesh(FName LayerTag);
    FVector ToTileLocal(const FVector2D& LonLat, double HeightMeters = 0.0) const;
    void BuildVectorGeometry();
    void AddQuad(UProceduralMeshComponent* Mesh, TArray<FVector>& Vertices, TArray<int32>& Triangles,
                 TArray<FVector2D>& UVs, const FVector& A, const FVector& B, const FVector& C, const FVector& D);
    FName NormalizeLayerTag(const FString& SourceLayer) const;
};