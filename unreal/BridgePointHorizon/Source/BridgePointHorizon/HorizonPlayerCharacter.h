#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Character.h"
#include "HorizonPlayerCharacter.generated.h"

class UCameraComponent;
class USpringArmComponent;

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

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Horizon|Movement")
    float WalkSpeed = 430.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Horizon|Movement")
    float SprintSpeed = 690.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Horizon|Camera")
    float ThirdPersonArmLength = 330.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Horizon|Camera")
    float AimArmLength = 185.0f;

private:
    bool bSprinting = false;
    bool bAiming = false;
    bool bWaitingForStreamedTerrain = true;
    float TerrainProbeAccumulator = 0.0f;

    void MoveForward(float Value);
    void MoveRight(float Value);
    void StartSprint();
    void StopSprint();
    void ToggleCrouch();
    void StartAim();
    void StopAim();
    void RefreshMovementProfile();
    void TryEnableWorldGravity(float DeltaSeconds);
};
