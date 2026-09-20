#include "HorizonPlayerCharacter.h"

#include "Camera/CameraComponent.h"
#include "Components/CapsuleComponent.h"
#include "Components/SkeletalMeshComponent.h"
#include "Components/StaticMeshComponent.h"
#include "Engine/StaticMesh.h"
#include "Engine/SkeletalMesh.h"
#include "Engine/GameInstance.h"
#include "Engine/World.h"
#include "EngineUtils.h"
#include "GameFramework/CharacterMovementComponent.h"
#include "GameFramework/Controller.h"
#include "GameFramework/SpringArmComponent.h"
#include "HorizonAutopilotSubsystem.h"
#include "HorizonAudioDirectorSubsystem.h"
#include "HorizonWeaponRuntimeComponent.h"
#include "HorizonWorldCellRenderer.h"
#include "PhysicalMaterials/PhysicalMaterial.h"
#include "ProceduralMeshComponent.h"

AHorizonPlayerCharacter::AHorizonPlayerCharacter()
{
    PrimaryActorTick.bCanEverTick = true;
    bReplicates = true;
    NetUpdateFrequency = 90.0f;
    MinNetUpdateFrequency = 30.0f;

    bUseControllerRotationPitch = false;
    bUseControllerRotationYaw = false;
    bUseControllerRotationRoll = false;

    UCharacterMovementComponent* Move = GetCharacterMovement();
    Move->bOrientRotationToMovement = false;
    Move->bUseControllerDesiredRotation = false;
    Move->RotationRate = FRotator(0.0f, 720.0f, 0.0f);
    Move->MaxAcceleration = 2200.0f;
    Move->BrakingDecelerationWalking = 1800.0f;
    Move->GroundFriction = 7.0f;
    Move->AirControl = 0.36f;
    Move->JumpZVelocity = 520.0f;
    Move->MaxWalkSpeed = WalkSpeed;
    Move->GetNavAgentPropertiesRef().bCanCrouch = true;
    Move->GetNavAgentPropertiesRef().bCanSwim = true;
    Move->MaxWalkSpeedCrouched = 235.0f;
    Move->MaxSwimSpeed = SwimSpeed;
    Move->BrakingDecelerationSwimming = 620.0f;
    Move->Buoyancy = SwimBuoyancy;
    Move->GravityScale = 0.0f;

    CameraBoom = CreateDefaultSubobject<USpringArmComponent>(TEXT("CameraBoom"));
    CameraBoom->SetupAttachment(GetRootComponent());
    // Horizon is first-person only. Keep the spring arm as a head/lean mount,
    // but never allow a chase-camera arm, lag, or third-person collision swing.
    CameraBoom->TargetArmLength = 0.0f;
    CameraBoom->bUsePawnControlRotation = true;
    CameraBoom->bEnableCameraLag = false;
    CameraBoom->CameraLagSpeed = 24.0f;
    CameraBoom->bEnableCameraRotationLag = false;
    CameraBoom->CameraRotationLagSpeed = 24.0f;
    CameraBoom->bDoCollisionTest = false;
    CameraBoom->SocketOffset = FVector(12.0f, 0.0f, 70.0f);

    FollowCamera = CreateDefaultSubobject<UCameraComponent>(TEXT("FollowCamera"));
    FollowCamera->SetupAttachment(CameraBoom, USpringArmComponent::SocketName);
    FollowCamera->bUsePawnControlRotation = false;
    FollowCamera->SetFieldOfView(86.0f);

    EquippedWeaponVisual = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("EquippedWeaponVisual"));
    EquippedWeaponVisual->SetupAttachment(GetMesh());
    EquippedWeaponVisual->SetCollisionEnabled(ECollisionEnabled::NoCollision);
    EquippedWeaponVisual->SetGenerateOverlapEvents(false);
    EquippedWeaponVisual->SetCastShadow(true);
    EquippedWeaponVisual->SetVisibility(false, true);

    FirstPersonArms = CreateDefaultSubobject<USkeletalMeshComponent>(TEXT("FirstPersonArms"));
    FirstPersonArms->SetupAttachment(FollowCamera);
    FirstPersonArms->SetCollisionEnabled(ECollisionEnabled::NoCollision);
    FirstPersonArms->SetGenerateOverlapEvents(false);
    FirstPersonArms->SetOnlyOwnerSee(true);
    FirstPersonArms->SetCastShadow(false);
    FirstPersonArms->SetVisibility(false, true);
    FirstPersonArms->SetRelativeTransform(FirstPersonArmsOffset);

    FirstPersonWeaponVisual = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("FirstPersonWeaponVisual"));
    FirstPersonWeaponVisual->SetupAttachment(FirstPersonArms);
    FirstPersonWeaponVisual->SetCollisionEnabled(ECollisionEnabled::NoCollision);
    FirstPersonWeaponVisual->SetGenerateOverlapEvents(false);
    FirstPersonWeaponVisual->SetOnlyOwnerSee(true);
    FirstPersonWeaponVisual->SetCastShadow(false);
    FirstPersonWeaponVisual->SetVisibility(false, true);

    WeaponRuntime = CreateDefaultSubobject<UHorizonWeaponRuntimeComponent>(TEXT("WeaponRuntime"));
}

void AHorizonPlayerCharacter::BeginPlay()
{
    Super::BeginPlay();

    // Preserve the streamed spawn's X/Y. Only keep the pawn safely above terrain until
    // the first real terrain cell reports ready.
    FVector SafeStart = GetActorLocation();
    SafeStart.Z = FMath::Max(500.0f, SafeStart.Z);
    SetActorLocation(SafeStart, false, nullptr, ETeleportType::TeleportPhysics);

    if (const UCapsuleComponent* Capsule = GetCapsuleComponent())
    {
        StandingCapsuleHalfHeight = Capsule->GetUnscaledCapsuleHalfHeight();
        StandingCapsuleRadius = Capsule->GetUnscaledCapsuleRadius();
    }

    AttachWeaponVisualToBestSocket(WeaponHandSocketName);
    if (EquippedWeaponVisual && EquippedWeaponVisual->GetStaticMesh())
    {
        EquippedWeaponVisual->SetVisibility(true, true);
    }

    MaxHealth = FMath::Max(1.0f, MaxHealth);
    MaxArmor = FMath::Max(0.0f, MaxArmor);
    CurrentHealth = MaxHealth;
    CurrentArmor = MaxArmor;

    RefreshMovementProfile();
    SetCameraMode(EHorizonCameraMode::FirstPerson);
}

float AHorizonPlayerCharacter::TakeDamage(
    float DamageAmount,
    const FDamageEvent& DamageEvent,
    AController* EventInstigator,
    AActor* DamageCauser)
{
    const float AcceptedDamage =
        Super::TakeDamage(DamageAmount, DamageEvent, EventInstigator, DamageCauser);
    const FVector IncomingDirection = DamageCauser
        ? (DamageCauser->GetActorLocation() - GetActorLocation()).GetSafeNormal2D()
        : GetActorForwardVector();
    return ApplyCombatHit(AcceptedDamage, IncomingDirection, false);
}

float AHorizonPlayerCharacter::ApplyCombatHit(
    float RawDamage,
    FVector IncomingDirection,
    bool bHeadshot)
{
    if (!HasAuthority() || CurrentHealth <= KINDA_SMALL_NUMBER)
    {
        return 0.0f;
    }

    const FHorizonCombatHitFeedback Feedback = ResolveCombatHit(
        RawDamage,
        CurrentHealth,
        CurrentArmor,
        MaxHealth,
        MaxArmor,
        GetActorForwardVector(),
        GetActorRightVector(),
        IncomingDirection,
        bHeadshot);
    if (Feedback.DamageToArmor <= 0.0f && Feedback.DamageToHealth <= 0.0f)
    {
        return 0.0f;
    }

    CurrentHealth = Feedback.HealthRemaining;
    CurrentArmor = Feedback.ArmorRemaining;
    OnCombatHitReaction.Broadcast(Feedback);

    if (AController* OwnerController = GetController();
        OwnerController && OwnerController->IsLocalController())
    {
        AddControllerPitchInput(Feedback.CameraImpulse.X);
        AddControllerYawInput(Feedback.CameraImpulse.Y);
    }

    if (UGameInstance* GameInstance = GetGameInstance())
    {
        if (UHorizonAudioDirectorSubsystem* Audio =
            GameInstance->GetSubsystem<UHorizonAudioDirectorSubsystem>())
        {
            Audio->PushPlayerHitFeedback(Feedback.Severity01);
        }
    }

    return Feedback.DamageToHealth;
}

EHorizonHitDirection AHorizonPlayerCharacter::ResolveHitDirection(
    const FVector& Forward,
    const FVector& Right,
    const FVector& IncomingDirection)
{
    const FVector SafeForward = Forward.GetSafeNormal2D();
    const FVector SafeRight = Right.GetSafeNormal2D();
    const FVector SafeIncoming = IncomingDirection.GetSafeNormal2D();
    if (SafeForward.IsNearlyZero() || SafeRight.IsNearlyZero() || SafeIncoming.IsNearlyZero())
    {
        return EHorizonHitDirection::Front;
    }

    const float ForwardDot = FVector::DotProduct(SafeForward, SafeIncoming);
    const float RightDot = FVector::DotProduct(SafeRight, SafeIncoming);
    if (FMath::Abs(ForwardDot) >= FMath::Abs(RightDot))
    {
        return ForwardDot >= 0.0f
            ? EHorizonHitDirection::Front
            : EHorizonHitDirection::Rear;
    }
    return RightDot >= 0.0f
        ? EHorizonHitDirection::Right
        : EHorizonHitDirection::Left;
}

FHorizonCombatHitFeedback AHorizonPlayerCharacter::ResolveCombatHit(
    float RawDamage,
    float CurrentHealthValue,
    float CurrentArmorValue,
    float MaxHealthValue,
    float MaxArmorValue,
    const FVector& Forward,
    const FVector& Right,
    const FVector& IncomingDirection,
    bool bHeadshot)
{
    FHorizonCombatHitFeedback Feedback;
    const float SafeMaxHealth = FMath::Max(
        1.0f,
        FMath::IsFinite(MaxHealthValue) ? MaxHealthValue : 100.0f);
    const float SafeMaxArmor = FMath::Max(
        0.0f,
        FMath::IsFinite(MaxArmorValue) ? MaxArmorValue : 0.0f);
    const float SafeHealth = FMath::Clamp(
        FMath::IsFinite(CurrentHealthValue) ? CurrentHealthValue : 0.0f,
        0.0f,
        SafeMaxHealth);
    const float SafeArmor = FMath::Clamp(
        FMath::IsFinite(CurrentArmorValue) ? CurrentArmorValue : 0.0f,
        0.0f,
        SafeMaxArmor);
    const float SafeDamage = FMath::Max(
        0.0f,
        FMath::IsFinite(RawDamage) ? RawDamage : 0.0f);
    const float ScaledDamage = FMath::Min(
        SafeDamage * (bHeadshot ? 1.50f : 1.0f),
        SafeMaxHealth + SafeMaxArmor);

    Feedback.HealthRemaining = SafeHealth;
    Feedback.ArmorRemaining = SafeArmor;
    Feedback.Direction = ResolveHitDirection(Forward, Right, IncomingDirection);
    Feedback.bHeadshot = bHeadshot && ScaledDamage > 0.0f;
    if (ScaledDamage <= 0.0f || SafeHealth <= 0.0f)
    {
        Feedback.bLethal = SafeHealth <= 0.0f;
        return Feedback;
    }

    Feedback.DamageToArmor = FMath::Min(SafeArmor, ScaledDamage * 0.65f);
    Feedback.DamageToHealth = FMath::Min(
        SafeHealth,
        ScaledDamage - Feedback.DamageToArmor);
    Feedback.ArmorRemaining = FMath::Max(0.0f, SafeArmor - Feedback.DamageToArmor);
    Feedback.HealthRemaining = FMath::Max(0.0f, SafeHealth - Feedback.DamageToHealth);
    Feedback.bArmorBroken =
        SafeArmor > KINDA_SMALL_NUMBER &&
        Feedback.ArmorRemaining <= KINDA_SMALL_NUMBER;
    Feedback.bLethal = Feedback.HealthRemaining <= KINDA_SMALL_NUMBER;
    Feedback.Severity01 = FMath::Clamp(
        (Feedback.DamageToHealth + Feedback.DamageToArmor * 0.35f) / SafeMaxHealth,
        0.0f,
        1.0f);

    const float ImpulseStrength = 0.22f + Feedback.Severity01 * 1.35f;
    Feedback.CameraImpulse.X =
        Feedback.Direction == EHorizonHitDirection::Rear
            ? ImpulseStrength * 0.45f
            : -ImpulseStrength;
    if (Feedback.Direction == EHorizonHitDirection::Right)
    {
        Feedback.CameraImpulse.Y = -ImpulseStrength;
    }
    else if (Feedback.Direction == EHorizonHitDirection::Left)
    {
        Feedback.CameraImpulse.Y = ImpulseStrength;
    }
    else
    {
        Feedback.CameraImpulse.Y = 0.0f;
    }
    Feedback.ReticleImpulse01 = FMath::Clamp(
        0.20f + Feedback.Severity01 * 0.80f + (Feedback.bHeadshot ? 0.10f : 0.0f),
        0.0f,
        1.0f);
    return Feedback;
}


void AHorizonPlayerCharacter::OnMovementModeChanged(
    EMovementMode PreviousMovementMode,
    uint8 PreviousCustomMode)
{
    Super::OnMovementModeChanged(PreviousMovementMode, PreviousCustomMode);

    UCharacterMovementComponent* Move = GetCharacterMovement();
    if (Move && Move->IsSwimming())
    {
        bSwimUsesProneCapsule = MovementStance == EHorizonMovementStance::Prone;
        bSprinting = false;
        bAiming = false;
        RawLeanInput = 0.0f;
        SwimVerticalInput = 0.0f;
        SlideTimeRemaining = 0.0f;
        VaultElapsedSeconds = 0.0f;
        ActiveVaultDurationSeconds = 0.0f;
        if (!bSwimUsesProneCapsule && bIsCrouched)
        {
            UnCrouch();
        }
        MovementStance = EHorizonMovementStance::Swimming;
        if (WeaponRuntime)
        {
            WeaponRuntime->SetAiming(false);
            WeaponRuntime->StopFire();
        }
        RefreshMovementProfile();
        return;
    }

    SwimVerticalInput = 0.0f;
    if (MovementStance == EHorizonMovementStance::Swimming)
    {
        if (bSwimUsesProneCapsule)
        {
            MovementStance = EHorizonMovementStance::Prone;
            TryExitProne();
        }
        else
        {
            MovementStance = bIsCrouched
                ? EHorizonMovementStance::Crouched
                : EHorizonMovementStance::Standing;
        }
        bSwimUsesProneCapsule = false;
        RefreshMovementProfile();
    }
}

void AHorizonPlayerCharacter::Tick(float DeltaSeconds)
{
    Super::Tick(DeltaSeconds);

    TryEnableWorldGravity(DeltaSeconds);
    UpdateTraversalState(DeltaSeconds);
    ApplyMovementInput(DeltaSeconds);
    UpdateFootstepAudio(DeltaSeconds);
    if (ShouldRefreshMovementProfile(
            MovementProfileRefreshAccumulator,
            DeltaSeconds,
            0.10f,
            MovementProfileRefreshAccumulator))
    {
        RefreshMovementProfile();
    }
    UpdateLean(DeltaSeconds);
    UpdateCameraPresentation(DeltaSeconds);
}

void AHorizonPlayerCharacter::UpdateFootstepAudio(float DeltaSeconds)
{
    UCharacterMovementComponent* Move = GetCharacterMovement();
    const bool bFootstepStance =
        MovementStance == EHorizonMovementStance::Standing ||
        MovementStance == EHorizonMovementStance::Crouched;
    if (!Move ||
        !Move->IsMovingOnGround() ||
        !bFootstepStance ||
        !FMath::IsFinite(DeltaSeconds) ||
        DeltaSeconds <= 0.0f)
    {
        FootstepDistanceAccumulator = 0.0f;
        return;
    }

    const float GroundSpeedCmPerSecond = GetVelocity().Size2D();
    if (!FMath::IsFinite(GroundSpeedCmPerSecond) ||
        GroundSpeedCmPerSecond < 35.0f)
    {
        FootstepDistanceAccumulator = 0.0f;
        return;
    }

    const bool bCrouchedStep =
        MovementStance == EHorizonMovementStance::Crouched || bIsCrouched;
    const float StrideLengthCm = bCrouchedStep
        ? 112.0f
        : (bSprinting ? 205.0f : 158.0f);
    const float BoundedDeltaSeconds = FMath::Min(DeltaSeconds, 0.10f);
    const int32 DueSteps =
        UHorizonAudioDirectorSubsystem::ConsumeFootstepDistance(
            GroundSpeedCmPerSecond * BoundedDeltaSeconds,
            StrideLengthCm,
            2,
            FootstepDistanceAccumulator);
    if (DueSteps <= 0)
    {
        return;
    }

    EHorizonFootstepSurface Surface = EHorizonFootstepSurface::Concrete;
    if (UWorld* World = GetWorld())
    {
        FHitResult GroundHit;
        FCollisionQueryParams QueryParams(
            SCENE_QUERY_STAT(HorizonFootstepSurface),
            false,
            this);
        QueryParams.bReturnPhysicalMaterial = true;

        const float CapsuleHalfHeight = GetCapsuleComponent()
            ? GetCapsuleComponent()->GetScaledCapsuleHalfHeight()
            : 90.0f;
        const FVector TraceStart = GetActorLocation();
        const FVector TraceEnd =
            TraceStart - FVector(0.0f, 0.0f, CapsuleHalfHeight + 45.0f);
        if (World->LineTraceSingleByChannel(
                GroundHit,
                TraceStart,
                TraceEnd,
                ECC_Visibility,
                QueryParams))
        {
            if (const UPhysicalMaterial* PhysicalMaterial =
                    GroundHit.PhysMaterial.Get())
            {
                Surface =
                    UHorizonAudioDirectorSubsystem::ResolveFootstepSurfaceName(
                        PhysicalMaterial->GetFName());
            }
            else if (const UPrimitiveComponent* HitComponent =
                         GroundHit.GetComponent())
            {
                for (const FName& Tag : HitComponent->ComponentTags)
                {
                    const EHorizonFootstepSurface TaggedSurface =
                        UHorizonAudioDirectorSubsystem::
                            ResolveFootstepSurfaceName(Tag);
                    if (TaggedSurface != EHorizonFootstepSurface::Concrete ||
                        Tag.ToString().Contains(TEXT("concrete"),
                            ESearchCase::IgnoreCase))
                    {
                        Surface = TaggedSurface;
                        break;
                    }
                }
            }
        }
    }

    UGameInstance* GameInstance = GetGameInstance();
    UHorizonAudioDirectorSubsystem* Audio = GameInstance
        ? GameInstance->GetSubsystem<UHorizonAudioDirectorSubsystem>()
        : nullptr;
    if (!Audio)
    {
        return;
    }

    const float MovementSpeed01 = FMath::Clamp(
        GroundSpeedCmPerSecond / FMath::Max(1.0f, Move->GetMaxSpeed()),
        0.0f,
        1.0f);
    for (int32 StepIndex = 0; StepIndex < DueSteps; ++StepIndex)
    {
        ++FootstepSequence;
        Audio->EmitFootstep(
            Surface,
            MovementSpeed01,
            bCrouchedStep,
            GetActorLocation(),
            FootstepSequence);
    }
}

void AHorizonPlayerCharacter::SetupPlayerInputComponent(UInputComponent* PlayerInputComponent)
{
    check(PlayerInputComponent);
    Super::SetupPlayerInputComponent(PlayerInputComponent);

    PlayerInputComponent->BindAxis(TEXT("MoveForward"), this, &AHorizonPlayerCharacter::MoveForward);
    PlayerInputComponent->BindAxis(TEXT("MoveRight"), this, &AHorizonPlayerCharacter::MoveRight);
    PlayerInputComponent->BindAxis(TEXT("Lean"), this, &AHorizonPlayerCharacter::SetLeanInput);
    PlayerInputComponent->BindAxis(TEXT("Turn"), this, &APawn::AddControllerYawInput);
    PlayerInputComponent->BindAxis(TEXT("LookUp"), this, &APawn::AddControllerPitchInput);

    PlayerInputComponent->BindAction(TEXT("Jump"), IE_Pressed, this, &AHorizonPlayerCharacter::StartTraversalJump);
    PlayerInputComponent->BindAction(TEXT("Jump"), IE_Released, this, &AHorizonPlayerCharacter::StopTraversalJump);
    PlayerInputComponent->BindAction(TEXT("Sprint"), IE_Pressed, this, &AHorizonPlayerCharacter::StartSprint);
    PlayerInputComponent->BindAction(TEXT("Sprint"), IE_Released, this, &AHorizonPlayerCharacter::StopSprint);
    PlayerInputComponent->BindAction(TEXT("Crouch"), IE_Pressed, this, &AHorizonPlayerCharacter::ToggleCrouch);
    PlayerInputComponent->BindAction(TEXT("Prone"), IE_Pressed, this, &AHorizonPlayerCharacter::ToggleProne);
    PlayerInputComponent->BindAction(TEXT("Slide"), IE_Pressed, this, &AHorizonPlayerCharacter::StartSlide);
    PlayerInputComponent->BindAction(TEXT("Aim"), IE_Pressed, this, &AHorizonPlayerCharacter::StartAim);
    PlayerInputComponent->BindAction(TEXT("Aim"), IE_Released, this, &AHorizonPlayerCharacter::StopAim);
    PlayerInputComponent->BindAction(TEXT("Fire"), IE_Pressed, this, &AHorizonPlayerCharacter::StartFireInput);
    PlayerInputComponent->BindAction(TEXT("Fire"), IE_Released, this, &AHorizonPlayerCharacter::StopFireInput);
    PlayerInputComponent->BindAction(TEXT("Reload"), IE_Pressed, this, &AHorizonPlayerCharacter::ReloadInput);
    // No camera-toggle binding: Horizon has one gameplay perspective, first person.
}

void AHorizonPlayerCharacter::StartTraversalJump()
{
    if (GetCharacterMovement() && GetCharacterMovement()->IsSwimming())
    {
        SwimVerticalInput = 1.0f;
        return;
    }

    if (TryStartVault())
    {
        return;
    }

    if (MovementStance == EHorizonMovementStance::Prone && !TryExitProne())
    {
        return;
    }

    if (MovementStance == EHorizonMovementStance::Sliding)
    {
        EndSlide();
    }

    if (bIsCrouched)
    {
        UnCrouch();
    }

    MovementStance = EHorizonMovementStance::Standing;
    Jump();
}

void AHorizonPlayerCharacter::StopTraversalJump()
{
    if (GetCharacterMovement() && GetCharacterMovement()->IsSwimming())
    {
        SwimVerticalInput = 0.0f;
        return;
    }
    StopJumping();
}

bool AHorizonPlayerCharacter::CanStartVault(
    EHorizonMovementStance Stance,
    bool bMovingOnGround,
    bool bIsAiming,
    float ForwardInput,
    float ObstacleHeightCm,
    bool bLandingClear,
    float MinimumHeightCm,
    float MaximumHeightCm)
{
    const float SafeMinimum = FMath::Max(1.0f, MinimumHeightCm);
    const float SafeMaximum = FMath::Max(SafeMinimum, MaximumHeightCm);
    return
        (Stance == EHorizonMovementStance::Standing ||
         Stance == EHorizonMovementStance::Crouched) &&
        bMovingOnGround &&
        !bIsAiming &&
        ForwardInput >= 0.25f &&
        FMath::IsFinite(ObstacleHeightCm) &&
        ObstacleHeightCm >= SafeMinimum &&
        ObstacleHeightCm <= SafeMaximum &&
        bLandingClear;
}

bool AHorizonPlayerCharacter::TryStartVault()
{
    UWorld* World = GetWorld();
    UCharacterMovementComponent* Move = GetCharacterMovement();
    const UCapsuleComponent* Capsule = GetCapsuleComponent();
    if (!World || !Move || !Capsule ||
        MovementStance == EHorizonMovementStance::Vaulting ||
        CachedMoveInput.Y < 0.25f)
    {
        return false;
    }

    const FVector Forward = GetActorForwardVector().GetSafeNormal2D();
    if (Forward.IsNearlyZero())
    {
        return false;
    }

    const float CapsuleHalfHeight = Capsule->GetScaledCapsuleHalfHeight();
    const float CapsuleRadius = Capsule->GetScaledCapsuleRadius();
    const FVector ActorLocation = GetActorLocation();
    const float BottomZ = ActorLocation.Z - CapsuleHalfHeight;

    FCollisionQueryParams Params(SCENE_QUERY_STAT(HorizonVaultProbe), false, this);
    FHitResult ObstacleHit;
    const FVector ForwardStart =
        FVector(ActorLocation.X, ActorLocation.Y, BottomZ + VaultMinimumHeightCm);
    const FVector ForwardEnd = ForwardStart + Forward * VaultForwardProbeCm;
    if (!World->LineTraceSingleByChannel(
            ObstacleHit,
            ForwardStart,
            ForwardEnd,
            ECC_Visibility,
            Params) ||
        !ObstacleHit.bBlockingHit)
    {
        return false;
    }

    // Measure the obstacle independently from the landing floor. Using the far-side
    // floor height here makes ordinary waist-high barriers look like zero-height obstacles.
    const FVector TopProbePlanar =
        ObstacleHit.ImpactPoint + Forward * FMath::Max(8.0f, CapsuleRadius * 0.35f);
    FHitResult ObstacleTopHit;
    const FVector TopTraceStart(
        TopProbePlanar.X,
        TopProbePlanar.Y,
        BottomZ + VaultMaximumHeightCm + 80.0f);
    const FVector TopTraceEnd(
        TopProbePlanar.X,
        TopProbePlanar.Y,
        BottomZ + VaultMinimumHeightCm);
    if (!World->LineTraceSingleByChannel(
            ObstacleTopHit,
            TopTraceStart,
            TopTraceEnd,
            ECC_Visibility,
            Params) ||
        !ObstacleTopHit.bBlockingHit)
    {
        return false;
    }

    const float ObstacleHeight = ObstacleTopHit.ImpactPoint.Z - BottomZ;
    const FVector LandingPlanar =
        ObstacleHit.ImpactPoint + Forward * (CapsuleRadius * 2.0f + 34.0f);
    FHitResult LandingHit;
    const FVector LandingTraceStart(
        LandingPlanar.X,
        LandingPlanar.Y,
        BottomZ + VaultMaximumHeightCm + 80.0f);
    const FVector LandingTraceEnd(
        LandingPlanar.X,
        LandingPlanar.Y,
        BottomZ - 50.0f);
    if (!World->LineTraceSingleByChannel(
            LandingHit,
            LandingTraceStart,
            LandingTraceEnd,
            ECC_Visibility,
            Params) ||
        !LandingHit.bBlockingHit)
    {
        return false;
    }

    const FVector CandidateTarget =
        LandingHit.ImpactPoint + FVector::UpVector * (CapsuleHalfHeight + 4.0f);
    const bool bWalkableLanding = LandingHit.ImpactNormal.Z >= 0.60f;
    const bool bSafeDrop = LandingHit.ImpactPoint.Z >= BottomZ - 50.0f;
    const bool bLandingClear =
        bWalkableLanding &&
        bSafeDrop &&
        !World->OverlapBlockingTestByChannel(
            CandidateTarget,
            FQuat::Identity,
            ECC_Pawn,
            FCollisionShape::MakeCapsule(CapsuleRadius, CapsuleHalfHeight),
            Params);

    if (!CanStartVault(
            MovementStance,
            Move->IsMovingOnGround(),
            bAiming,
            CachedMoveInput.Y,
            ObstacleHeight,
            bLandingClear,
            VaultMinimumHeightCm,
            VaultMaximumHeightCm))
    {
        return false;
    }

    bSprinting = false;
    bAiming = false;
    RawLeanInput = 0.0f;
    CurrentLeanAlpha = 0.0f;
    if (WeaponRuntime)
    {
        WeaponRuntime->SetAiming(false);
        WeaponRuntime->StopFire();
    }
    if (bIsCrouched)
    {
        UnCrouch();
    }

    VaultStartLocation = ActorLocation;
    VaultTargetLocation = CandidateTarget;
    VaultObstacleHeightCm = ObstacleHeight;
    VaultElapsedSeconds = 0.0f;
    ActiveVaultDurationSeconds = FMath::Clamp(VaultDurationSeconds, 0.20f, 0.80f);
    MovementStance = EHorizonMovementStance::Vaulting;
    Move->StopMovementImmediately();
    Move->SetMovementMode(MOVE_Flying);
    RefreshMovementProfile();
    return true;
}

void AHorizonPlayerCharacter::UpdateVault(float DeltaSeconds)
{
    if (MovementStance != EHorizonMovementStance::Vaulting)
    {
        return;
    }

    const float Step = FMath::Clamp(DeltaSeconds, 0.0f, 0.10f);
    VaultElapsedSeconds += Step;
    const float Alpha = FMath::Clamp(
        VaultElapsedSeconds / FMath::Max(0.20f, ActiveVaultDurationSeconds),
        0.0f,
        1.0f);
    const float SmoothedAlpha = Alpha * Alpha * (3.0f - 2.0f * Alpha);
    FVector NextLocation = FMath::Lerp(
        VaultStartLocation,
        VaultTargetLocation,
        SmoothedAlpha);
    NextLocation.Z += FMath::Sin(Alpha * PI) *
        FMath::Max(VaultArcHeightCm, VaultObstacleHeightCm * 0.30f);

    FHitResult SweepHit;
    SetActorLocation(
        NextLocation,
        true,
        &SweepHit,
        ETeleportType::None);

    if (SweepHit.bBlockingHit)
    {
        EndVault(false);
        return;
    }

    if (Alpha >= 1.0f - KINDA_SMALL_NUMBER)
    {
        EndVault(true);
    }
}

void AHorizonPlayerCharacter::EndVault(bool bCompleted)
{
    if (MovementStance != EHorizonMovementStance::Vaulting)
    {
        return;
    }

    // UpdateVault already moved to the target with collision enabled. Never add an
    // unswept completion snap: streamed geometry can arrive during the traversal.
    if (!bCompleted)
    {
        VaultTargetLocation = GetActorLocation();
    }

    VaultElapsedSeconds = 0.0f;
    ActiveVaultDurationSeconds = 0.0f;
    VaultObstacleHeightCm = 0.0f;
    MovementStance = EHorizonMovementStance::Standing;

    if (UCharacterMovementComponent* Move = GetCharacterMovement())
    {
        Move->SetMovementMode(MOVE_Walking);
    }
    RefreshMovementProfile();
}

void AHorizonPlayerCharacter::MoveForward(float Value)
{
    CachedMoveInput.Y = FMath::Clamp(Value, -1.0f, 1.0f);
}

void AHorizonPlayerCharacter::MoveRight(float Value)
{
    CachedMoveInput.X = FMath::Clamp(Value, -1.0f, 1.0f);
}

void AHorizonPlayerCharacter::SetLeanInput(float Value)
{
    RawLeanInput = FMath::Clamp(Value, -1.0f, 1.0f);
}

float AHorizonPlayerCharacter::ResolveLeanTarget(
    float RawInput,
    EHorizonMovementStance Stance,
    bool bIsSprinting,
    float ObstructionFraction)
{
    const float Input = FMath::Clamp(RawInput, -1.0f, 1.0f);
    if (FMath::Abs(Input) < 0.08f ||
        bIsSprinting ||
        Stance == EHorizonMovementStance::Prone ||
        Stance == EHorizonMovementStance::Sliding ||
        Stance == EHorizonMovementStance::Vaulting)
    {
        return 0.0f;
    }

    // Keep a small margin from blocking geometry instead of letting the camera touch a wall.
    const float SafeFraction = FMath::Clamp(ObstructionFraction, 0.0f, 1.0f);
    const float Clearance = FMath::Clamp((SafeFraction - 0.08f) / 0.92f, 0.0f, 1.0f);
    return Input * Clearance;
}

float AHorizonPlayerCharacter::ProbeLeanObstruction(float LeanDirection) const
{
    const UWorld* World = GetWorld();
    if (!World || !FollowCamera || FMath::IsNearlyZero(LeanDirection))
    {
        return 1.0f;
    }

    const FVector CameraRight = FollowCamera->GetRightVector();
    const FVector BaseCameraLocation =
        FollowCamera->GetComponentLocation() -
        CameraRight * (CurrentLeanAlpha * LeanDistanceCm);
    const FVector DesiredLocation =
        BaseCameraLocation + CameraRight * FMath::Sign(LeanDirection) * LeanDistanceCm;

    FCollisionQueryParams Params(SCENE_QUERY_STAT(HorizonLeanProbe), false, this);
    FHitResult Hit;
    const bool bBlocked = World->SweepSingleByChannel(
        Hit,
        BaseCameraLocation,
        DesiredLocation,
        FQuat::Identity,
        ECC_Visibility,
        FCollisionShape::MakeSphere(LeanProbeRadiusCm),
        Params);

    return bBlocked ? FMath::Clamp(Hit.Time, 0.0f, 1.0f) : 1.0f;
}

void AHorizonPlayerCharacter::UpdateLean(float DeltaSeconds)
{
    const float ObstructionFraction =
        FMath::Abs(RawLeanInput) >= 0.08f ? ProbeLeanObstruction(RawLeanInput) : 1.0f;
    const float TargetLean = ResolveLeanTarget(
        RawLeanInput,
        MovementStance,
        bSprinting,
        ObstructionFraction);

    const float Speed = FMath::IsNearlyZero(TargetLean)
        ? LeanInterpolationSpeed * 1.35f
        : LeanInterpolationSpeed;
    CurrentLeanAlpha = FMath::FInterpTo(
        CurrentLeanAlpha,
        TargetLean,
        DeltaSeconds,
        Speed);

    if (FMath::Abs(CurrentLeanAlpha) < 0.001f)
    {
        CurrentLeanAlpha = 0.0f;
    }
}

void AHorizonPlayerCharacter::ApplyMovementInput(float DeltaSeconds)
{
    if (!Controller || MovementStance == EHorizonMovementStance::Vaulting)
    {
        return;
    }

    const FVector2D Input = CachedMoveInput.GetClampedToMaxSize(1.0f);
    UCharacterMovementComponent* Move = GetCharacterMovement();
    if (Move && Move->IsSwimming())
    {
        const FRotator ControlRotation = Controller->GetControlRotation();
        const FVector ViewForward = FRotationMatrix(ControlRotation).GetUnitAxis(EAxis::X);
        const FVector ViewRight =
            FRotationMatrix(FRotator(0.0f, ControlRotation.Yaw, 0.0f)).GetUnitAxis(EAxis::Y);
        const FVector SwimDirection =
            ResolveSwimDirection(ViewForward, ViewRight, Input, SwimVerticalInput);
        if (!SwimDirection.IsNearlyZero())
        {
            AddMovementInput(SwimDirection, 1.0f);
            const FVector PlanarFacing = SwimDirection.GetSafeNormal2D();
            if (!PlanarFacing.IsNearlyZero())
            {
                const FRotator TargetFacing(0.0f, PlanarFacing.Rotation().Yaw, 0.0f);
                SetActorRotation(
                    FMath::RInterpTo(
                        GetActorRotation(),
                        TargetFacing,
                        DeltaSeconds,
                        FacingInterpolationSpeed),
                    ETeleportType::None);
            }
        }
        return;
    }

    if (Input.IsNearlyZero())
    {
        return;
    }

    const FRotator ControlYaw(0.0f, Controller->GetControlRotation().Yaw, 0.0f);
    const FVector Forward = FRotationMatrix(ControlYaw).GetUnitAxis(EAxis::X);
    const FVector Right = FRotationMatrix(ControlYaw).GetUnitAxis(EAxis::Y);
    const FVector DesiredDirection = (Forward * Input.Y + Right * Input.X).GetSafeNormal();

    const float SteeringScale = MovementStance == EHorizonMovementStance::Sliding ? 0.22f : 1.0f;
    AddMovementInput(DesiredDirection, Input.Size() * SteeringScale);

    if (!bAiming && MovementStance != EHorizonMovementStance::Sliding && !DesiredDirection.IsNearlyZero())
    {
        // Hip movement faces the exact combined stick/WASD vector. Applying this once per
        // frame avoids axis callback ordering and eliminates sideways/backwards facing.
        const FRotator TargetFacing(0.0f, DesiredDirection.Rotation().Yaw, 0.0f);
        SetActorRotation(
            FMath::RInterpTo(GetActorRotation(), TargetFacing, DeltaSeconds, FacingInterpolationSpeed),
            ETeleportType::None);
    }
}

void AHorizonPlayerCharacter::UpdateCameraPresentation(float DeltaSeconds)
{
    const bool bFirstPerson = CameraMode == EHorizonCameraMode::FirstPerson;
    const float TargetArm = bFirstPerson ? 0.0f : (bAiming ? AimArmLength : ThirdPersonArmLength);
    const float TargetFov = bAiming ? 68.0f :
        (bFirstPerson ? FirstPersonFieldOfView : ThirdPersonFieldOfView);
    const bool bLowStance =
        MovementStance == EHorizonMovementStance::Prone ||
        MovementStance == EHorizonMovementStance::Sliding;
    const float StanceHeightOffset = bLowStance ? -32.0f :
        (MovementStance == EHorizonMovementStance::Crouched ? -18.0f : 0.0f);
    FVector TargetOffset = bFirstPerson
        ? FVector(12.0f, 0.0f, 70.0f + StanceHeightOffset)
        : FVector(0.0f, 54.0f, 62.0f + StanceHeightOffset);
    TargetOffset.Y += CurrentLeanAlpha * (bFirstPerson ? LeanDistanceCm : LeanDistanceCm * 0.78f);

    CameraBoom->TargetArmLength = FMath::FInterpTo(
        CameraBoom->TargetArmLength,
        TargetArm,
        DeltaSeconds,
        bFirstPerson ? 24.0f : (bAiming ? 16.0f : 11.0f));
    CameraBoom->SocketOffset = FMath::VInterpTo(
        CameraBoom->SocketOffset,
        TargetOffset,
        DeltaSeconds,
        18.0f);
    FollowCamera->SetFieldOfView(FMath::FInterpTo(
        FollowCamera->FieldOfView,
        TargetFov,
        DeltaSeconds,
        bAiming ? 18.0f : 12.0f));

    const FRotator TargetLeanRotation(
        0.0f,
        0.0f,
        -CurrentLeanAlpha * LeanRollDegrees);
    FollowCamera->SetRelativeRotation(FMath::RInterpTo(
        FollowCamera->GetRelativeRotation(),
        TargetLeanRotation,
        DeltaSeconds,
        LeanInterpolationSpeed));
}

void AHorizonPlayerCharacter::SetCameraMode(EHorizonCameraMode NewMode)
{
    // Preserve the public API for Blueprint/backward compatibility, but clamp
    // every request to the only supported Horizon perspective.
    (void)NewMode;
    CameraMode = EHorizonCameraMode::FirstPerson;
    CameraBoom->TargetArmLength = 0.0f;
    CameraBoom->bDoCollisionTest = false;
    CameraBoom->bEnableCameraLag = false;
    CameraBoom->bEnableCameraRotationLag = false;

    if (USkeletalMeshComponent* CharacterMesh = GetMesh())
    {
        CharacterMesh->SetOwnerNoSee(true);
    }
    RefreshFirstPersonVisualState();
}

void AHorizonPlayerCharacter::ToggleCameraMode()
{
    SetCameraMode(EHorizonCameraMode::FirstPerson);
}

void AHorizonPlayerCharacter::StartSprint()
{
    if (MovementStance == EHorizonMovementStance::Vaulting ||
        MovementStance == EHorizonMovementStance::Swimming)
    {
        return;
    }

    if (MovementStance == EHorizonMovementStance::Prone && !TryExitProne())
    {
        return;
    }

    if (MovementStance == EHorizonMovementStance::Sliding)
    {
        return;
    }

    bSprinting = true;
    bAiming = false;
    UnCrouch();
    MovementStance = EHorizonMovementStance::Standing;
    RefreshMovementProfile();
}

void AHorizonPlayerCharacter::StopSprint()
{
    bSprinting = false;
    RefreshMovementProfile();
}

void AHorizonPlayerCharacter::ToggleCrouch()
{
    if (MovementStance == EHorizonMovementStance::Swimming)
    {
        return;
    }

    if (MovementStance == EHorizonMovementStance::Vaulting)
    {
        return;
    }

    if (MovementStance == EHorizonMovementStance::Sliding)
    {
        EndSlide();
        return;
    }

    if (MovementStance == EHorizonMovementStance::Prone)
    {
        if (TryExitProne())
        {
            Crouch();
            MovementStance = EHorizonMovementStance::Crouched;
        }
        RefreshMovementProfile();
        return;
    }

    if (bIsCrouched)
    {
        UnCrouch();
        MovementStance = EHorizonMovementStance::Standing;
    }
    else if (bSprinting && GetVelocity().Size2D() >= WalkSpeed * 1.15f)
    {
        StartSlide();
        return;
    }
    else
    {
        bSprinting = false;
        Crouch();
        MovementStance = EHorizonMovementStance::Crouched;
    }

    RefreshMovementProfile();
}

void AHorizonPlayerCharacter::ToggleProne()
{
    if (MovementStance == EHorizonMovementStance::Swimming)
    {
        return;
    }

    if (MovementStance == EHorizonMovementStance::Vaulting)
    {
        return;
    }

    if (MovementStance == EHorizonMovementStance::Prone)
    {
        TryExitProne();
        RefreshMovementProfile();
        return;
    }

    if (MovementStance == EHorizonMovementStance::Sliding)
    {
        EndSlide();
    }

    bSprinting = false;
    UnCrouch();

    UCapsuleComponent* Capsule = GetCapsuleComponent();
    if (!Capsule || StandingCapsuleHalfHeight <= 0.0f || StandingCapsuleRadius <= 0.0f)
    {
        return;
    }

    const float TargetHalfHeight = FMath::Clamp(
        ProneCapsuleHalfHeight,
        ProneCapsuleRadius,
        StandingCapsuleHalfHeight);
    const float CurrentHalfHeight = Capsule->GetUnscaledCapsuleHalfHeight();
    const float HeightDelta = FMath::Max(0.0f, CurrentHalfHeight - TargetHalfHeight);

    Capsule->SetCapsuleSize(ProneCapsuleRadius, TargetHalfHeight, true);
    SetActorLocation(
        GetActorLocation() - FVector::UpVector * HeightDelta,
        false,
        nullptr,
        ETeleportType::TeleportPhysics);

    MovementStance = EHorizonMovementStance::Prone;
    RefreshMovementProfile();
}

void AHorizonPlayerCharacter::StartSlide()
{
    UCharacterMovementComponent* Move = GetCharacterMovement();
    if (!Move || !Move->IsMovingOnGround() ||
        MovementStance == EHorizonMovementStance::Prone ||
        MovementStance == EHorizonMovementStance::Sliding ||
        MovementStance == EHorizonMovementStance::Swimming ||
        GetVelocity().Size2D() < WalkSpeed * 1.15f)
    {
        return;
    }

    SlideDirection = GetVelocity().GetSafeNormal2D();
    if (SlideDirection.IsNearlyZero())
    {
        SlideDirection = GetActorForwardVector().GetSafeNormal2D();
    }

    bSprinting = false;
    bAiming = false;
    SlideTimeRemaining = SlideDurationSeconds;
    MovementStance = EHorizonMovementStance::Sliding;
    Crouch();

    const float EntrySpeed = FMath::Max(GetVelocity().Size2D(), SlideEntrySpeed);
    Move->Velocity.X = SlideDirection.X * EntrySpeed;
    Move->Velocity.Y = SlideDirection.Y * EntrySpeed;
    RefreshMovementProfile();
}

void AHorizonPlayerCharacter::UpdateTraversalState(float DeltaSeconds)
{
    if (MovementStance == EHorizonMovementStance::Swimming)
    {
        return;
    }

    if (MovementStance == EHorizonMovementStance::Vaulting)
    {
        UpdateVault(DeltaSeconds);
        return;
    }

    if (MovementStance != EHorizonMovementStance::Sliding)
    {
        return;
    }

    UCharacterMovementComponent* Move = GetCharacterMovement();
    SlideTimeRemaining = FMath::Max(0.0f, SlideTimeRemaining - DeltaSeconds);

    if (!Move || !Move->IsMovingOnGround() ||
        SlideTimeRemaining <= 0.0f ||
        Move->Velocity.Size2D() < WalkSpeed * 0.72f)
    {
        EndSlide();
        return;
    }

    const float Speed = FMath::Max(
        WalkSpeed * 0.72f,
        Move->Velocity.Size2D() - SlideBrakingDeceleration * DeltaSeconds);
    Move->Velocity.X = SlideDirection.X * Speed;
    Move->Velocity.Y = SlideDirection.Y * Speed;
}

void AHorizonPlayerCharacter::EndSlide()
{
    if (MovementStance != EHorizonMovementStance::Sliding)
    {
        return;
    }

    SlideTimeRemaining = 0.0f;
    MovementStance = EHorizonMovementStance::Crouched;
    RefreshMovementProfile();
}

bool AHorizonPlayerCharacter::HasStandingClearance() const
{
    const UWorld* World = GetWorld();
    if (!World || StandingCapsuleHalfHeight <= 0.0f || StandingCapsuleRadius <= 0.0f)
    {
        return false;
    }

    const UCapsuleComponent* Capsule = GetCapsuleComponent();
    const float CurrentHalfHeight = Capsule ? Capsule->GetUnscaledCapsuleHalfHeight() : 0.0f;
    const FVector TestLocation =
        GetActorLocation() + FVector::UpVector * FMath::Max(0.0f, StandingCapsuleHalfHeight - CurrentHalfHeight);

    FCollisionQueryParams Params(SCENE_QUERY_STAT(HorizonProneClearance), false, this);
    return !World->OverlapBlockingTestByChannel(
        TestLocation,
        FQuat::Identity,
        ECC_Pawn,
        FCollisionShape::MakeCapsule(StandingCapsuleRadius, StandingCapsuleHalfHeight),
        Params);
}

bool AHorizonPlayerCharacter::TryExitProne()
{
    if (MovementStance != EHorizonMovementStance::Prone)
    {
        return true;
    }

    if (!HasStandingClearance())
    {
        return false;
    }

    UCapsuleComponent* Capsule = GetCapsuleComponent();
    const float CurrentHalfHeight = Capsule->GetUnscaledCapsuleHalfHeight();
    const float HeightDelta = FMath::Max(0.0f, StandingCapsuleHalfHeight - CurrentHalfHeight);
    SetActorLocation(
        GetActorLocation() + FVector::UpVector * HeightDelta,
        false,
        nullptr,
        ETeleportType::TeleportPhysics);
    Capsule->SetCapsuleSize(StandingCapsuleRadius, StandingCapsuleHalfHeight, true);

    MovementStance = EHorizonMovementStance::Standing;
    return true;
}

void AHorizonPlayerCharacter::StartAim()
{
    if (MovementStance == EHorizonMovementStance::Swimming)
    {
        return;
    }

    if (MovementStance == EHorizonMovementStance::Vaulting)
    {
        return;
    }

    if (MovementStance == EHorizonMovementStance::Sliding)
    {
        EndSlide();
    }

    bAiming = true;
    bSprinting = false;
    if (WeaponRuntime)
    {
        WeaponRuntime->SetAiming(true);
    }
    RefreshMovementProfile();
}

void AHorizonPlayerCharacter::StopAim()
{
    bAiming = false;
    if (WeaponRuntime)
    {
        WeaponRuntime->SetAiming(false);
    }
    RefreshMovementProfile();
}

void AHorizonPlayerCharacter::StartFireInput()
{
    if (WeaponRuntime &&
        MovementStance != EHorizonMovementStance::Sliding &&
        MovementStance != EHorizonMovementStance::Vaulting &&
        MovementStance != EHorizonMovementStance::Swimming)
    {
        bSprinting = false;
        WeaponRuntime->StartFire(bAiming);
        RefreshMovementProfile();
    }
}

void AHorizonPlayerCharacter::StopFireInput()
{
    if (WeaponRuntime)
    {
        WeaponRuntime->StopFire();
    }
}

void AHorizonPlayerCharacter::ReloadInput()
{
    if (MovementStance == EHorizonMovementStance::Swimming)
    {
        return;
    }

    if (WeaponRuntime)
    {
        WeaponRuntime->BeginReload();
    }
}

bool AHorizonPlayerCharacter::AttachWeaponVisualToBestSocket(FName PreferredSocket)
{
    if (!EquippedWeaponVisual || !GetMesh())
    {
        return false;
    }

    USkeletalMeshComponent* CharacterMesh = GetMesh();

    const auto IsUsableSocket = [CharacterMesh](FName Candidate)
    {
        return Candidate != NAME_None &&
            (CharacterMesh->DoesSocketExist(Candidate) ||
             CharacterMesh->GetBoneIndex(Candidate) != INDEX_NONE);
    };

    const TArray<FName> Candidates = {
        PreferredSocket,
        WeaponHandSocketName,
        TEXT("weapon_r"),
        TEXT("hand_r"),
        TEXT("RightHand"),
        TEXT("r_hand")
    };

    FName ChosenSocket = NAME_None;
    for (FName Candidate : Candidates)
    {
        if (IsUsableSocket(Candidate))
        {
            ChosenSocket = Candidate;
            break;
        }
    }

    if (ChosenSocket == NAME_None)
    {
        EquippedWeaponVisual->SetVisibility(false, true);
        return false;
    }

    EquippedWeaponVisual->AttachToComponent(
        CharacterMesh,
        FAttachmentTransformRules::SnapToTargetNotIncludingScale,
        ChosenSocket);
    EquippedWeaponVisual->SetRelativeTransform(WeaponGripOffset);
    return true;
}

bool AHorizonPlayerCharacter::AttachFirstPersonWeaponToBestSocket(FName PreferredSocket)
{
    if (!FirstPersonWeaponVisual || !FirstPersonArms)
    {
        return false;
    }

    const auto IsUsableSocket = [this](FName Candidate)
    {
        return Candidate != NAME_None &&
            (FirstPersonArms->DoesSocketExist(Candidate) ||
             FirstPersonArms->GetBoneIndex(Candidate) != INDEX_NONE);
    };

    const TArray<FName> Candidates = {
        PreferredSocket,
        FirstPersonWeaponSocketName,
        TEXT("weapon_r"),
        TEXT("hand_r"),
        TEXT("RightHand"),
        TEXT("r_hand")
    };

    FName ChosenSocket = NAME_None;
    for (FName Candidate : Candidates)
    {
        if (IsUsableSocket(Candidate))
        {
            ChosenSocket = Candidate;
            break;
        }
    }

    if (ChosenSocket == NAME_None)
    {
        FirstPersonWeaponVisual->SetVisibility(false, true);
        return false;
    }

    FirstPersonWeaponVisual->AttachToComponent(
        FirstPersonArms,
        FAttachmentTransformRules::SnapToTargetNotIncludingScale,
        ChosenSocket);
    FirstPersonWeaponVisual->SetRelativeTransform(FirstPersonWeaponGripOffset);
    return true;
}

bool AHorizonPlayerCharacter::SetFirstPersonArmsMesh(USkeletalMesh* ArmsMesh)
{
    if (!FirstPersonArms || !ArmsMesh)
    {
        return false;
    }

    FirstPersonArms->SetSkeletalMesh(ArmsMesh);
    FirstPersonArms->SetRelativeTransform(FirstPersonArmsOffset);

    if (GetMesh() && FirstPersonArms->GetSkeletalMeshAsset() &&
        GetMesh()->GetSkeletalMeshAsset() &&
        FirstPersonArms->GetSkeletalMeshAsset()->GetSkeleton() ==
        GetMesh()->GetSkeletalMeshAsset()->GetSkeleton())
    {
        FirstPersonArms->SetLeaderPoseComponent(GetMesh());
    }

    AttachFirstPersonWeaponToBestSocket(FirstPersonWeaponSocketName);
    RefreshFirstPersonVisualState();
    return true;
}

bool AHorizonPlayerCharacter::HasFirstPersonArms() const
{
    return FirstPersonArms && FirstPersonArms->GetSkeletalMeshAsset() != nullptr;
}

void AHorizonPlayerCharacter::RefreshFirstPersonVisualState()
{
    const bool bFirstPerson = CameraMode == EHorizonCameraMode::FirstPerson;
    const bool bHasArms = HasFirstPersonArms();
    const bool bHasWeapon = EquippedWeaponVisual &&
        EquippedWeaponVisual->GetStaticMesh() != nullptr;

    if (FirstPersonArms)
    {
        FirstPersonArms->SetVisibility(bFirstPerson && bHasArms, true);
        FirstPersonArms->SetOnlyOwnerSee(true);
    }

    if (EquippedWeaponVisual)
    {
        // Third-person/world representation stays visible outside FP and for other clients.
        EquippedWeaponVisual->SetOwnerNoSee(bFirstPerson);
        EquippedWeaponVisual->SetVisibility(bHasWeapon, true);
    }

    if (FirstPersonWeaponVisual)
    {
        FirstPersonWeaponVisual->SetVisibility(
            bFirstPerson && bHasArms && bHasWeapon,
            true);
        FirstPersonWeaponVisual->SetOnlyOwnerSee(true);
    }
}

bool AHorizonPlayerCharacter::EquipWeaponVisual(UStaticMesh* WeaponMesh, FName PreferredSocket)
{
    if (!EquippedWeaponVisual || !WeaponMesh)
    {
        return false;
    }

    EquippedWeaponVisual->SetStaticMesh(WeaponMesh);
    if (FirstPersonWeaponVisual)
    {
        FirstPersonWeaponVisual->SetStaticMesh(WeaponMesh);
    }

    const bool bThirdPersonAttached = AttachWeaponVisualToBestSocket(PreferredSocket);
    const bool bFirstPersonAttached = AttachFirstPersonWeaponToBestSocket(
        PreferredSocket == NAME_None ? FirstPersonWeaponSocketName : PreferredSocket);

    if (!bThirdPersonAttached)
    {
        EquippedWeaponVisual->SetVisibility(false, true);
    }

    if (!bFirstPersonAttached && FirstPersonWeaponVisual)
    {
        FirstPersonWeaponVisual->SetVisibility(false, true);
    }

    RefreshFirstPersonVisualState();
    return bThirdPersonAttached || bFirstPersonAttached;
}

void AHorizonPlayerCharacter::HolsterWeaponVisual()
{
    if (!EquippedWeaponVisual)
    {
        return;
    }

    EquippedWeaponVisual->SetVisibility(false, true);
    EquippedWeaponVisual->SetStaticMesh(nullptr);
    if (FirstPersonWeaponVisual)
    {
        FirstPersonWeaponVisual->SetVisibility(false, true);
        FirstPersonWeaponVisual->SetStaticMesh(nullptr);
    }
}

bool AHorizonPlayerCharacter::IsWeaponVisualEquipped() const
{
    return EquippedWeaponVisual &&
        EquippedWeaponVisual->IsVisible() &&
        EquippedWeaponVisual->GetStaticMesh() != nullptr;
}


FVector AHorizonPlayerCharacter::ResolveSwimDirection(
    const FVector& ViewForward,
    const FVector& ViewRight,
    const FVector2D& MoveInput,
    float VerticalInput)
{
    if (ViewForward.ContainsNaN() ||
        ViewRight.ContainsNaN() ||
        MoveInput.ContainsNaN() ||
        !FMath::IsFinite(VerticalInput))
    {
        return FVector::ZeroVector;
    }

    const FVector SafeForward = ViewForward.GetSafeNormal();
    const FVector SafeRight = ViewRight.GetSafeNormal();
    const FVector2D SafeMoveInput = MoveInput.GetClampedToMaxSize(1.0f);
    const float SafeVerticalInput = FMath::Clamp(VerticalInput, -1.0f, 1.0f);
    return (
        SafeForward * SafeMoveInput.Y +
        SafeRight * SafeMoveInput.X +
        FVector::UpVector * SafeVerticalInput).GetClampedToMaxSize(1.0f);
}

bool AHorizonPlayerCharacter::ShouldRefreshMovementProfile(
    float AccumulatedSeconds,
    float DeltaSeconds,
    float RefreshIntervalSeconds,
    float& OutRemainderSeconds)
{
    const float SafeAccumulated = FMath::IsFinite(AccumulatedSeconds)
        ? FMath::Max(0.0f, AccumulatedSeconds)
        : 0.0f;
    if (!FMath::IsFinite(DeltaSeconds) || DeltaSeconds <= 0.0f)
    {
        OutRemainderSeconds = SafeAccumulated;
        return false;
    }

    const float SafeInterval =
        FMath::IsFinite(RefreshIntervalSeconds) && RefreshIntervalSeconds > 0.0f
            ? FMath::Clamp(RefreshIntervalSeconds, 0.02f, 1.0f)
            : 0.10f;
    const float Elapsed =
        SafeAccumulated + FMath::Min(DeltaSeconds, 0.50f);
    if (Elapsed < SafeInterval)
    {
        OutRemainderSeconds = Elapsed;
        return false;
    }

    OutRemainderSeconds = FMath::Fmod(Elapsed, SafeInterval);
    return true;
}

void AHorizonPlayerCharacter::RefreshMovementProfile()
{
    float AdaptiveHz = 90.0f;
    float InterpSpeed = 14.0f;

    if (UWorld* World = GetWorld())
    {
        if (UHorizonAutopilotSubsystem* Autopilot = World->GetSubsystem<UHorizonAutopilotSubsystem>())
        {
            const FHorizonAutopilotProfile Profile = Autopilot->GetProfile();
            AdaptiveHz = Profile.MovementSampleRateHz;
            InterpSpeed = Profile.MovementInterpolationSpeed;
            Autopilot->ReportCameraSpeedMps(GetVelocity().Size() / 100.0f);
        }
    }

    NetUpdateFrequency = FMath::Clamp(AdaptiveHz, 45.0f, 120.0f);
    MinNetUpdateFrequency = FMath::Clamp(NetUpdateFrequency * 0.35f, 20.0f, 45.0f);

    UCharacterMovementComponent* Move = GetCharacterMovement();
    Move->MaxSwimSpeed = SwimSpeed;
    Move->Buoyancy = SwimBuoyancy;
    Move->MaxAcceleration = MovementStance == EHorizonMovementStance::Swimming
        ? SwimAcceleration
        : 2200.0f;
    if (MovementStance == EHorizonMovementStance::Vaulting)
    {
        Move->MaxWalkSpeed = 0.0f;
    }
    else if (MovementStance == EHorizonMovementStance::Swimming)
    {
        Move->MaxWalkSpeed = WalkSpeed;
    }
    else if (MovementStance == EHorizonMovementStance::Prone)
    {
        Move->MaxWalkSpeed = ProneSpeed;
    }
    else if (MovementStance == EHorizonMovementStance::Crouched ||
             MovementStance == EHorizonMovementStance::Sliding)
    {
        Move->MaxWalkSpeed = Move->MaxWalkSpeedCrouched;
    }
    else
    {
        Move->MaxWalkSpeed = bSprinting ? SprintSpeed : WalkSpeed;
    }
    Move->BrakingDecelerationWalking =
        MovementStance == EHorizonMovementStance::Sliding
            ? SlideBrakingDeceleration
            : 1800.0f;
    Move->RotationRate.Yaw = FMath::Clamp(InterpSpeed * 48.0f, 480.0f, 860.0f);

    // Hip movement follows travel direction. ADS switches to controller-facing strafe,
    // so the torso/weapon and reticle do not fight the movement rotation.
    const bool bControllerFacing = bAiming && Controller != nullptr;
    bUseControllerRotationYaw = bControllerFacing;
    Move->bOrientRotationToMovement = false;
    Move->bUseControllerDesiredRotation = false;

    CameraBoom->CameraLagSpeed = FMath::Clamp(InterpSpeed, 9.0f, 18.0f);
    CameraBoom->CameraRotationLagSpeed = FMath::Clamp(InterpSpeed * 1.15f, 10.0f, 21.0f);
}

void AHorizonPlayerCharacter::TryEnableWorldGravity(float DeltaSeconds)
{
    if (!bWaitingForStreamedTerrain)
    {
        return;
    }

    TerrainProbeAccumulator += DeltaSeconds;
    if (TerrainProbeAccumulator < 0.20f)
    {
        return;
    }
    TerrainProbeAccumulator = 0.0f;

    for (TActorIterator<AHorizonWorldCellRenderer> It(GetWorld()); It; ++It)
    {
        if (!It->HasTerrain() || !It->TerrainMesh)
        {
            continue;
        }

        // Terrain data existing is not enough: procedural collision may still be cooking.
        // Do not enable gravity until the actual terrain component can answer a trace.
        const FVector Location = GetActorLocation();
        const FVector TraceStart(Location.X, Location.Y, Location.Z + 200000.0f);
        const FVector TraceEnd(Location.X, Location.Y, Location.Z - 200000.0f);

        FCollisionQueryParams Params(SCENE_QUERY_STAT(HorizonTerrainGrounding), false, this);
        FHitResult TerrainHit;

        if (!It->TerrainMesh->LineTraceComponent(TerrainHit, TraceStart, TraceEnd, Params) ||
            !TerrainHit.bBlockingHit)
        {
            continue;
        }

        const float CapsuleHalfHeight = GetCapsuleComponent()
            ? GetCapsuleComponent()->GetScaledCapsuleHalfHeight()
            : 96.0f;

        const FVector GroundedLocation =
            TerrainHit.ImpactPoint + FVector::UpVector * (CapsuleHalfHeight + 4.0f);

        SetActorLocation(
            GroundedLocation,
            false,
            nullptr,
            ETeleportType::TeleportPhysics);

        UCharacterMovementComponent* Movement = GetCharacterMovement();
        Movement->GravityScale = 1.0f;
        Movement->SetMovementMode(MOVE_Walking);
        bWaitingForStreamedTerrain = false;
        return;
    }
}
