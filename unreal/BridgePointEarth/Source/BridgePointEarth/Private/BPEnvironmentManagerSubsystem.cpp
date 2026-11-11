#include "BPEnvironmentManagerSubsystem.h"
#include "GameFramework/WorldSettings.h"
#include "GameFramework/Character.h"
#include "GameFramework/CharacterMovementComponent.h"
#include "Components/AudioComponent.h"
#include "Curves/CurveFloat.h"

void UBPEnvironmentManagerSubsystem::SetEnvironment(EBPEnvironment Environment, ACharacter* Character)
{
    UWorld* World = GetWorld();
    if (!World || !World->GetWorldSettings()) return;
    if (Character) ActiveCharacter = Character;

    ACharacter* TargetCharacter = ActiveCharacter.Get();
    UCharacterMovementComponent* Movement = TargetCharacter ? TargetCharacter->GetCharacterMovement() : nullptr;

    if (!bCapturedEarthState)
    {
        SavedGravity = World->GetWorldSettings()->GetGravityZ();
        if (Movement)
        {
            SavedJumpVelocity = Movement->JumpZVelocity;
            SavedGravityScale = Movement->GravityScale;
        }
        bCapturedEarthState = true;
    }

    CurrentEnvironment = Environment;
    const bool bMoon = Environment == EBPEnvironment::Moon;
    World->GetWorldSettings()->DefaultGravityZ = bMoon ? LunarGravityCmPerSecondSquared : EarthGravityCmPerSecondSquared;

    if (Movement)
    {
        Movement->GravityScale = 1.0f;
        if (bMoon)
        {
            const float CurveScale = LunarJumpVelocityCurve ? LunarJumpVelocityCurve->GetFloatValue(0.1653f) : LunarJumpVelocityScale;
            Movement->JumpZVelocity = EarthJumpVelocityCmPerSecond * FMath::Max(0.1f, CurveScale);
        }
        else
        {
            Movement->JumpZVelocity = EarthJumpVelocityCmPerSecond;
        }
        Movement->ResetJumpState();
    }
    ApplyAudioEnvironment();
    OnEnvironmentChanged.Broadcast(CurrentEnvironment, bMoon ? LunarMetaSoundDamping : 0.0f);
}

void UBPEnvironmentManagerSubsystem::RegisterEnvironmentalAudio(UAudioComponent* AudioComponent)
{
    if (AudioComponent && !EnvironmentalAudio.Contains(AudioComponent))
        EnvironmentalAudio.Add(AudioComponent);
    ApplyAudioEnvironment();
}

void UBPEnvironmentManagerSubsystem::UnregisterEnvironmentalAudio(UAudioComponent* AudioComponent)
{
    EnvironmentalAudio.Remove(AudioComponent);
}

void UBPEnvironmentManagerSubsystem::ApplyAudioEnvironment()
{
    const bool bMoon = CurrentEnvironment == EBPEnvironment::Moon;
    for (int32 I = EnvironmentalAudio.Num() - 1; I >= 0; --I)
    {
        UAudioComponent* Audio = EnvironmentalAudio[I].Get();
        if (!Audio) { EnvironmentalAudio.RemoveAtSwap(I); continue; }
        Audio->SetVolumeMultiplier(bMoon ? LunarAmbientVolumeMultiplier : 1.0f);
        // MetaSounds can expose these named parameters to blend exterior ambience down.
        // Suit/intercom audio should not be registered here.
        Audio->SetFloatParameter(TEXT("VacuumDamping"), bMoon ? LunarMetaSoundDamping : 0.0f);
        Audio->SetFloatParameter(TEXT("AmbientAirGain"), bMoon ? LunarAmbientVolumeMultiplier : 1.0f);
    }
}