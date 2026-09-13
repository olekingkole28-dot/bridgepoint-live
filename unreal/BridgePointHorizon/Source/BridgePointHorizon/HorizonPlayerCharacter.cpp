#include "HorizonPlayerCharacter.h"

#include "Camera/CameraComponent.h"
#include "Components/SkeletalMeshComponent.h"
#include "Components/StaticMeshComponent.h"
#include "Engine/StaticMesh.h"
#include "EngineUtils.h"
#include "GameFramework/CharacterMovementComponent.h"
#include "GameFramework/SpringArmComponent.h"
#include "HorizonAutopilotSubsystem.h"
#include "HorizonWorldCellRenderer.h"

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
    Move->bOrientRotationToMovement = true;
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
}

void AHorizonPlayerCharacter::BeginPlay()
{
    Super::BeginPlay();

    // Preserve the streamed spawn's X/Y. Only keep the pawn safely above terrain until
    // the first real terrain cell reports ready.
    FVector SafeStart = GetActorLocation();
    SafeStart.Z = FMath::Max(500.0f, SafeStart.Z);
    SetActorLocation(SafeStart, false, nullptr, ETeleportType::TeleportPhysics);

    AttachWeaponVisualToBestSocket(WeaponHandSocketName);
    if (EquippedWeaponVisual && EquippedWeaponVisual->GetStaticMesh())
    {
        EquippedWeaponVisual->SetVisibility(true, true);
    }

    RefreshMovementProfile();
}

void AHorizonPlayerCharacter::Tick(float DeltaSeconds)
{
    Super::Tick(DeltaSeconds);

    TryEnableWorldGravity(DeltaSeconds);
    RefreshMovementProfile();

    const float TargetArm = bAiming ? AimArmLength : ThirdPersonArmLength;
    CameraBoom->TargetArmLength = FMath::FInterpTo(
        CameraBoom->TargetArmLength,
        TargetArm,
        DeltaSeconds,
        bAiming ? 16.0f : 11.0f);

    const float TargetFov = bAiming ? 68.0f : 86.0f;
    FollowCamera->SetFieldOfView(FMath::FInterpTo(
        FollowCamera->FieldOfView,
        TargetFov,
        DeltaSeconds,
        bAiming ? 18.0f : 12.0f));
}

void AHorizonPlayerCharacter::SetupPlayerInputComponent(UInputComponent* PlayerInputComponent)
{
    check(PlayerInputComponent);
    Super::SetupPlayerInputComponent(PlayerInputComponent);

    PlayerInputComponent->BindAxis(TEXT("MoveForward"), this, &AHorizonPlayerCharacter::MoveForward);
    PlayerInputComponent->BindAxis(TEXT("MoveRight"), this, &AHorizonPlayerCharacter::MoveRight);
    PlayerInputComponent->BindAxis(TEXT("Turn"), this, &APawn::AddControllerYawInput);
    PlayerInputComponent->BindAxis(TEXT("LookUp"), this, &APawn::AddControllerPitchInput);

    PlayerInputComponent->BindAction(TEXT("Jump"), IE_Pressed, this, &ACharacter::Jump);
    PlayerInputComponent->BindAction(TEXT("Jump"), IE_Released, this, &ACharacter::StopJumping);
    PlayerInputComponent->BindAction(TEXT("Sprint"), IE_Pressed, this, &AHorizonPlayerCharacter::StartSprint);
    PlayerInputComponent->BindAction(TEXT("Sprint"), IE_Released, this, &AHorizonPlayerCharacter::StopSprint);
    PlayerInputComponent->BindAction(TEXT("Crouch"), IE_Pressed, this, &AHorizonPlayerCharacter::ToggleCrouch);
    PlayerInputComponent->BindAction(TEXT("Aim"), IE_Pressed, this, &AHorizonPlayerCharacter::StartAim);
    PlayerInputComponent->BindAction(TEXT("Aim"), IE_Released, this, &AHorizonPlayerCharacter::StopAim);
}

void AHorizonPlayerCharacter::MoveForward(float Value)
{
    if (FMath::IsNearlyZero(Value) || !Controller)
    {
        return;
    }

    const FRotator YawRotation(0.0f, Controller->GetControlRotation().Yaw, 0.0f);
    AddMovementInput(FRotationMatrix(YawRotation).GetUnitAxis(EAxis::X), Value);
}

void AHorizonPlayerCharacter::MoveRight(float Value)
{
    if (FMath::IsNearlyZero(Value) || !Controller)
    {
        return;
    }

    const FRotator YawRotation(0.0f, Controller->GetControlRotation().Yaw, 0.0f);
    AddMovementInput(FRotationMatrix(YawRotation).GetUnitAxis(EAxis::Y), Value);
}

void AHorizonPlayerCharacter::StartSprint()
{
    bSprinting = true;
    bAiming = false;
    UnCrouch();
    RefreshMovementProfile();
}

void AHorizonPlayerCharacter::StopSprint()
{
    bSprinting = false;
    RefreshMovementProfile();
}

void AHorizonPlayerCharacter::ToggleCrouch()
{
    if (bIsCrouched)
    {
        UnCrouch();
    }
    else
    {
        bSprinting = false;
        Crouch();
    }

    RefreshMovementProfile();
}

void AHorizonPlayerCharacter::StartAim()
{
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

bool AHorizonPlayerCharacter::EquipWeaponVisual(UStaticMesh* WeaponMesh, FName PreferredSocket)
{
    if (!EquippedWeaponVisual || !WeaponMesh)
    {
        return false;
    }

    EquippedWeaponVisual->SetStaticMesh(WeaponMesh);

    if (!AttachWeaponVisualToBestSocket(PreferredSocket))
    {
        EquippedWeaponVisual->SetVisibility(false, true);
        return false;
    }

    EquippedWeaponVisual->SetVisibility(true, true);
    return true;
}

void AHorizonPlayerCharacter::HolsterWeaponVisual()
{
    if (!EquippedWeaponVisual)
    {
        return;
    }

    EquippedWeaponVisual->SetVisibility(false, true);
    EquippedWeaponVisual->SetStaticMesh(nullptr);
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
    Move->MaxWalkSpeed = bSprinting ? SprintSpeed : WalkSpeed;
    Move->RotationRate.Yaw = FMath::Clamp(InterpSpeed * 48.0f, 480.0f, 860.0f);

    // Hip movement follows travel direction. ADS switches to controller-facing strafe,
    // so the torso/weapon and reticle do not fight the movement rotation.
    const bool bControllerFacing = bAiming && Controller != nullptr;
    bUseControllerRotationYaw = bControllerFacing;
    Move->bOrientRotationToMovement = !bControllerFacing;
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
        if (It->HasTerrain())
        {
            FVector Location = GetActorLocation();
            Location.Z = FMath::Max(Location.Z, 500.0f);
            SetActorLocation(Location, false, nullptr, ETeleportType::TeleportPhysics);
            GetCharacterMovement()->GravityScale = 1.0f;
            bWaitingForStreamedTerrain = false;
            return;
        }
    }
}
