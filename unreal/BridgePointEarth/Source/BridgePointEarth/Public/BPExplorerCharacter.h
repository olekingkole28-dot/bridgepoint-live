#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Character.h"
#include "InputActionValue.h"
#include "BPExplorerCharacter.generated.h"

class UCameraComponent;
class UInputAction;
class UInputMappingContext;
class UBPExplorerMovementComponent;
class UBPWeaponComponent;
class UBPInventoryComponent;
class UBPModularCharacterComponent;

UCLASS(Blueprintable)
class BRIDGEPOINTEARTH_API ABPExplorerCharacter : public ACharacter
{
    GENERATED_BODY()

public:
    ABPExplorerCharacter(const FObjectInitializer& ObjectInitializer);

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category="BridgePoint|Character")
    TObjectPtr<UCameraComponent> FirstPersonCamera;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category="BridgePoint|Character")
    TObjectPtr<UBPWeaponComponent> Weapon;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category="BridgePoint|Character")
    TObjectPtr<UBPInventoryComponent> Inventory;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category="BridgePoint|Character")
    TObjectPtr<UBPModularCharacterComponent> ModularCharacter;

    UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category="BridgePoint|Input")
    TObjectPtr<UInputMappingContext> DefaultMappingContext;

    UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category="BridgePoint|Input")
    TObjectPtr<UInputAction> MoveAction;

    UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category="BridgePoint|Input")
    TObjectPtr<UInputAction> LookAction;

    UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category="BridgePoint|Input")
    TObjectPtr<UInputAction> JumpAction;

    UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category="BridgePoint|Input")
    TObjectPtr<UInputAction> SprintAction;

    UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category="BridgePoint|Input")
    TObjectPtr<UInputAction> CrouchAction;

    UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category="BridgePoint|Input")
    TObjectPtr<UInputAction> ProneAction;

    UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category="BridgePoint|Input")
    TObjectPtr<UInputAction> FireAction;

    UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category="BridgePoint|Input")
    TObjectPtr<UInputAction> ReloadAction;

    UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category="BridgePoint|Input")
    TObjectPtr<UInputAction> AimAction;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="BridgePoint|Character|Camera")
    float StandingCameraHeight = 64.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="BridgePoint|Character|Camera")
    float CrouchedCameraHeight = 42.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="BridgePoint|Character|Camera")
    float ProneCameraHeight = 24.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="BridgePoint|Character|Camera")
    float CameraTransitionSpeed = 9.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="BridgePoint|Character|Camera")
    float MaximumCameraLeanRoll = 5.0f;

    virtual void BeginPlay() override;
    virtual void Tick(float DeltaSeconds) override;
    virtual void SetupPlayerInputComponent(UInputComponent* PlayerInputComponent) override;

    UFUNCTION(BlueprintCallable, Category="BridgePoint|Locomotion") void SetSprint(bool bEnabled);
    UFUNCTION(BlueprintCallable, Category="BridgePoint|Locomotion") void ToggleCrouch();
    UFUNCTION(BlueprintCallable, Category="BridgePoint|Locomotion") void ToggleProne();

private:
    float TargetCameraHeight = 64.0f;
    float PreviousControlYaw = 0.0f;

    UBPExplorerMovementComponent* GetBridgePointMovement() const;
    void HandleMove(const FInputActionValue& Value);
    void HandleLook(const FInputActionValue& Value);
    void HandleJumpStarted();
    void HandleJumpEnded();
    void HandleSprintStarted();
    void HandleSprintEnded();
    void HandleCrouch();
    void HandleProne();
    void HandleFire();
    void HandleReload();
    void HandleAimStarted();
    void HandleAimEnded();
    void UpdateCameraStance(float DeltaSeconds);
};