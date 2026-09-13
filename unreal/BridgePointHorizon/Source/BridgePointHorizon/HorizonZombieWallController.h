#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "HorizonZombieWallController.generated.h"

class USceneComponent;
class USplineComponent;

USTRUCT(BlueprintType)
struct FHorizonWallPerimeterLoop
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    FString JurisdictionKey;

    // Local-space playable outer boundary. Interior building/floor-plan data is never used here.
    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    TArray<FVector> LocalPoints;

    // Local-space regional endgame city/metro target for this disconnected playable region.
    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    FVector CollapseTargetLocal = FVector::ZeroVector;
};

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

    // Primary visual spline. Additional disconnected jurisdiction loops are created automatically.
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category="Horizon|YearOne")
    TObjectPtr<USplineComponent> WallSpline;

    // Preview/fallback radius only. Production Year One should provide PlayablePerimeterLoops.
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Horizon|YearOne", meta=(ClampMin="5000.0"))
    float InitialRadiusCm = 500000.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Horizon|YearOne", meta=(ClampMin="1000.0"))
    float FinalRadiusCm = 35000.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Horizon|YearOne", meta=(ClampMin="16", ClampMax="256"))
    int32 RingPointCount = 96;

    // Fallback target used only when no real playable-perimeter loops have been supplied.
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Horizon|YearOne")
    FVector EndgameCityCenter = FVector::ZeroVector;

    // Source-backed/approved outer playable loops for CONUS and disconnected U.S. jurisdictions.
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Horizon|YearOne")
    TArray<FHorizonWallPerimeterLoop> PlayablePerimeterLoops;

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

    UFUNCTION(BlueprintCallable, Category="Horizon|YearOne")
    void SetPlayablePerimeterLoops(const TArray<FHorizonWallPerimeterLoop>& NewLoops);

    UFUNCTION(BlueprintPure, Category="Horizon|YearOne")
    bool HasPlayablePerimeterLoops() const;

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
    UPROPERTY(Transient)
    TArray<TObjectPtr<USplineComponent>> ExtraWallSplines;

    float LastBuiltRadius = -1.0f;
    float LastBuiltProgress = -1.0f;

    float GetCurvedProgress01() const;
    TArray<FVector> GetContractedLoopPoints(const FHorizonWallPerimeterLoop& Loop) const;
    bool IsPointInsideLoop(const FVector2D& Point, const TArray<FVector>& LoopPoints) const;
    float DistanceToLoopBoundary(const FVector2D& Point, const TArray<FVector>& LoopPoints) const;
    void EnsureSplineCount(int32 RequiredLoopCount);
    void SetWallSplinesVisible(bool bVisible);
    void RebuildWallSpline();
};
