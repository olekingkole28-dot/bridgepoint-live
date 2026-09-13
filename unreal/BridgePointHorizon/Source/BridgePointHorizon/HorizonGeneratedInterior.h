#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "HorizonGeneratedInterior.generated.h"

class UStaticMesh;
class UStaticMeshComponent;
class USceneComponent;

UCLASS(BlueprintType)
class BRIDGEPOINTHORIZON_API AHorizonGeneratedInterior : public AActor
{
    GENERATED_BODY()

public:
    AHorizonGeneratedInterior();

    virtual void Tick(float DeltaSeconds) override;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Horizon|Interior", meta=(ClampMin="1", ClampMax="40"))
    int32 FloorCount = 3;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Horizon|Interior", meta=(ClampMin="2", ClampMax="8"))
    int32 RoomsPerSide = 4;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Horizon|Interior", meta=(ClampMin="900.0"))
    float BuildingWidthCm = 2200.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Horizon|Interior", meta=(ClampMin="800.0"))
    float BuildingDepthCm = 1600.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Horizon|Interior", meta=(ClampMin="260.0", ClampMax="500.0"))
    float FloorHeightCm = 320.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Horizon|Interior")
    bool bOpenWindows = true;

    UFUNCTION(BlueprintCallable, Category="Horizon|Interior")
    void GenerateInterior(int32 Seed = 1337);

    UFUNCTION(BlueprintCallable, Category="Horizon|Interior")
    void ClearInterior();

    UFUNCTION(BlueprintCallable, Category="Horizon|Interior")
    bool ToggleNearestDoor(FVector WorldLocation, float RadiusCm = 260.0f);

    UFUNCTION(BlueprintPure, Category="Horizon|Interior")
    int32 GetGeneratedDoorCount() const { return Doors.Num(); }

    UFUNCTION(BlueprintPure, Category="Horizon|Interior")
    int32 GetGeneratedPieceCount() const { return GeneratedMeshes.Num(); }

protected:
    virtual void BeginPlay() override;

private:
    struct FDoorRuntime
    {
        TWeakObjectPtr<USceneComponent> Pivot;
        float ClosedYaw = 0.0f;
        float OpenYaw = 95.0f;
        float TargetYaw = 0.0f;
        bool bOpen = false;
    };

    UPROPERTY()
    TObjectPtr<USceneComponent> SceneRoot;

    UPROPERTY()
    TObjectPtr<UStaticMesh> CubeMesh;

    UPROPERTY()
    TArray<TObjectPtr<UStaticMeshComponent>> GeneratedMeshes;

    UPROPERTY()
    TArray<TObjectPtr<USceneComponent>> GeneratedSceneComponents;

    TArray<FDoorRuntime> Doors;

    UStaticMeshComponent* AddBox(
        const FString& Label,
        const FVector& RelativeCenter,
        const FVector& SizeCm,
        bool bMovable = false,
        USceneComponent* Parent = nullptr);

    void AddFloorPlate(int32 FloorIndex);
    void AddOuterShell(int32 FloorIndex);
    void AddRoomPartitions(int32 FloorIndex);
    void AddDoor(float X, float Y, float FloorZ, bool bNorthSide, int32 DoorIndex);
    void AddStairRun(int32 FromFloorIndex);
    void AddWindowBayX(float XMin, float XMax, float Y, float FloorZ, const FString& Prefix);
};
