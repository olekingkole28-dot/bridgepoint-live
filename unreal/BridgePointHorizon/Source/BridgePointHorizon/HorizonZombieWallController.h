#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "HorizonZombieWallController.generated.h"

class USceneComponent;
class USplineComponent;

UCLASS(BlueprintType)
class BRIDGEPOINTHORIZON_API AHorizonZombieWallController : public AActor
{
    GENERATED_BODY()

public:
    AHorizonZombieWallController();

    virtual void Tick(float DeltaSeconds) override;
    virtual void OnConstruction(const FTransform& Transform) override;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category="Horizon|YearOne")
    TObjectPtr<USceneComponent> SceneRoot;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category="Horizon|YearOne")
    TObjectPtr<USplineComponent> WallSpline;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Horizon|YearOne", meta=(ClampMin="5000.0"))
    float InitialRadiusCm = 500000.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Horizon|YearOne", meta=(ClampMin="1000.0"))
    float FinalRadiusCm = 35000.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Horizon|YearOne", meta=(ClampMin="16", ClampMax="256"))
    int32 RingPointCount = 96;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Horizon|YearOne")
    FVector EndgameCityCenter = FVector::ZeroVector;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Horizon|YearOne", meta=(ClampMin="0.0", ClampMax="1.0"))
    float WallProgress01 = 0.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Horizon|YearOne")
    bool bFollowYearOneClock = true;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Horizon|YearOne")
    bool bHideUntilYearOneStarts = true;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Horizon|YearOne", meta=(ClampMin="100.0"))
    float DamageBandWidthCm = 6500.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Horizon|YearOne")
    float OutsideDamagePerSecond = 18.0f;

    UFUNCTION(BlueprintCallable, Category="Horizon|YearOne")
    void SetWallProgress(float NewProgress01);

    UFUNCTION(BlueprintPure, Category="Horizon|YearOne")
    float GetCurrentRadiusCm() const;

    UFUNCTION(BlueprintPure, Category="Horizon|YearOne")
    float GetSignedDistanceToWall(FVector WorldLocation) const;

    UFUNCTION(BlueprintPure, Category="Horizon|YearOne")
    bool IsOutsideWall(FVector WorldLocation) const;

    UFUNCTION(BlueprintPure, Category="Horizon|YearOne")
    float GetWallPressure01(FVector WorldLocation) const;

    UFUNCTION(BlueprintPure, Category="Horizon|YearOne")
    TArray<FVector> GetNearbyWallSpawnPoints(
        FVector PlayerWorldLocation,
        float ArcHalfAngleDegrees = 20.0f,
        int32 Count = 12) const;

private:
    float LastBuiltRadius = -1.0f;
    void RebuildWallSpline();
};
