#include "BPExplorerMovementComponent.h"
#include "GameFramework/Character.h"
#include "Components/CapsuleComponent.h"

UBPExplorerMovementComponent::UBPExplorerMovementComponent()
{
    PrimaryComponentTick.bCanEverTick = true;
    MaxWalkSpeed = JogSpeed;
}

void UBPExplorerMovementComponent::BeginPlay()
{
    Super::BeginPlay();
    Stamina = MaximumStamina;
    BaseBrakingDeceleration = BrakingDecelerationWalking;
    BaseBrakingFrictionFactor = BrakingFrictionFactor;
    if (ACharacter* Character = Cast<ACharacter>(GetOwner()))
    {
        if (UCapsuleComponent* Capsule = Character->GetCapsuleComponent())
            StandingCapsuleHalfHeight = Capsule->GetUnscaledCapsuleHalfHeight();
    }
    TargetCapsuleHalfHeight = StandingCapsuleHalfHeight;
    RefreshMovementTuning();
}

void UBPExplorerMovementComponent::SetSprinting(bool bEnabled)
{
    bSprinting = bEnabled && Stamina > 0.0f && Stance == EBPStance::Standing;
    RefreshMovementTuning();
}

void UBPExplorerMovementComponent::SetCrouching(bool bEnabled)
{
    if (bEnabled)
    {
        Stance = EBPStance::Crouching;
        bSprinting = false;
    }
    else if (Stance == EBPStance::Crouching)
    {
        Stance = EBPStance::Standing;
    }
    RefreshMovementTuning();
}

void UBPExplorerMovementComponent::SetProne(bool bEnabled)
{
    Stance = bEnabled ? EBPStance::Prone : EBPStance::Standing;
    bSprinting = false;
    RefreshMovementTuning();
}

void UBPExplorerMovementComponent::SetCarryWeight(float WeightKg, float CapacityKg)
{
    CarryCapacityKg = FMath::Max(1.0f, CapacityKg);
    CarryWeightKg = FMath::Clamp(WeightKg, 0.0f, CarryCapacityKg);
    RefreshMovementTuning();
}

float UBPExplorerMovementComponent::GetStaminaRatio() const
{
    return MaximumStamina > 0.0f ? FMath::Clamp(Stamina / MaximumStamina, 0.0f, 1.0f) : 0.0f;
}

void UBPExplorerMovementComponent::RefreshMovementTuning()
{
    const float LoadRatio = FMath::Clamp(CarryWeightKg / FMath::Max(1.0f, CarryCapacityKg), 0.0f, 1.0f);
    const float LoadSpeedScale = FMath::Lerp(1.0f, 0.72f, LoadRatio);
    const float StanceSpeed = Stance == EBPStance::Prone ? ProneSpeed :
        (Stance == EBPStance::Crouching ? CrouchSpeed : (bSprinting ? SprintSpeed : JogSpeed));
    MaxWalkSpeed = StanceSpeed * LoadSpeedScale;
    BrakingDecelerationWalking = BaseBrakingDeceleration * FMath::Lerp(1.0f, 1.45f, LoadRatio);
    BrakingFrictionFactor = BaseBrakingFrictionFactor * FMath::Lerp(1.0f, 1.35f, LoadRatio);
    TargetCapsuleHalfHeight = Stance == EBPStance::Prone ? ProneCapsuleHalfHeight :
        (Stance == EBPStance::Crouching ? CrouchedCapsuleHalfHeight : StandingCapsuleHalfHeight);
}

void UBPExplorerMovementComponent::ApplyStanceCapsule(float DeltaTime)
{
    ACharacter* Character = Cast<ACharacter>(GetOwner());
    UCapsuleComponent* Capsule = Character ? Character->GetCapsuleComponent() : nullptr;
    if (!Capsule) return;

    const float Current = Capsule->GetUnscaledCapsuleHalfHeight();
    const float Next = FMath::FInterpTo(Current, TargetCapsuleHalfHeight, DeltaTime, StanceTransitionSpeed);
    if (FMath::Abs(Next - Current) < 0.05f) return;

    const float Delta = Next - Current;
    // Move the capsule center by the same delta to keep the bottom of the body on the floor.
    Capsule->SetCapsuleHalfHeight(Next, true);
    Character->AddActorWorldOffset(FVector(0.0, 0.0, Delta), false);
}

void UBPExplorerMovementComponent::TickComponent(float DeltaTime, ELevelTick TickType, FActorComponentTickFunction* ThisTickFunction)
{
    Super::TickComponent(DeltaTime, TickType, ThisTickFunction);
    if (bSprinting && Velocity.SizeSquared2D() > FMath::Square(30.0f))
    {
        Stamina = FMath::Max(0.0f, Stamina - SprintStaminaDrainPerSecond * (1.0f + CarryWeightKg / FMath::Max(1.0f, CarryCapacityKg)) * DeltaTime);
        if (Stamina <= 0.0f) { bSprinting = false; RefreshMovementTuning(); }
    }
    else
    {
        Stamina = FMath::Min(MaximumStamina, Stamina + StaminaRegenerationPerSecond * DeltaTime);
    }
    ApplyStanceCapsule(DeltaTime);
}