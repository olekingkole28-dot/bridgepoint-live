#pragma once

#include "CoreMinimal.h"
#include "Subsystems/WorldSubsystem.h"
#include "BPEnvironmentManagerSubsystem.generated.h"

class ACharacter;
class UAudioComponent;
class UCurveFloat;

UENUM(BlueprintType)
enum class EBPEnvironment : uint8
{
    Earth,
    Moon
};

DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FBPEnvironmentChanged, EBPEnvironment, NewEnvironment, float, AmbientAttenuation);

UCLASS()
class BRIDGEPOINTEARTH_API UBPEnvironmentManagerSubsystem : public UWorldSubsystem
{
    GENERATED_BODY()

public:
    UPROPERTY(BlueprintAssignable, Category="BridgePoint|Environment")
    FBPEnvironmentChanged OnEnvironmentChanged;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="BridgePoint|Environment")
    float EarthGravityCmPerSecondSquared = -980.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="BridgePoint|Environment")
    float LunarGravityCmPerSecondSquared = -162.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="BridgePoint|Environment")
    float EarthJumpVelocityCmPerSecond = 420.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="BridgePoint|Environment")
    float LunarJumpVelocityScale = 1.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="BridgePoint|Environment")
    float LunarAmbientVolumeMultiplier = 0.18f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="BridgePoint|Environment")
    float LunarMetaSoundDamping = 0.82f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="BridgePoint|Environment")
    TObjectPtr<UCurveFloat> LunarJumpVelocityCurve;

    UFUNCTION(BlueprintCallable, Category="BridgePoint|Environment")
    void SetEnvironment(EBPEnvironment Environment, ACharacter* Character);

    UFUNCTION(BlueprintCallable, Category="BridgePoint|Environment")
    void RegisterEnvironmentalAudio(UAudioComponent* AudioComponent);

    UFUNCTION(BlueprintCallable, Category="BridgePoint|Environment")
    void UnregisterEnvironmentalAudio(UAudioComponent* AudioComponent);

    UFUNCTION(BlueprintPure, Category="BridgePoint|Environment")
    EBPEnvironment GetEnvironment() const { return CurrentEnvironment; }

private:
    EBPEnvironment CurrentEnvironment = EBPEnvironment::Earth;
    TArray<TWeakObjectPtr<UAudioComponent>> EnvironmentalAudio;
    TWeakObjectPtr<ACharacter> ActiveCharacter;
    float SavedGravity = -980.0f;
    float SavedJumpVelocity = 420.0f;
    float SavedGravityScale = 1.0f;
    bool bCapturedEarthState = false;

    void ApplyAudioEnvironment();
};