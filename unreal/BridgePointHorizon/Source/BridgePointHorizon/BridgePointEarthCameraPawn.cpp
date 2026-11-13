#include "BridgePointEarthCameraPawn.h"

#include "CesiumGlobeAnchorComponent.h"
#include "GameFramework/Controller.h"
#include "GameFramework/FloatingPawnMovement.h"

ABridgePointEarthCameraPawn::ABridgePointEarthCameraPawn()
{
    PrimaryActorTick.bCanEverTick = true;
}

void ABridgePointEarthCameraPawn::BeginPlay()
{
    Super::BeginPlay();
    UpdateMovementSpeed();
}

void ABridgePointEarthCameraPawn::PossessedBy(AController* NewController)
{
    Super::PossessedBy(NewController);

    if (NewController)
    {
        // Cesium uses a local East-South-Up view frame for this pawn.
        NewController->SetControlRotation(FRotator(-90.0f, 0.0f, 0.0f));
    }
}

void ABridgePointEarthCameraPawn::Tick(float DeltaSeconds)
{
    Super::Tick(DeltaSeconds);
    UpdateMovementSpeed();
}

double ABridgePointEarthCameraPawn::GetCurrentEllipsoidAltitudeMeters() const
{
    if (!GlobeAnchor)
    {
        return 0.0;
    }

    const double EcefRadiusMeters =
        GlobeAnchor->GetEarthCenteredEarthFixedPosition().Size();
    constexpr double Wgs84MeanRadiusMeters = 6371008.8;
    return FMath::Max(0.0, EcefRadiusMeters - Wgs84MeanRadiusMeters);
}

void ABridgePointEarthCameraPawn::UpdateMovementSpeed()
{
    UFloatingPawnMovement* Movement =
        Cast<UFloatingPawnMovement>(GetMovementComponent());
    if (!Movement)
    {
        return;
    }

    const double AltitudeMeters = GetCurrentEllipsoidAltitudeMeters();
    const double SpeedMetersPerSecond = FMath::Clamp(
        static_cast<double>(GroundMovementSpeedMetersPerSecond) +
            AltitudeMeters * static_cast<double>(AltitudeSpeedScale),
        static_cast<double>(GroundMovementSpeedMetersPerSecond),
        static_cast<double>(MaximumMovementSpeedMetersPerSecond));

    const float SpeedCentimetersPerSecond =
        static_cast<float>(SpeedMetersPerSecond * 100.0);
    Movement->MaxSpeed = SpeedCentimetersPerSecond;
    Movement->Acceleration = SpeedCentimetersPerSecond * 4.0f;
    Movement->Deceleration = SpeedCentimetersPerSecond * 6.0f;
}
