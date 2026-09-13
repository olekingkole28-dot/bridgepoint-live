#include "HorizonZipline.h"

#include "Components/SplineComponent.h"
#include "Components/SplineMeshComponent.h"
#include "Engine/StaticMesh.h"
#include "GameFramework/Character.h"
#include "GameFramework/CharacterMovementComponent.h"
#include "UObject/ConstructorHelpers.h"

AHorizonZipline::AHorizonZipline()
{
    PrimaryActorTick.bCanEverTick = true;

    Spline = CreateDefaultSubobject<USplineComponent>(TEXT("ZiplineSpline"));
    SetRootComponent(Spline);

    Spline->ClearSplinePoints(false);
    Spline->AddSplinePoint(FVector(0.0f, 0.0f, 0.0f), ESplineCoordinateSpace::Local, false);
    Spline->AddSplinePoint(FVector(1800.0f, 0.0f, -280.0f), ESplineCoordinateSpace::Local, true);

    static ConstructorHelpers::FObjectFinder<UStaticMesh> CylinderFinder(TEXT("/Engine/BasicShapes/Cylinder.Cylinder"));
    if (CylinderFinder.Succeeded())
    {
        CableMesh = CylinderFinder.Object;
    }
}

void AHorizonZipline::OnConstruction(const FTransform& Transform)
{
    Super::OnConstruction(Transform);
    RebuildCableVisual();
}

void AHorizonZipline::RebuildCableVisual()
{
    for (USplineMeshComponent* Segment : CableSegments)
    {
        if (IsValid(Segment))
        {
            Segment->DestroyComponent();
        }
    }
    CableSegments.Reset();

    if (!CableMesh || !Spline || Spline->GetNumberOfSplinePoints() < 2)
    {
        return;
    }

    const int32 PointCount = Spline->GetNumberOfSplinePoints();
    for (int32 Index = 0; Index < PointCount - 1; ++Index)
    {
        USplineMeshComponent* Segment = NewObject<USplineMeshComponent>(
            this,
            *FString::Printf(TEXT("CableSegment_%d"), Index));

        Segment->SetStaticMesh(CableMesh);
        Segment->SetupAttachment(Spline);
        Segment->SetMobility(EComponentMobility::Movable);
        Segment->SetCollisionEnabled(ECollisionEnabled::NoCollision);
        Segment->SetForwardAxis(ESplineMeshAxis::Z, false);

        const FVector Start = Spline->GetLocationAtSplinePoint(Index, ESplineCoordinateSpace::Local);
        const FVector StartTangent = Spline->GetTangentAtSplinePoint(Index, ESplineCoordinateSpace::Local);
        const FVector End = Spline->GetLocationAtSplinePoint(Index + 1, ESplineCoordinateSpace::Local);
        const FVector EndTangent = Spline->GetTangentAtSplinePoint(Index + 1, ESplineCoordinateSpace::Local);

        Segment->SetStartAndEnd(Start, StartTangent, End, EndTangent, false);
        Segment->SetStartScale(FVector2D(0.035f, 0.035f), false);
        Segment->SetEndScale(FVector2D(0.035f, 0.035f), true);
        Segment->RegisterComponent();
        CableSegments.Add(Segment);
    }
}

bool AHorizonZipline::StartRide(ACharacter* Character)
{
    if (!Character || Rider.IsValid() || !Spline)
    {
        return false;
    }

    const float Length = Spline->GetSplineLength();
    if (Length <= KINDA_SMALL_NUMBER)
    {
        return false;
    }

    const FVector CharacterLocation = Character->GetActorLocation();
    const FVector StartLocation = Spline->GetLocationAtDistanceAlongSpline(0.0f, ESplineCoordinateSpace::World);
    const FVector EndLocation = Spline->GetLocationAtDistanceAlongSpline(Length, ESplineCoordinateSpace::World);

    const float StartDistance = FVector::Dist(CharacterLocation, StartLocation);
    const float EndDistance = FVector::Dist(CharacterLocation, EndLocation);
    const float ClosestDistance = FMath::Min(StartDistance, EndDistance);

    if (ClosestDistance > AttachRadiusCm)
    {
        return false;
    }

    Rider = Character;
    RideDirection = StartDistance <= EndDistance ? 1.0f : -1.0f;
    RideDistance = RideDirection > 0.0f ? 0.0f : Length;

    UCharacterMovementComponent* Movement = Character->GetCharacterMovement();
    if (Movement)
    {
        Movement->StopMovementImmediately();
        Movement->SetMovementMode(MOVE_Flying);
        Movement->GravityScale = 0.0f;
    }

    Character->SetActorEnableCollision(false);
    return true;
}

void AHorizonZipline::StopRide()
{
    ACharacter* Character = Rider.Get();
    if (Character)
    {
        Character->SetActorEnableCollision(true);

        if (UCharacterMovementComponent* Movement = Character->GetCharacterMovement())
        {
            Movement->GravityScale = 1.0f;
            Movement->SetMovementMode(MOVE_Falling);
        }
    }

    Rider.Reset();
}

void AHorizonZipline::Tick(float DeltaSeconds)
{
    Super::Tick(DeltaSeconds);

    ACharacter* Character = Rider.Get();
    if (!Character || !Spline)
    {
        return;
    }

    const float Length = Spline->GetSplineLength();
    RideDistance += RideDirection * RideSpeedCmPerSecond * DeltaSeconds;

    const bool bFinished = RideDirection > 0.0f
        ? RideDistance >= Length
        : RideDistance <= 0.0f;

    RideDistance = FMath::Clamp(RideDistance, 0.0f, Length);

    FVector Position = Spline->GetLocationAtDistanceAlongSpline(RideDistance, ESplineCoordinateSpace::World);
    Position.Z += RiderVerticalOffsetCm;

    const FVector Direction = Spline->GetDirectionAtDistanceAlongSpline(
        RideDistance,
        ESplineCoordinateSpace::World) * RideDirection;

    Character->SetActorLocationAndRotation(
        Position,
        Direction.Rotation(),
        false,
        nullptr,
        ETeleportType::TeleportPhysics);

    if (bFinished)
    {
        StopRide();
    }
}
