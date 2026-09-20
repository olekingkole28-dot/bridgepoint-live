#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Character.h"
#include "HorizonPlayerCharacter.generated.h"

class UCameraComponent;
class USpringArmComponent;
class UStaticMesh;
class UStaticMeshComponent;
class USkeletalMesh;
class UHorizonWeaponRuntimeComponent;

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
    Sliding,
    Vaulting
};

UENUM(BlueprintType)
enum class EHorizonHitDirection : uint8
{
    Front,
    Right,
    Rear,
    Left
};

USTRUCT(BlueprintType)
struct FHorizonCombatHitFeedback
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadOnly)
    float DamageToArmor = 0.0f;

    UPROPERTY(BlueprintReadOnly)
    float DamageToHealth = 0.0f;

    UPROPERTY(BlueprintReadOnly)
    float HealthRemaining = 0.0f;

    UPROPERTY(BlueprintReadOnly)
    float ArmorRemaining = 0.0f;

    UPROPERTY(BlueprintReadOnly)
    float Severity01 = 0.0f;

    UPROPERTY(BlueprintReadOnly)
    EHorizonHitDirection Direction = EHorizonHitDirection::Front;

    UPROPERTY(BlueprintReadOnly)
    FVector2D CameraImpulse = FVector2D::ZeroVector;

    UPROPERTY(BlueprintReadOnly)
    float ReticleImpulse01 = 0.0f;

    UPROPERTY(BlueprintReadOnly)
    bool bArmorBroken = false;

    UPROPERTY(BlueprintReadOnly)
    bool bHeadshot = false;

    UPROPERTY(BlueprintReadOnly)
    bool bLethal = false;
};

DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(
    FHorizonCombatHitReaction,
    const FHorizonCombatHitFeedback&,
    Feedback);

UCLASS()
class BRIDGEPOINTHORIZON_API AHorizonPlayerCharacter : public ACharacter
{
    GENERATED_BODY()

public:
    AHorizonPlayerCharacter();

    virtual void BeginPlay() override;
    virtual void Tick(float DeltaSeconds) override;
    virtual void SetupPlayerInputComponent(UInputComponent* PlayerInputComponent) override;
    virtual float TakeDamage(
        float DamageAmount,
        struct FDamageEvent const& DamageEvent,
        AController* EventInstigator,
        AActor* DamageCauser) override;

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

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category="Horizon|Weapon")
    TObjectPtr<UHorizonWeaponRuntimeComponent> WeaponRuntime;

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

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Horizon|Combat", meta=(ClampMin="1.0"))
    float MaxHealth = 100.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Horizon|Combat", meta=(ClampMin="0.0"))
    float MaxArmor = 50.0f;

    UPROPERTY(VisibleInstanceOnly, BlueprintReadOnly, Category="Horizon|Combat")
    float CurrentHealth = 100.0f;

    UPROPERTY(VisibleInstanceOnly, BlueprintReadOnly, Category="Horizon|Combat")
    float CurrentArmor = 50.0f;

    UPROPERTY(BlueprintAssignable)
    FHorizonCombatHitReaction OnCombatHitReaction;

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

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Horizon|Movement|Vault", meta=(ClampMin="25.0", ClampMax="90.0"))
    float VaultMinimumHeightCm = 45.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Horizon|Movement|Vault", meta=(ClampMin="80.0", ClampMax="220.0"))
    float VaultMaximumHeightCm = 145.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Horizon|Movement|Vault", meta=(ClampMin="70.0", ClampMax="220.0"))
    float VaultForwardProbeCm = 125.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Horizon|Movement|Vault", meta=(ClampMin="0.20", ClampMax="0.80"))
    float VaultDurationSeconds = 0.38f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Horizon|Movement|Vault", meta=(ClampMin="15.0", ClampMax="100.0"))
    float VaultArcHeightCm = 55.0f;

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

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Horizon|Camera|Lean", meta=(ClampMin="0.0", ClampMax="45.0"))
    float LeanDistanceCm = 24.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Horizon|Camera|Lean", meta=(ClampMin="0.0", ClampMax="18.0"))
    float LeanRollDegrees = 8.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Horizon|Camera|Lean", meta=(ClampMin="1.0", ClampMax="30.0"))
    float LeanInterpolationSpeed = 13.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Horizon|Camera|Lean", meta=(ClampMin="2.0", ClampMax="30.0"))
    float LeanProbeRadiusCm = 10.0f;

    UFUNCTION(BlueprintCallable, BlueprintAuthorityOnly, Category="Horizon|Combat")
    float ApplyCombatHit(
        float RawDamage,
        FVector IncomingDirection,
        bool bHeadshot = false);

    UFUNCTION(BlueprintPure, Category="Horizon|Combat")
    bool IsCombatAlive() const { return CurrentHealth > KINDA_SMALL_NUMBER; }

    static EHorizonHitDirection ResolveHitDirection(
        const FVector& Forward,
        const FVector& Right,
        const FVector& IncomingDirection);

    static FHorizonCombatHitFeedback ResolveCombatHit(
        float RawDamage,
        float CurrentHealthValue,
        float CurrentArmorValue,
        float MaxHealthValue,
        float MaxArmorValue,
        const FVector& Forward,
        const FVector& Right,
        const FVector& IncomingDirection,
        bool bHeadshot);

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

    UFUNCTION(BlueprintPure, Category="Horizon|Movement")
    bool IsVaulting() const { return MovementStance == EHorizonMovementStance::Vaulting; }

    UFUNCTION(BlueprintPure, Category="Horizon|Camera|Lean")
    float GetLeanAlpha() const { return CurrentLeanAlpha; }

    static float ResolveLeanTarget(
        float RawInput,
        EHorizonMovementStance Stance,
        bool bIsSprinting,
        float ObstructionFraction);

    static bool CanStartVault(
        EHorizonMovementStance Stance,
        bool bMovingOnGround,
        bool bIsAiming,
        float ForwardInput,
        float ObstacleHeightCm,
        bool bLandingClear,
        float MinimumHeightCm = 45.0f,
        float MaximumHeightCm = 145.0f);

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
    float VaultElapsedSeconds = 0.0f;
    float ActiveVaultDurationSeconds = 0.0f;
    float VaultObstacleHeightCm = 0.0f;
    FVector VaultStartLocation = FVector::ZeroVector;
    FVector VaultTargetLocation = FVector::ZeroVector;

    UPROPERTY()
    EHorizonMovementStance MovementStance = EHorizonMovementStance::Standing;

    UPROPERTY()
    EHorizonCameraMode CameraMode = EHorizonCameraMode::ThirdPerson;

    void StartTraversalJump();
    bool TryStartVault();
    void UpdateVault(float DeltaSeconds);
    void EndVault(bool bCompleted);
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
    void StartFireInput();
    void StopFireInput();
    void ReloadInput();
    void RefreshMovementProfile();
    void TryEnableWorldGravity(float DeltaSeconds);
    bool AttachWeaponVisualToBestSocket(FName PreferredSocket);
    bool AttachFirstPersonWeaponToBestSocket(FName PreferredSocket);
    void RefreshFirstPersonVisualState();
};
