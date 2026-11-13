#pragma once

#include "CoreMinimal.h"
#include "GlobeAwareDefaultPawn.h"
#include "BridgePointEarthCameraPawn.generated.h"

/** Globe-aware navigation pawn with altitude-adaptive speed for desktop/controller Earth exploration. */
UCLASS()
class BRIDGEPOINTHORIZON_API ABridgePointEarthCameraPawn : public AGlobeAwareDefaultPawn
{
    GENERATED_BODY()

public:
    ABridgePointEarthCameraPawn();

    virtual void BeginPlay() override;
    virtual void Tick(float DeltaSeconds) override;
    virtual void PossessedBy(AController* NewController) override;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="BridgePoint|Earth|Camera", meta=(ClampMin="1000.0", ClampMax="30000000.0"))
    double InitialAltitudeMeters = 16000000.0;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="BridgePoint|Earth|Camera", meta=(ClampMin="0.1", ClampMax="1000.0"))
    float GroundMovementSpeedMetersPerSecond = 8.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="BridgePoint|Earth|Camera", meta=(ClampMin="0.001", ClampMax="1.0"))
    float AltitudeSpeedScale = 0.04f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="BridgePoint|Earth|Camera", meta=(ClampMin="1000.0", ClampMax="1000000.0"))
    float MaximumMovementSpeedMetersPerSecond = 250000.0f;

    UFUNCTION(BlueprintPure, Category="BridgePoint|Earth|Camera")
    double GetCurrentEllipsoidAltitudeMeters() const;

private:
    void UpdateMovementSpeed();
};
