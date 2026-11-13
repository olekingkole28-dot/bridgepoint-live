#include "BPExplorerCharacter.h"
#include "BPExplorerMovementComponent.h"
#include "BPWeaponComponent.h"
#include "BPInventoryComponent.h"
#include "BPModularCharacterComponent.h"
#include "Camera/CameraComponent.h"
#include "Components/CapsuleComponent.h"
#include "EnhancedInputComponent.h"
#include "EnhancedInputSubsystems.h"
#include "InputMappingContext.h"
#include "InputAction.h"
#include "GameFramework/PlayerController.h"
#include "GameFramework/PlayerState.h"
#include "Engine/LocalPlayer.h"

ABPExplorerCharacter::ABPExplorerCharacter(const FObjectInitializer& ObjectInitializer)
    : Super(ObjectInitializer.SetDefaultSubobjectClass<UBPExplorerMovementComponent>(ACharacter::CharacterMovementComponentName))
{
    FirstPersonCamera=CreateDefaultSubobject<UCameraComponent>(TEXT("FirstPersonCamera"));
    FirstPersonCamera->SetupAttachment(GetCapsuleComponent());
    FirstPersonCamera->SetRelativeLocation(FVector(0.0,0.0,StandingCameraHeight));
    FirstPersonCamera->bUsePawnControlRotation=true;
    FirstPersonCamera->FieldOfView=90.0f;

    Weapon=CreateDefaultSubobject<UBPWeaponComponent>(TEXT("Weapon"));
    Inventory=CreateDefaultSubobject<UBPInventoryComponent>(TEXT("Inventory"));
    ModularCharacter=CreateDefaultSubobject<UBPModularCharacterComponent>(TEXT("ModularCharacter"));
    Weapon->AimCamera=FirstPersonCamera;

    bUseControllerRotationYaw=true;
    GetCharacterMovement()->bOrientRotationToMovement=false;
    GetMesh()->SetOwnerNoSee(true);
}

void ABPExplorerCharacter::BeginPlay()
{
    Super::BeginPlay();
    TargetCameraHeight=StandingCameraHeight;
    if (APlayerController* PC=Cast<APlayerController>(GetController()))
    {
        if (ULocalPlayer* LocalPlayer=PC->GetLocalPlayer())
        {
            if (UEnhancedInputLocalPlayerSubsystem* Subsystem=LocalPlayer->GetSubsystem<UEnhancedInputLocalPlayerSubsystem>())
                if (DefaultMappingContext) Subsystem->AddMappingContext(DefaultMappingContext,0);
        }
    }
    if (Inventory) Inventory->SetBackpackCapacity(Inventory->BackpackCapacityKg,Inventory->BackpackSlotCapacity);
    PreviousControlYaw=GetControlRotation().Yaw;
}

UBPExplorerMovementComponent* ABPExplorerCharacter::GetBridgePointMovement() const
{
    return Cast<UBPExplorerMovementComponent>(GetCharacterMovement());
}

void ABPExplorerCharacter::SetupPlayerInputComponent(UInputComponent* PlayerInputComponent)
{
    Super::SetupPlayerInputComponent(PlayerInputComponent);
    UEnhancedInputComponent* Enhanced=Cast<UEnhancedInputComponent>(PlayerInputComponent);
    if (!Enhanced) return;

    if (MoveAction) Enhanced->BindAction(MoveAction,ETriggerEvent::Triggered,this,&ABPExplorerCharacter::HandleMove);
    if (LookAction) Enhanced->BindAction(LookAction,ETriggerEvent::Triggered,this,&ABPExplorerCharacter::HandleLook);
    if (JumpAction)
    {
        Enhanced->BindAction(JumpAction,ETriggerEvent::Started,this,&ABPExplorerCharacter::HandleJumpStarted);
        Enhanced->BindAction(JumpAction,ETriggerEvent::Completed,this,&ABPExplorerCharacter::HandleJumpEnded);
    }
    if (SprintAction)
    {
        Enhanced->BindAction(SprintAction,ETriggerEvent::Started,this,&ABPExplorerCharacter::HandleSprintStarted);
        Enhanced->BindAction(SprintAction,ETriggerEvent::Completed,this,&ABPExplorerCharacter::HandleSprintEnded);
        Enhanced->BindAction(SprintAction,ETriggerEvent::Canceled,this,&ABPExplorerCharacter::HandleSprintEnded);
    }
    if (CrouchAction) Enhanced->BindAction(CrouchAction,ETriggerEvent::Started,this,&ABPExplorerCharacter::HandleCrouch);
    if (ProneAction) Enhanced->BindAction(ProneAction,ETriggerEvent::Started,this,&ABPExplorerCharacter::HandleProne);
    if (FireAction) Enhanced->BindAction(FireAction,ETriggerEvent::Started,this,&ABPExplorerCharacter::HandleFire);
    if (ReloadAction) Enhanced->BindAction(ReloadAction,ETriggerEvent::Started,this,&ABPExplorerCharacter::HandleReload);
    if (AimAction)
    {
        Enhanced->BindAction(AimAction,ETriggerEvent::Started,this,&ABPExplorerCharacter::HandleAimStarted);
        Enhanced->BindAction(AimAction,ETriggerEvent::Completed,this,&ABPExplorerCharacter::HandleAimEnded);
        Enhanced->BindAction(AimAction,ETriggerEvent::Canceled,this,&ABPExplorerCharacter::HandleAimEnded);
    }
}

void ABPExplorerCharacter::HandleMove(const FInputActionValue& Value)
{
    const FVector2D Input=Value.Get<FVector2D>();
    AddMovementInput(GetActorForwardVector(),Input.Y);
    AddMovementInput(GetActorRightVector(),Input.X);
}

void ABPExplorerCharacter::HandleLook(const FInputActionValue& Value)
{
    const FVector2D Input=Value.Get<FVector2D>();
    AddControllerYawInput(Input.X);
    AddControllerPitchInput(Input.Y);
    if (Weapon) Weapon->AddLookInput(Input);
}

void ABPExplorerCharacter::HandleJumpStarted() { Jump(); }
void ABPExplorerCharacter::HandleJumpEnded() { StopJumping(); }
void ABPExplorerCharacter::HandleSprintStarted() { SetSprint(true); }
void ABPExplorerCharacter::HandleSprintEnded() { SetSprint(false); }
void ABPExplorerCharacter::HandleCrouch() { ToggleCrouch(); }
void ABPExplorerCharacter::HandleProne() { ToggleProne(); }
void ABPExplorerCharacter::HandleFire() { if (Weapon) Weapon->Fire(); }
void ABPExplorerCharacter::HandleReload() { if (Weapon) Weapon->Reload(); }
void ABPExplorerCharacter::HandleAimStarted() { if (Weapon) Weapon->SetAiming(true); }
void ABPExplorerCharacter::HandleAimEnded() { if (Weapon) Weapon->SetAiming(false); }

void ABPExplorerCharacter::SetSprint(bool bEnabled)
{
    if (UBPExplorerMovementComponent* Movement=GetBridgePointMovement())
        Movement->SetSprinting(bEnabled);
}

void ABPExplorerCharacter::ToggleCrouch()
{
    if (UBPExplorerMovementComponent* Movement=GetBridgePointMovement())
    {
        const bool bCrouched=Movement->Stance==EBPStance::Crouching;
        Movement->SetCrouching(!bCrouched);
    }
}

void ABPExplorerCharacter::ToggleProne()
{
    if (UBPExplorerMovementComponent* Movement=GetBridgePointMovement())
    {
        const bool bProne=Movement->Stance==EBPStance::Prone;
        Movement->SetProne(!bProne);
    }
}

void ABPExplorerCharacter::UpdateCameraStance(float DeltaSeconds)
{
    if (UBPExplorerMovementComponent* Movement=GetBridgePointMovement())
    {
        TargetCameraHeight=Movement->Stance==EBPStance::Prone?ProneCameraHeight:
            (Movement->Stance==EBPStance::Crouching?CrouchedCameraHeight:StandingCameraHeight);
    }
    FVector Location=FirstPersonCamera->GetRelativeLocation();
    Location.Z=FMath::FInterpTo(Location.Z,TargetCameraHeight,DeltaSeconds,CameraTransitionSpeed);
    FirstPersonCamera->SetRelativeLocation(Location);

    const float CurrentYaw=GetControlRotation().Yaw;
    const float YawDelta=FMath::FindDeltaAngleDegrees(PreviousControlYaw,CurrentYaw);
    PreviousControlYaw=CurrentYaw;
    const float RollTarget=FMath::Clamp(-YawDelta/FMath::Max(DeltaSeconds,0.001f)*0.035f,
                                        -MaximumCameraLeanRoll,MaximumCameraLeanRoll);
    FRotator Rotation=FirstPersonCamera->GetRelativeRotation();
    Rotation.Roll=FMath::FInterpTo(Rotation.Roll,RollTarget,DeltaSeconds,7.0f);
    FirstPersonCamera->SetRelativeRotation(Rotation);
}

void ABPExplorerCharacter::Tick(float DeltaSeconds)
{
    Super::Tick(DeltaSeconds);
    UpdateCameraStance(DeltaSeconds);
    if (Weapon)
    {
        if (UBPExplorerMovementComponent* Movement=GetBridgePointMovement())
        {
            Weapon->SetLocomotionState(
                Movement->bSprinting,
                Movement->Stance==EBPStance::Crouching,
                Movement->Stance==EBPStance::Prone);
        }
    }
}