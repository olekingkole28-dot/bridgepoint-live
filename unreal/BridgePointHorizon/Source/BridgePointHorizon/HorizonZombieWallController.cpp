#include "HorizonZombieWallController.h"

#include "Components/SceneComponent.h"
#include "Components/SplineComponent.h"
#include "Engine/GameInstance.h"
#include "HorizonGameStateSubsystem.h"

AHorizonZombieWallController::AHorizonZombieWallController()
{
    PrimaryActorTick.bCanEverTick = true;

    SceneRoot = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
    SetRootComponent(SceneRoot);

    WallSpline = CreateDefaultSubobject<USplineComponent>(TEXT("ZombieWallSpline"));
    WallSpline->SetupAttachment(SceneRoot);
    WallSpline->SetClosedLoop(true);
}

void AHorizonZombieWallController::OnConstruction(const FTransform& Transform)
{
    Super::OnConstruction(Transform);
    RebuildWallSpline();
}

void AHorizonZombieWallController::Tick(float DeltaSeconds)
{
    Super::Tick(DeltaSeconds);

    if (bFollowYearOneClock)
    {
        bool bStarted = false;

        if (UGameInstance* GameInstance = GetGameInstance())
        {
            if (UHorizonGameStateSubsystem* GameState = GameInstance->GetSubsystem<UHorizonGameStateSubsystem>())
            {
                const FYearOneState State = GameState->GetYearOneState();
                bStarted = State.bStarted;
                WallProgress01 = GameState->GetZombieWallProgress01(FDateTime::UtcNow());
            }
        }

        if (WallSpline)
        {
            WallSpline->SetVisibility(!bHideUntilYearOneStarts || bStarted, true);
        }
    }

    const float Radius = GetCurrentRadiusCm();
    if (!FMath::IsNearlyEqual(Radius, LastBuiltRadius, 25.0f))
    {
        RebuildWallSpline();
    }
}

void AHorizonZombieWallController::SetWallProgress(float NewProgress01)
{
    WallProgress01 = FMath::Clamp(NewProgress01, 0.0f, 1.0f);
    RebuildWallSpline();
}

float AHorizonZombieWallController::GetCurrentRadiusCm() const
{
    // Slow contraction through most of the year, then a severe final-quarter squeeze.
    const float CurvedProgress = FMath::Pow(FMath::Clamp(WallProgress01, 0.0f, 1.0f), 1.55f);
    return FMath::Lerp(InitialRadiusCm, FinalRadiusCm, CurvedProgress);
}

float AHorizonZombieWallController::GetSignedDistanceToWall(FVector WorldLocation) const
{
    const FVector2D Center(EndgameCityCenter.X, EndgameCityCenter.Y);
    const FVector2D Position(WorldLocation.X, WorldLocation.Y);
    const float DistanceFromCenter = FVector2D::Distance(Center, Position);

    // Positive means safely inside. Negative means the player is beyond the infected wall.
    return GetCurrentRadiusCm() - DistanceFromCenter;
}

bool AHorizonZombieWallController::IsOutsideWall(FVector WorldLocation) const
{
    return GetSignedDistanceToWall(WorldLocation) < 0.0f;
}

float AHorizonZombieWallController::GetWallPressure01(FVector WorldLocation) const
{
    const float SignedDistance = GetSignedDistanceToWall(WorldLocation);

    if (SignedDistance <= 0.0f)
    {
        return 1.0f;
    }

    return 1.0f - FMath::Clamp(SignedDistance / FMath::Max(1.0f, DamageBandWidthCm), 0.0f, 1.0f);
}

TArray<FVector> AHorizonZombieWallController::GetNearbyWallSpawnPoints(
    FVector PlayerWorldLocation,
    float ArcHalfAngleDegrees,
    int32 Count) const
{
    TArray<FVector> Points;
    Count = FMath::Clamp(Count, 1, 64);

    const FVector2D Center(EndgameCityCenter.X, EndgameCityCenter.Y);
    const FVector2D Player(PlayerWorldLocation.X, PlayerWorldLocation.Y);
    const FVector2D Direction = (Player - Center).GetSafeNormal();

    const float BaseAngle = FMath::Atan2(Direction.Y, Direction.X);
    const float ArcRadians = FMath::DegreesToRadians(FMath::Clamp(ArcHalfAngleDegrees, 1.0f, 90.0f));
    const float Radius = GetCurrentRadiusCm();

    for (int32 Index = 0; Index < Count; ++Index)
    {
        const float Alpha = Count == 1 ? 0.5f : static_cast<float>(Index) / static_cast<float>(Count - 1);
        const float Angle = BaseAngle + FMath::Lerp(-ArcRadians, ArcRadians, Alpha);

        Points.Add(FVector(
            EndgameCityCenter.X + FMath::Cos(Angle) * Radius,
            EndgameCityCenter.Y + FMath::Sin(Angle) * Radius,
            EndgameCityCenter.Z));
    }

    return Points;
}

void AHorizonZombieWallController::RebuildWallSpline()
{
    if (!WallSpline)
    {
        return;
    }

    RingPointCount = FMath::Clamp(RingPointCount, 16, 256);
    const float Radius = GetCurrentRadiusCm();

    WallSpline->ClearSplinePoints(false);

    for (int32 Index = 0; Index < RingPointCount; ++Index)
    {
        const float Angle = (static_cast<float>(Index) / RingPointCount) * UE_TWO_PI;

        const FVector LocalPoint(
            EndgameCityCenter.X + FMath::Cos(Angle) * Radius,
            EndgameCityCenter.Y + FMath::Sin(Angle) * Radius,
            EndgameCityCenter.Z);

        WallSpline->AddSplinePoint(LocalPoint, ESplineCoordinateSpace::Local, false);
    }

    WallSpline->SetClosedLoop(true, false);
    WallSpline->UpdateSpline();
    LastBuiltRadius = Radius;
}
