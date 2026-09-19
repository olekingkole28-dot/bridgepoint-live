#include "HorizonPlayerCharacter.h"

#include "Camera/CameraComponent.h"
#include "Components/CapsuleComponent.h"
#include "Components/SkeletalMeshComponent.h"
#include "Components/StaticMeshComponent.h"
#include "Engine/StaticMesh.h"
#include "Engine/SkeletalMesh.h"
#include "EngineUtils.h"
#include "GameFramework/CharacterMovementComponent.h"
#include "GameFramework/SpringArmComponent.h"
#include "HorizonAutopilotSubsystem.h"
#include "HorizonWorldCellRenderer.h"
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
    Move->MaxWalkSpeedCrouched = 235.0f;
    Move->GravityScale = 0.0f;

    CameraBoom = CreateDefaultSubobject<USpringArmComponent>(TEXT("CameraBoom"));
    CameraBoom->SetupAttachment(GetRootComponent());
    CameraBoom->TargetArmLength = ThirdPersonArmLength;
    CameraBoom->bUsePawnControlRotation = true;
    CameraBoom->bEnableCameraLag = true;
    CameraBoom->CameraLagSpeed = 15.0f;
    CameraBoom->bEnableCameraRotationLag = true;
    CameraBoom->CameraRotationLagSpeed = 18.0f;
    CameraBoom->bDoCollisionTest = true;
    CameraBoom->SocketOffset = FVector(0.0f, 54.0f, 62.0f);

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

    RefreshMovementProfile();
    RefreshFirstPersonVisualState();
}

void AHorizonPlayerCharacter::Tick(float DeltaSeconds)
{
    Super::Tick(DeltaSeconds);

    TryEnableWorldGravity(DeltaSeconds);
    UpdateTraversalState(DeltaSeconds);
    ApplyMovementInput(DeltaSeconds);
    RefreshMovementProfile();
    UpdateCameraPresentation(DeltaSeconds);
}

void AHorizonPlayerCharacter::SetupPlayerInputComponent(UInputComponent* PlayerInputComponent)
{
    check(PlayerInputComponent);
    Super::SetupPlayerInputComponent(PlayerInputComponent);

    PlayerInputComponent->BindAxis(TEXT("MoveForward"), this, &AHorizonPlayerCharacter::MoveForward);
    PlayerInputComponent->BindAxis(TEXT("MoveRight"), this, &AHorizonPlayerCharacter::MoveRight);
    PlayerInputComponent->BindAxis(TEXT("Turn"), this, &APawn::AddControllerYawInput);
    PlayerInputComponent->BindAxis(TEXT("LookUp"), this, &APawn::AddControllerPitchInput);

    PlayerInputComponent->BindAction(TEXT("Jump"), IE_Pressed, this, &AHorizonPlayerCharacter::StartTraversalJump);
    PlayerInputComponent->BindAction(TEXT("Jump"), IE_Released, this, &ACharacter::StopJumping);
    PlayerInputComponent->BindAction(TEXT("Sprint"), IE_Pressed, this, &AHorizonPlayerCharacter::StartSprint);
    PlayerInputComponent->BindAction(TEXT("Sprint"), IE_Released, this, &AHorizonPlayerCharacter::StopSprint);
    PlayerInputComponent->BindAction(TEXT("Crouch"), IE_Pressed, this, &AHorizonPlayerCharacter::ToggleCrouch);
    PlayerInputComponent->BindAction(TEXT("Prone"), IE_Pressed, this, &AHorizonPlayerCharacter::ToggleProne);
    PlayerInputComponent->BindAction(TEXT("Slide"), IE_Pressed, this, &AHorizonPlayerCharacter::StartSlide);
    PlayerInputComponent->BindAction(TEXT("Aim"), IE_Pressed, this, &AHorizonPlayerCharacter::StartAim);
    PlayerInputComponent->BindAction(TEXT("Aim"), IE_Released, this, &AHorizonPlayerCharacter::StopAim);
    PlayerInputComponent->BindAction(TEXT("ToggleCamera"), IE_Pressed, this, &AHorizonPlayerCharacter::ToggleCameraMode);
}

void AHorizonPlayerCharacter::StartTraversalJump()
{
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

void AHorizonPlayerCharacter::MoveForward(float Value)
{
    CachedMoveInput.Y = FMath::Clamp(Value, -1.0f, 1.0f);
}

void AHorizonPlayerCharacter::MoveRight(float Value)
{
    CachedMoveInput.X = FMath::Clamp(Value, -1.0f, 1.0f);
}

void AHorizonPlayerCharacter::ApplyMovementInput(float DeltaSeconds)
{
    if (!Controller)
    {
        return;
    }

    const FVector2D Input = CachedMoveInput.GetClampedToMaxSize(1.0f);
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
    const FVector TargetOffset = bFirstPerson
        ? FVector(12.0f, 0.0f, 70.0f + StanceHeightOffset)
        : FVector(0.0f, 54.0f, 62.0f + StanceHeightOffset);

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
}

void AHorizonPlayerCharacter::SetCameraMode(EHorizonCameraMode NewMode)
{
    if (CameraMode == NewMode)
    {
        return;
    }

    CameraMode = NewMode;
    const bool bFirstPerson = CameraMode == EHorizonCameraMode::FirstPerson;
    CameraBoom->bDoCollisionTest = !bFirstPerson;
    CameraBoom->bEnableCameraLag = !bFirstPerson;
    CameraBoom->bEnableCameraRotationLag = !bFirstPerson;

    if (USkeletalMeshComponent* CharacterMesh = GetMesh())
    {
        CharacterMesh->SetOwnerNoSee(bFirstPerson);
    }
    RefreshFirstPersonVisualState();
}

void AHorizonPlayerCharacter::ToggleCameraMode()
{
    SetCameraMode(CameraMode == EHorizonCameraMode::FirstPerson
        ? EHorizonCameraMode::ThirdPerson
        : EHorizonCameraMode::FirstPerson);
}

void AHorizonPlayerCharacter::StartSprint()
{
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
    if (MovementStance == EHorizonMovementStance::Sliding)
    {
        EndSlide();
    }

    bAiming = true;
    bSprinting = false;
    RefreshMovementProfile();
}

void AHorizonPlayerCharacter::StopAim()
{
    bAiming = false;
    RefreshMovementProfile();
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
    if (MovementStance == EHorizonMovementStance::Prone)
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
