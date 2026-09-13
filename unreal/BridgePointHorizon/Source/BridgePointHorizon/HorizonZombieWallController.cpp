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

    bool bStarted = true;

    if (bFollowYearOneClock)
    {
        bStarted = false;

        if (UGameInstance* GameInstance = GetGameInstance())
        {
            if (UHorizonGameStateSubsystem* GameState = GameInstance->GetSubsystem<UHorizonGameStateSubsystem>())
            {
                const FYearOneState State = GameState->GetYearOneState();
                bStarted = State.bStarted;
                WallProgress01 = GameState->GetZombieWallProgress01(FDateTime::UtcNow());
            }
        }
    }

    SetWallSplinesVisible(!bHideUntilYearOneStarts || bStarted);

    const float Radius = GetCurrentRadiusCm();
    if (!FMath::IsNearlyEqual(Radius, LastBuiltRadius, 25.0f) ||
        !FMath::IsNearlyEqual(WallProgress01, LastBuiltProgress, 0.000001f))
    {
        RebuildWallSpline();
    }
}

void AHorizonZombieWallController::SetWallProgress(float NewProgress01)
{
    WallProgress01 = FMath::Clamp(NewProgress01, 0.0f, 1.0f);
    RebuildWallSpline();
}

void AHorizonZombieWallController::SetPlayablePerimeterLoops(
    const TArray<FHorizonWallPerimeterLoop>& NewLoops)
{
    PlayablePerimeterLoops = NewLoops;
    RebuildWallSpline();
}

bool AHorizonZombieWallController::HasPlayablePerimeterLoops() const
{
    for (const FHorizonWallPerimeterLoop& Loop : PlayablePerimeterLoops)
    {
        if (Loop.LocalPoints.Num() >= 3)
        {
            return true;
        }
    }

    return false;
}

float AHorizonZombieWallController::GetCurvedProgress01() const
{
    // Slow contraction through most of the year, then a severe final-quarter squeeze.
    return FMath::Pow(FMath::Clamp(WallProgress01, 0.0f, 1.0f), 1.55f);
}

float AHorizonZombieWallController::GetCurrentRadiusCm() const
{
    return FMath::Lerp(InitialRadiusCm, FinalRadiusCm, GetCurvedProgress01());
}

TArray<FVector> AHorizonZombieWallController::GetContractedLoopPoints(
    const FHorizonWallPerimeterLoop& Loop) const
{
    TArray<FVector> Result;
    Result.Reserve(Loop.LocalPoints.Num());

    const float Progress = GetCurvedProgress01();

    for (const FVector& SourcePoint : Loop.LocalPoints)
    {
        FVector Radial = SourcePoint - Loop.CollapseTargetLocal;
        const float Distance2D = FVector2D(Radial.X, Radial.Y).Size();

        FVector FinalPoint = Loop.CollapseTargetLocal;
        if (Distance2D > KINDA_SMALL_NUMBER)
        {
            const FVector2D Direction2D(Radial.X / Distance2D, Radial.Y / Distance2D);
            FinalPoint.X += Direction2D.X * FinalRadiusCm;
            FinalPoint.Y += Direction2D.Y * FinalRadiusCm;
            FinalPoint.Z = FMath::Lerp(SourcePoint.Z, Loop.CollapseTargetLocal.Z, Progress);
        }

        Result.Add(FMath::Lerp(SourcePoint, FinalPoint, Progress));
    }

    return Result;
}

bool AHorizonZombieWallController::IsPointInsideLoop(
    const FVector2D& Point,
    const TArray<FVector>& LoopPoints) const
{
    if (LoopPoints.Num() < 3)
    {
        return false;
    }

    bool bInside = false;
    int32 Previous = LoopPoints.Num() - 1;

    for (int32 Index = 0; Index < LoopPoints.Num(); ++Index)
    {
        const FVector2D A(LoopPoints[Index].X, LoopPoints[Index].Y);
        const FVector2D B(LoopPoints[Previous].X, LoopPoints[Previous].Y);

        const bool bCrosses =
            ((A.Y > Point.Y) != (B.Y > Point.Y)) &&
            (Point.X < (B.X - A.X) * (Point.Y - A.Y) /
                (B.Y - A.Y) + A.X);

        if (bCrosses)
        {
            bInside = !bInside;
        }

        Previous = Index;
    }

    return bInside;
}

float AHorizonZombieWallController::DistanceToLoopBoundary(
    const FVector2D& Point,
    const TArray<FVector>& LoopPoints) const
{
    if (LoopPoints.Num() < 2)
    {
        return TNumericLimits<float>::Max();
    }

    float BestDistanceSq = TNumericLimits<float>::Max();

    for (int32 Index = 0; Index < LoopPoints.Num(); ++Index)
    {
        const int32 Next = (Index + 1) % LoopPoints.Num();
        const FVector2D A(LoopPoints[Index].X, LoopPoints[Index].Y);
        const FVector2D B(LoopPoints[Next].X, LoopPoints[Next].Y);
        const FVector2D AB = B - A;
        const float LengthSq = AB.SizeSquared();

        float T = 0.0f;
        if (LengthSq > KINDA_SMALL_NUMBER)
        {
            T = FMath::Clamp(FVector2D::DotProduct(Point - A, AB) / LengthSq, 0.0f, 1.0f);
        }

        const FVector2D Closest = A + AB * T;
        BestDistanceSq = FMath::Min(BestDistanceSq, FVector2D::DistSquared(Point, Closest));
    }

    return FMath::Sqrt(BestDistanceSq);
}

float AHorizonZombieWallController::GetSignedDistanceToWall(FVector WorldLocation) const
{
    const FVector Local = GetActorTransform().InverseTransformPosition(WorldLocation);
    const FVector2D Point(Local.X, Local.Y);

    bool bInsideAny = false;
    float BestInsideDistance = TNumericLimits<float>::Max();
    float BestOutsideDistance = TNumericLimits<float>::Max();

    for (const FHorizonWallPerimeterLoop& Loop : PlayablePerimeterLoops)
    {
        if (Loop.LocalPoints.Num() < 3)
        {
            continue;
        }

        const TArray<FVector> CurrentPoints = GetContractedLoopPoints(Loop);
        const float Distance = DistanceToLoopBoundary(Point, CurrentPoints);

        if (IsPointInsideLoop(Point, CurrentPoints))
        {
            bInsideAny = true;
            BestInsideDistance = FMath::Min(BestInsideDistance, Distance);
        }
        else
        {
            BestOutsideDistance = FMath::Min(BestOutsideDistance, Distance);
        }
    }

    if (bInsideAny)
    {
        return BestInsideDistance;
    }

    if (BestOutsideDistance < TNumericLimits<float>::Max())
    {
        return -BestOutsideDistance;
    }

    // Preview fallback when no perimeter source has been wired yet.
    const FVector2D Center(EndgameCityCenter.X, EndgameCityCenter.Y);
    return GetCurrentRadiusCm() - FVector2D::Distance(Center, Point);
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

    return 1.0f - FMath::Clamp(
        SignedDistance / FMath::Max(1.0f, DamageBandWidthCm),
        0.0f,
        1.0f);
}

TArray<FVector> AHorizonZombieWallController::GetNearbyWallSpawnPoints(
    FVector PlayerWorldLocation,
    float ArcHalfAngleDegrees,
    int32 Count) const
{
    TArray<FVector> Points;
    Count = FMath::Clamp(Count, 1, 64);

    const FVector LocalPlayer3D = GetActorTransform().InverseTransformPosition(PlayerWorldLocation);
    const FVector2D LocalPlayer(LocalPlayer3D.X, LocalPlayer3D.Y);

    TArray<FVector> BestLoop;
    int32 BestVertex = INDEX_NONE;
    float BestDistanceSq = TNumericLimits<float>::Max();

    for (const FHorizonWallPerimeterLoop& Loop : PlayablePerimeterLoops)
    {
        if (Loop.LocalPoints.Num() < 3)
        {
            continue;
        }

        const TArray<FVector> CurrentPoints = GetContractedLoopPoints(Loop);
        for (int32 Index = 0; Index < CurrentPoints.Num(); ++Index)
        {
            const FVector2D Candidate(CurrentPoints[Index].X, CurrentPoints[Index].Y);
            const float DistanceSq = FVector2D::DistSquared(LocalPlayer, Candidate);

            if (DistanceSq < BestDistanceSq)
            {
                BestDistanceSq = DistanceSq;
                BestVertex = Index;
                BestLoop = CurrentPoints;
            }
        }
    }

    if (BestVertex != INDEX_NONE && BestLoop.Num() >= 3)
    {
        const int32 OutputCount = FMath::Min(Count, BestLoop.Num());
        const int32 MaxSpan = FMath::Max(1, BestLoop.Num() / 2);
        const int32 Span = FMath::Clamp(
            FMath::RoundToInt((ArcHalfAngleDegrees / 180.0f) * BestLoop.Num()),
            1,
            MaxSpan);

        for (int32 Index = 0; Index < OutputCount; ++Index)
        {
            const float Alpha = OutputCount == 1
                ? 0.5f
                : static_cast<float>(Index) / static_cast<float>(OutputCount - 1);

            const int32 Offset = FMath::RoundToInt(FMath::Lerp(-static_cast<float>(Span), static_cast<float>(Span), Alpha));
            const int32 Vertex = (BestVertex + Offset + BestLoop.Num()) % BestLoop.Num();
            Points.Add(GetActorTransform().TransformPosition(BestLoop[Vertex]));
        }

        return Points;
    }

    // Preview fallback when source-backed perimeter geometry is not yet available.
    const FVector2D Center(EndgameCityCenter.X, EndgameCityCenter.Y);
    const FVector2D Direction = (LocalPlayer - Center).GetSafeNormal();

    const float BaseAngle = FMath::Atan2(Direction.Y, Direction.X);
    const float ArcRadians = FMath::DegreesToRadians(FMath::Clamp(ArcHalfAngleDegrees, 1.0f, 90.0f));
    const float Radius = GetCurrentRadiusCm();

    for (int32 Index = 0; Index < Count; ++Index)
    {
        const float Alpha = Count == 1 ? 0.5f : static_cast<float>(Index) / static_cast<float>(Count - 1);
        const float Angle = BaseAngle + FMath::Lerp(-ArcRadians, ArcRadians, Alpha);

        const FVector LocalPoint(
            EndgameCityCenter.X + FMath::Cos(Angle) * Radius,
            EndgameCityCenter.Y + FMath::Sin(Angle) * Radius,
            EndgameCityCenter.Z);

        Points.Add(GetActorTransform().TransformPosition(LocalPoint));
    }

    return Points;
}

void AHorizonZombieWallController::EnsureSplineCount(int32 RequiredLoopCount)
{
    RequiredLoopCount = FMath::Max(1, RequiredLoopCount);
    const int32 RequiredExtras = RequiredLoopCount - 1;

    while (ExtraWallSplines.Num() < RequiredExtras)
    {
        USplineComponent* Extra = NewObject<USplineComponent>(
            this,
            *FString::Printf(TEXT("ZombieWallSpline_%d"), ExtraWallSplines.Num() + 1));

        Extra->SetupAttachment(SceneRoot);
        Extra->SetClosedLoop(true);
        Extra->RegisterComponent();
        ExtraWallSplines.Add(Extra);
    }

    while (ExtraWallSplines.Num() > RequiredExtras)
    {
        USplineComponent* Extra = ExtraWallSplines.Pop();
        if (IsValid(Extra))
        {
            Extra->DestroyComponent();
        }
    }
}

void AHorizonZombieWallController::SetWallSplinesVisible(bool bVisible)
{
    if (WallSpline)
    {
        WallSpline->SetVisibility(bVisible, true);
    }

    for (USplineComponent* Extra : ExtraWallSplines)
    {
        if (IsValid(Extra))
        {
            Extra->SetVisibility(bVisible, true);
        }
    }
}

void AHorizonZombieWallController::RebuildWallSpline()
{
    if (!WallSpline)
    {
        return;
    }

    TArray<const FHorizonWallPerimeterLoop*> ValidLoops;
    for (const FHorizonWallPerimeterLoop& Loop : PlayablePerimeterLoops)
    {
        if (Loop.LocalPoints.Num() >= 3)
        {
            ValidLoops.Add(&Loop);
        }
    }

    if (!ValidLoops.IsEmpty())
    {
        EnsureSplineCount(ValidLoops.Num());

        for (int32 LoopIndex = 0; LoopIndex < ValidLoops.Num(); ++LoopIndex)
        {
            USplineComponent* Spline = LoopIndex == 0
                ? WallSpline
                : ExtraWallSplines[LoopIndex - 1];

            if (!Spline)
            {
                continue;
            }

            const TArray<FVector> CurrentPoints = GetContractedLoopPoints(*ValidLoops[LoopIndex]);
            Spline->ClearSplinePoints(false);

            for (const FVector& Point : CurrentPoints)
            {
                Spline->AddSplinePoint(Point, ESplineCoordinateSpace::Local, false);
            }

            Spline->SetClosedLoop(true, false);
            Spline->UpdateSpline();
        }
    }
    else
    {
        // A circle is deliberately only a preview fallback, never the production national shape.
        EnsureSplineCount(1);
        RingPointCount = FMath::Clamp(RingPointCount, 16, 256);
        const float Radius = GetCurrentRadiusCm();

        WallSpline->ClearSplinePoints(false);

        for (int32 Index = 0; Index < RingPointCount; ++Index)
        {
            const float Angle = (static_cast<float>(Index) / RingPointCount) * UE_TWO_PI;

            WallSpline->AddSplinePoint(
                FVector(
                    EndgameCityCenter.X + FMath::Cos(Angle) * Radius,
                    EndgameCityCenter.Y + FMath::Sin(Angle) * Radius,
                    EndgameCityCenter.Z),
                ESplineCoordinateSpace::Local,
                false);
        }

        WallSpline->SetClosedLoop(true, false);
        WallSpline->UpdateSpline();
    }

    LastBuiltRadius = GetCurrentRadiusCm();
    LastBuiltProgress = WallProgress01;
}
