#pragma once

#include "CoreMinimal.h"
#include "GameFramework/CharacterMovementComponent.h"
#include "BPExplorerMovementComponent.generated.h"

UENUM(BlueprintType)
enum class EBPStance : uint8
{
    Standing,
    Crouching,
    Prone
};

UCLASS(ClassGroup=(BridgePoint), meta=(BlueprintSpawnableComponent))
class BRIDGEPOINTEARTH_API UBPExplorerMovementComponent : public UCharacterMovementComponent
{
    GENERATED_BODY()

public:
    UBPExplorerMovementComponent();

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="BridgePoint|Locomotion")
    float JogSpeed = 480.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="BridgePoint|Locomotion")
    float SprintSpeed = 720.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="BridgePoint|Locomotion")
    float CrouchSpeed = 220.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="BridgePoint|Locomotion")
    float ProneSpeed = 100.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="BridgePoint|Locomotion")
    float StandingCapsuleHalfHeight = 96.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="BridgePoint|Locomotion")
    float CrouchedCapsuleHalfHeight = 58.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="BridgePoint|Locomotion")
    float ProneCapsuleHalfHeight = 34.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="BridgePoint|Locomotion")
    float StanceTransitionSpeed = 8.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="BridgePoint|Stamina")
    float MaximumStamina = 100.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="BridgePoint|Stamina")
    float SprintStaminaDrainPerSecond = 14.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="BridgePoint|Stamina")
    float StaminaRegenerationPerSecond = 10.0f;

    UPROPERTY(BlueprintReadOnly, Category="BridgePoint|Stamina")
    float Stamina = 100.0f;

    UPROPERTY(BlueprintReadOnly, Category="BridgePoint|Locomotion")
    EBPStance Stance = EBPStance::Standing;

    UPROPERTY(BlueprintReadOnly, Category="BridgePoint|Locomotion")
    bool bSprinting = false;

    UFUNCTION(BlueprintCallable, Category="BridgePoint|Locomotion")
    void SetSprinting(bool bEnabled);

    UFUNCTION(BlueprintCallable, Category="BridgePoint|Locomotion")
    void SetCrouching(bool bEnabled);

    UFUNCTION(BlueprintCallable, Category="BridgePoint|Locomotion")
    void SetProne(bool bEnabled);

    UFUNCTION(BlueprintCallable, Category="BridgePoint|Inventory")
    void SetCarryWeight(float WeightKg, float CapacityKg);

    UFUNCTION(BlueprintPure, Category="BridgePoint|Stamina")
    float GetStaminaRatio() const;

    virtual void BeginPlay() override;
    virtual void TickComponent(float DeltaTime, ELevelTick TickType, FActorComponentTickFunction* ThisTickFunction) override;

private:
    float CarryWeightKg = 0.0f;
    float CarryCapacityKg = 30.0f;
    float TargetCapsuleHalfHeight = 96.0f;
    float BaseBrakingDeceleration = 2048.0f;
    float BaseBrakingFrictionFactor = 1.0f;

    void RefreshMovementTuning();
    void ApplyStanceCapsule(float DeltaTime);
};