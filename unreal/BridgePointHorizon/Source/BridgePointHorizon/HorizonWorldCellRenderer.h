#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "HorizonWorldCellRenderer.generated.h"

class UProceduralMeshComponent;
class USceneComponent;
class UMaterialInterface;

UCLASS(BlueprintType)
class BRIDGEPOINTHORIZON_API AHorizonWorldCellRenderer : public AActor
{
    GENERATED_BODY()

public:
    AHorizonWorldCellRenderer();

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category="Horizon|World")
    TObjectPtr<USceneComponent> SceneRoot;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category="Horizon|World")
    TObjectPtr<UProceduralMeshComponent> TerrainMesh;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category="Horizon|World")
    TObjectPtr<UProceduralMeshComponent> RoadMesh;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category="Horizon|World")
    TObjectPtr<UProceduralMeshComponent> BuildingMesh;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category="Horizon|World")
    TObjectPtr<UProceduralMeshComponent> FarBuildingMesh;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category="Horizon|World")
    TObjectPtr<UProceduralMeshComponent> WaterMesh;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Horizon|Materials")
    TObjectPtr<UMaterialInterface> TerrainMaterial;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Horizon|Materials")
    TObjectPtr<UMaterialInterface> RoadMaterial;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Horizon|Materials")
    TObjectPtr<UMaterialInterface> BuildingMaterial;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Horizon|Materials")
    TObjectPtr<UMaterialInterface> BuildingPartMaterial;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Horizon|Materials")
    TObjectPtr<UMaterialInterface> WaterMaterial;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Horizon|World")
    float VerticalExaggeration = 1.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Horizon|World")
    float DefaultBuildingHeightMeters = 9.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Horizon|World")
    bool bCreateTerrainCollision = true;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Horizon|World")
    bool bCreateBuildingCollision = true;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Horizon|World")
    int32 MaxBuildingsPerCell = 3600;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Horizon|World")
    int32 MaxCollidableBuildingsPerCell = 650;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Horizon|World")
    int32 MaxBuildingPartsPerCell = 1400;

    UFUNCTION(BlueprintCallable, Category="Horizon|World")
    bool RenderCellJson(const FString& CellJson);

    UFUNCTION(BlueprintCallable, Category="Horizon|World")
    void ClearCell();

    UFUNCTION(BlueprintPure, Category="Horizon|World")
    int32 GetRenderedBuildingCount() const { return RenderedBuildingCount; }

    UFUNCTION(BlueprintPure, Category="Horizon|World")
    int32 GetRenderedRoadSegmentCount() const { return RenderedRoadSegmentCount; }

    UFUNCTION(BlueprintPure, Category="Horizon|World")
    int32 GetRenderedBuildingPartCount() const { return RenderedBuildingPartCount; }

    UFUNCTION(BlueprintPure, Category="Horizon|World")
    int32 GetRenderedWaterFeatureCount() const { return RenderedWaterFeatureCount; }

    UFUNCTION(BlueprintPure, Category="Horizon|World")
    int32 GetRenderedProfiledRoofCount() const { return RenderedProfiledRoofCount; }

    UFUNCTION(BlueprintPure, Category="Horizon|World")
    int32 GetTerrainReliefTintVertexCount() const { return TerrainReliefTintVertexCount; }

    UFUNCTION(BlueprintPure, Category="Horizon|World")
    FVector ProjectCoordinate(double Longitude, double Latitude, double HeightMeters = 0.0) const;

    UFUNCTION(BlueprintPure, Category="Horizon|World")
    bool HasTerrain() const { return TerrainWidth >= 2 && TerrainHeight >= 2; }

    static FIntPoint ResolveBuildingLodCounts(
        int32 AvailableBuildings,
        int32 VisualLimit,
        int32 CollisionLimit);

    static double ResolveSourceRoofHeightMeters(
        const FString& RoofShape,
        double RequestedRoofHeightMeters,
        double TotalBuildingHeightMeters);
    static FLinearColor ResolveTerrainReliefTint(
        double HeightMeters,
        double MinimumHeightMeters,
        double MaximumHeightMeters,
        double LocalReliefMeters);

private:
    double CenterLatitude = 0.0;
    double CenterLongitude = 0.0;
    double West = 0.0;
    double South = 0.0;
    double East = 0.0;
    double North = 0.0;

    int32 TerrainWidth = 0;
    int32 TerrainHeight = 0;
    double BaseElevationMeters = 0.0;
    TArray<double> TerrainHeightsMeters;

    int32 RenderedBuildingCount = 0;
    int32 RenderedBuildingPartCount = 0;
    int32 RenderedRoadSegmentCount = 0;
    int32 RenderedWaterFeatureCount = 0;
    int32 RenderedProfiledRoofCount = 0;
    int32 TerrainReliefTintVertexCount = 0;

    bool ParseCellHeader(const TSharedPtr<class FJsonObject>& Root);
    bool BuildTerrain(const TSharedPtr<class FJsonObject>& Root);
    void BuildTransport(const TSharedPtr<class FJsonObject>& Root);
    void BuildWater(const TSharedPtr<class FJsonObject>& Root);
    void BuildBuildings(const TSharedPtr<class FJsonObject>& Root);

    double SampleTerrainMeters(double Longitude, double Latitude) const;
};
