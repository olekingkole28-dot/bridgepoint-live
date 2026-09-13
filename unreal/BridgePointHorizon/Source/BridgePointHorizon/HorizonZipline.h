#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "HorizonZipline.generated.h"

class ACharacter;
class USplineComponent;
class UStaticMesh;
class USplineMeshComponent;

UCLASS(BlueprintType)
class BRIDGEPOINTHORIZON_API AHorizonZipline : public AActor
{
    GENERATED_BODY()

public:
    AHorizonZipline();

    virtual void Tick(float DeltaSeconds) override;
    virtual void OnConstruction(const FTransform& Transform) override;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category="Horizon|Zipline")
    TObjectPtr<USplineComponent> Spline;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Horizon|Zipline", meta=(ClampMin="300.0", ClampMax="5000.0"))
    float RideSpeedCmPerSecond = 1700.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Horizon|Zipline", meta=(ClampMin="50.0", ClampMax="500.0"))
    float AttachRadiusCm = 220.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Horizon|Zipline")
    float RiderVerticalOffsetCm = -85.0f;

    UFUNCTION(BlueprintCallable, Category="Horizon|Zipline")
    bool StartRide(ACharacter* Character);

    UFUNCTION(BlueprintCallable, Category="Horizon|Zipline")
    void StopRide();

    UFUNCTION(BlueprintPure, Category="Horizon|Zipline")
    bool IsOccupied() const { return Rider.IsValid(); }

protected:
    UPROPERTY()
    TObjectPtr<UStaticMesh> CableMesh;

    UPROPERTY()
    TArray<TObjectPtr<USplineMeshComponent>> CableSegments;

private:
    TWeakObjectPtr<ACharacter> Rider;
    float RideDistance = 0.0f;
    float RideDirection = 1.0f;

    void RebuildCableVisual();
};
