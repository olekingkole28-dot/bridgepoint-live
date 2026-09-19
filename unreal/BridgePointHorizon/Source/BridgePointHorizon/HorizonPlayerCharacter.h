#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Character.h"
#include "HorizonPlayerCharacter.generated.h"

class UCameraComponent;
class USpringArmComponent;
class UStaticMesh;
class UStaticMeshComponent;
class USkeletalMesh;

UENUM(BlueprintType)
enum class EHorizonCameraMode : uint8
{
    FirstPerson,
    ThirdPerson
};

UENUM(BlueprintType)
enum class EHorizonMovementStance : uint8
{
    Standing,
    Crouched,
    Prone,
    Sliding
};

UCLASS()
class BRIDGEPOINTHORIZON_API AHorizonPlayerCharacter : public ACharacter
{
    GENERATED_BODY()

public:
    AHorizonPlayerCharacter();

    virtual void BeginPlay() override;
    virtual void Tick(float DeltaSeconds) override;
    virtual void SetupPlayerInputComponent(UInputComponent* PlayerInputComponent) override;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category="Horizon|Camera")
    TObjectPtr<USpringArmComponent> CameraBoom;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category="Horizon|Camera")
    TObjectPtr<UCameraComponent> FollowCamera;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category="Horizon|Weapon")
    TObjectPtr<UStaticMeshComponent> EquippedWeaponVisual;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category="Horizon|Camera")
    TObjectPtr<USkeletalMeshComponent> FirstPersonArms;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category="Horizon|Weapon")
    TObjectPtr<UStaticMeshComponent> FirstPersonWeaponVisual;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Horizon|Weapon")
    FName WeaponHandSocketName = TEXT("hand_r");

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Horizon|Weapon")
    FTransform WeaponGripOffset = FTransform::Identity;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Horizon|Weapon")
    FName FirstPersonWeaponSocketName = TEXT("hand_r");

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Horizon|Weapon")
    FTransform FirstPersonWeaponGripOffset = FTransform::Identity;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Horizon|Camera")
    FTransform FirstPersonArmsOffset = FTransform(
        FRotator::ZeroRotator,
        FVector(18.0f, 0.0f, -18.0f),
        FVector::OneVector);

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Horizon|Movement")
    float WalkSpeed = 430.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Horizon|Movement")
    float SprintSpeed = 690.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Horizon|Movement")
    float ProneSpeed = 118.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Horizon|Movement")
    float SlideEntrySpeed = 760.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Horizon|Movement")
    float SlideDurationSeconds = 0.85f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Horizon|Movement")
    float SlideBrakingDeceleration = 620.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Horizon|Movement")
    float ProneCapsuleHalfHeight = 34.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Horizon|Movement")
    float ProneCapsuleRadius = 30.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Horizon|Camera")
    float ThirdPersonArmLength = 330.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Horizon|Camera")
    float AimArmLength = 185.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Horizon|Camera")
    float FirstPersonFieldOfView = 82.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Horizon|Camera")
    float ThirdPersonFieldOfView = 86.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Horizon|Movement")
    float FacingInterpolationSpeed = 24.0f;

    UFUNCTION(BlueprintCallable, Category="Horizon|Weapon")
    bool EquipWeaponVisual(UStaticMesh* WeaponMesh, FName PreferredSocket = NAME_None);

    UFUNCTION(BlueprintCallable, Category="Horizon|Weapon")
    void HolsterWeaponVisual();

    UFUNCTION(BlueprintCallable, Category="Horizon|Camera")
    bool SetFirstPersonArmsMesh(USkeletalMesh* ArmsMesh);

    UFUNCTION(BlueprintPure, Category="Horizon|Camera")
    bool HasFirstPersonArms() const;

    UFUNCTION(BlueprintPure, Category="Horizon|Weapon")
    bool IsWeaponVisualEquipped() const;

    UFUNCTION(BlueprintCallable, Category="Horizon|Camera")
    void SetCameraMode(EHorizonCameraMode NewMode);

    UFUNCTION(BlueprintCallable, Category="Horizon|Camera")
    void ToggleCameraMode();

    UFUNCTION(BlueprintPure, Category="Horizon|Camera")
    EHorizonCameraMode GetCameraMode() const { return CameraMode; }

    UFUNCTION(BlueprintPure, Category="Horizon|Movement")
    EHorizonMovementStance GetMovementStance() const { return MovementStance; }

    UFUNCTION(BlueprintPure, Category="Horizon|Movement")
    bool IsSliding() const { return MovementStance == EHorizonMovementStance::Sliding; }

    UFUNCTION(BlueprintPure, Category="Horizon|Movement")
    bool IsProne() const { return MovementStance == EHorizonMovementStance::Prone; }

    UFUNCTION(BlueprintPure, Category="Horizon|Camera|Lean")
    float GetLeanAlpha() const { return CurrentLeanAlpha; }

    static float ResolveLeanTarget(
        float RawInput,
        EHorizonMovementStance Stance,
        bool bIsSprinting,
        float ObstructionFraction);

private:
    bool bSprinting = false;
    bool bAiming = false;
    bool bWaitingForStreamedTerrain = true;
    float TerrainProbeAccumulator = 0.0f;
    float StandingCapsuleHalfHeight = 0.0f;
    float StandingCapsuleRadius = 0.0f;
    float SlideTimeRemaining = 0.0f;
    FVector SlideDirection = FVector::ForwardVector;
    FVector2D CachedMoveInput = FVector2D::ZeroVector;
    float RawLeanInput = 0.0f;
    float CurrentLeanAlpha = 0.0f;

    UPROPERTY()
    EHorizonMovementStance MovementStance = EHorizonMovementStance::Standing;

    UPROPERTY()
    EHorizonCameraMode CameraMode = EHorizonCameraMode::ThirdPerson;

    void StartTraversalJump();
    void MoveForward(float Value);
    void MoveRight(float Value);
    void ApplyMovementInput(float DeltaSeconds);
    void SetLeanInput(float Value);
    void UpdateLean(float DeltaSeconds);
    float ProbeLeanObstruction(float LeanDirection) const;
    void UpdateCameraPresentation(float DeltaSeconds);
    void StartSprint();
    void StopSprint();
    void ToggleCrouch();
    void ToggleProne();
    void StartSlide();
    void UpdateTraversalState(float DeltaSeconds);
    void EndSlide();
    bool TryExitProne();
    bool HasStandingClearance() const;
    void StartAim();
    void StopAim();
    void RefreshMovementProfile();
    void TryEnableWorldGravity(float DeltaSeconds);
    bool AttachWeaponVisualToBestSocket(FName PreferredSocket);
    bool AttachFirstPersonWeaponToBestSocket(FName PreferredSocket);
    void RefreshFirstPersonVisualState();
};
