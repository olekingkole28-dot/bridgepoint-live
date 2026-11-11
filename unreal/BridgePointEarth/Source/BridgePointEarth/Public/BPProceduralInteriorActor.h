#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "BPProceduralInteriorActor.generated.h"

class UProceduralMeshComponent;
class UStaticMesh;
class UStaticMeshComponent;
class UMaterialInterface;

UCLASS(BlueprintType)
class BRIDGEPOINTEARTH_API ABPProceduralInteriorActor : public AActor
{
    GENERATED_BODY()

public:
    ABPProceduralInteriorActor();

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="BridgePoint|Interior")
    TArray<FVector2D> BuildingFootprint;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="BridgePoint|Interior", meta=(ClampMin="100.0"))
    float TotalHeightCm = 1200.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="BridgePoint|Interior", meta=(ClampMin="1", ClampMax="200"))
    int32 TotalFloors = 4;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="BridgePoint|Interior", meta=(ClampMin="100.0"))
    float RoomCellSizeCm = 800.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="BridgePoint|Interior", meta=(ClampMin="100.0"))
    float CorridorWidthCm = 240.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="BridgePoint|Interior", meta=(ClampMin="100.0"))
    float ShaftWidthCm = 320.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="BridgePoint|Interior")
    TObjectPtr<UStaticMesh> ModularStairMesh;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="BridgePoint|Interior")
    TObjectPtr<UMaterialInterface> InteriorMaterial;

    UFUNCTION(BlueprintCallable, Category="BridgePoint|Interior")
    bool GenerateInterior();

    UFUNCTION(BlueprintCallable, Category="BridgePoint|Interior")
    void ClearInterior();

private:
    UPROPERTY()
    TObjectPtr<USceneComponent> SceneRoot;

    UPROPERTY(Transient)
    TArray<TObjectPtr<UProceduralMeshComponent>> GeneratedMeshes;

    UPROPERTY(Transient)
    TArray<TObjectPtr<UStaticMeshComponent>> StairModules;

    static bool IsPointInsidePolygon(const FVector2D& Point, const TArray<FVector2D>& Polygon);
    static void AddQuad(TArray<FVector>& Vertices, TArray<int32>& Triangles, const FVector& A, const FVector& B,
                        const FVector& C, const FVector& D);
    bool IsInteriorSegment(const FVector2D& A, const FVector2D& B) const;
};