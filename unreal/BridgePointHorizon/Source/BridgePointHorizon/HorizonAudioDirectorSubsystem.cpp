#include "HorizonAudioDirectorSubsystem.h"

#include "Containers/Ticker.h"
#include "Engine/GameInstance.h"
#include "HorizonAutopilotSubsystem.h"

void UHorizonAudioDirectorSubsystem::Initialize(FSubsystemCollectionBase& Collection)
{
    Super::Initialize(Collection);
    AcousticSpace = EHorizonAcousticSpace::Outdoor;
    ThreatState = EHorizonThreatState::Calm;
    WeatherState = EHorizonWeatherAudioState::Clear;
    Occlusion01 = 0.0f;
    HordePressure01 = 0.0f;
    DesiredCombatIntensity01 = 0.0f;
    SmoothedCombatIntensity01 = 0.0f;
    CombatReleaseHoldSeconds = 0.0f;
    TransientDuck01 = 0.0f;
    StingerCooldownSeconds = 0.0f;
    PendingStinger = EHorizonSensoryStinger::None;

    CombatTickerHandle = FTSTicker::GetCoreTicker().AddTicker(
        FTickerDelegate::CreateUObject(this, &UHorizonAudioDirectorSubsystem::TickCombatMix),
        0.05f);
}

void UHorizonAudioDirectorSubsystem::Deinitialize()
{
    if (CombatTickerHandle.IsValid())
    {
        FTSTicker::GetCoreTicker().RemoveTicker(CombatTickerHandle);
        CombatTickerHandle.Reset();
    }

    Super::Deinitialize();
}

void UHorizonAudioDirectorSubsystem::SetAcousticSpace(EHorizonAcousticSpace NewSpace)
{
    if (AcousticSpace != NewSpace)
    {
        AcousticSpace = NewSpace;
        OnAudioStateChanged.Broadcast();
    }
}

float UHorizonAudioDirectorSubsystem::ThreatToIntensity(EHorizonThreatState Threat) const
{
    switch (Threat)
    {
        case EHorizonThreatState::Calm: return 0.04f;
        case EHorizonThreatState::Alert: return 0.28f;
        case EHorizonThreatState::Chase: return 0.62f;
        case EHorizonThreatState::Horde: return 0.84f;
        case EHorizonThreatState::Boss: return 1.0f;
    }

    return 0.0f;
}

void UHorizonAudioDirectorSubsystem::SetThreatState(EHorizonThreatState NewThreat)
{
    if (ThreatState != NewThreat)
    {
        const float PreviousTarget = DesiredCombatIntensity01;
        ThreatState = NewThreat;
        DesiredCombatIntensity01 = FMath::Max(ThreatToIntensity(NewThreat), HordePressure01 * 0.88f);

        if (DesiredCombatIntensity01 > PreviousTarget + 0.08f)
        {
            CombatReleaseHoldSeconds = 1.75f;
            QueueStinger(EHorizonSensoryStinger::ThreatRise);
        }

        OnAudioStateChanged.Broadcast();
    }
}

void UHorizonAudioDirectorSubsystem::SetWeatherState(EHorizonWeatherAudioState NewWeather)
{
    if (WeatherState != NewWeather)
    {
        WeatherState = NewWeather;
        OnAudioStateChanged.Broadcast();
    }
}

void UHorizonAudioDirectorSubsystem::SetOcclusion01(float NewOcclusion)
{
    const float Clamped = FMath::Clamp(NewOcclusion, 0.0f, 1.0f);
    if (!FMath::IsNearlyEqual(Occlusion01, Clamped, 0.01f))
    {
        Occlusion01 = Clamped;
        OnAudioStateChanged.Broadcast();
    }
}

void UHorizonAudioDirectorSubsystem::SetHordePressure01(float NewPressure)
{
    const float Clamped = FMath::Clamp(NewPressure, 0.0f, 1.0f);
    if (!FMath::IsNearlyEqual(HordePressure01, Clamped, 0.01f))
    {
        const bool bCrossedSurgeThreshold = HordePressure01 < 0.72f && Clamped >= 0.72f;
        HordePressure01 = Clamped;
        DesiredCombatIntensity01 = FMath::Max(ThreatToIntensity(ThreatState), HordePressure01 * 0.88f);

        if (bCrossedSurgeThreshold)
        {
            CombatReleaseHoldSeconds = 2.25f;
            QueueStinger(EHorizonSensoryStinger::HordeSurge);
        }

        OnAudioStateChanged.Broadcast();
    }
}

void UHorizonAudioDirectorSubsystem::PushPlayerHitFeedback(float Damage01)
{
    const float Damage = FMath::Clamp(Damage01, 0.0f, 1.0f);
    if (Damage <= KINDA_SMALL_NUMBER)
    {
        return;
    }

    TransientDuck01 = FMath::Max(TransientDuck01, FMath::Lerp(0.18f, 0.62f, Damage));
    DesiredCombatIntensity01 = FMath::Max(DesiredCombatIntensity01, FMath::Lerp(0.42f, 0.82f, Damage));
    CombatReleaseHoldSeconds = FMath::Max(CombatReleaseHoldSeconds, 1.1f);
    QueueStinger(EHorizonSensoryStinger::PlayerHit);
    OnAudioStateChanged.Broadcast();
}

EHorizonSensoryStinger UHorizonAudioDirectorSubsystem::ConsumePendingStinger()
{
    const EHorizonSensoryStinger Result = PendingStinger;
    PendingStinger = EHorizonSensoryStinger::None;
    return Result;
}

void UHorizonAudioDirectorSubsystem::QueueStinger(EHorizonSensoryStinger Stinger)
{
    if (Stinger == EHorizonSensoryStinger::PlayerHit || StingerCooldownSeconds <= 0.0f)
    {
        PendingStinger = Stinger;
        StingerCooldownSeconds = Stinger == EHorizonSensoryStinger::PlayerHit ? 0.35f : 1.25f;
    }
}

bool UHorizonAudioDirectorSubsystem::TickCombatMix(float DeltaSeconds)
{
    const float Step = FMath::Clamp(DeltaSeconds, 0.0f, 0.1f);
    StingerCooldownSeconds = FMath::Max(0.0f, StingerCooldownSeconds - Step);
    TransientDuck01 = FMath::FInterpTo(TransientDuck01, 0.0f, Step, 3.8f);

    float EffectiveTarget = DesiredCombatIntensity01;
    if (EffectiveTarget < SmoothedCombatIntensity01 && CombatReleaseHoldSeconds > 0.0f)
    {
        CombatReleaseHoldSeconds = FMath::Max(0.0f, CombatReleaseHoldSeconds - Step);
        EffectiveTarget = SmoothedCombatIntensity01;
    }

    const float InterpSpeed = EffectiveTarget >= SmoothedCombatIntensity01 ? 7.5f : 1.25f;
    const float Previous = SmoothedCombatIntensity01;
    SmoothedCombatIntensity01 = FMath::FInterpTo(
        SmoothedCombatIntensity01,
        EffectiveTarget,
        Step,
        InterpSpeed);

    if (!FMath::IsNearlyEqual(Previous, SmoothedCombatIntensity01, 0.005f))
    {
        OnAudioStateChanged.Broadcast();
    }

    return true;
}

FHorizonSpatialCueMix UHorizonAudioDirectorSubsystem::GetSpatialCueMix(
    EHorizonSpatialCueClass CueClass,
    float DistanceCm,
    bool bOccluded) const
{
    FHorizonSpatialCueMix Mix;
    float FalloffExponent = 1.0f;
    float OcclusionStrength = 0.7f;

    switch (CueClass)
    {
        case EHorizonSpatialCueClass::Weapon:
            Mix.MaxDistanceCm = 45000.0f;
            FalloffExponent = 0.65f;
            OcclusionStrength = 0.55f;
            break;
        case EHorizonSpatialCueClass::Footstep:
            Mix.MaxDistanceCm = 6500.0f;
            FalloffExponent = 1.5f;
            OcclusionStrength = 0.90f;
            break;
        case EHorizonSpatialCueClass::Creature:
            Mix.MaxDistanceCm = 24000.0f;
            FalloffExponent = 0.92f;
            OcclusionStrength = 0.72f;
            break;
        case EHorizonSpatialCueClass::Weather:
            Mix.MaxDistanceCm = 30000.0f;
            FalloffExponent = 0.40f;
            OcclusionStrength = 0.30f;
            break;
        case EHorizonSpatialCueClass::Fire:
            Mix.MaxDistanceCm = 12000.0f;
            FalloffExponent = 1.18f;
            OcclusionStrength = 0.66f;
            break;
        case EHorizonSpatialCueClass::Water:
            Mix.MaxDistanceCm = 16000.0f;
            FalloffExponent = 1.08f;
            OcclusionStrength = 0.62f;
            break;
        case EHorizonSpatialCueClass::Music:
        case EHorizonSpatialCueClass::UI:
            // Non-diegetic cues are intentionally listener-relative and never wall-occluded.
            Mix.MaxDistanceCm = 0.0f;
            Mix.DistanceGain = 1.0f;
            Mix.ReverbSend = 0.0f;
            Mix.LowPassCutoffHz = 20000.0f;
            Mix.bVirtualizeWhenSilent = false;
            return Mix;
    }

    const float SafeDistance = FMath::Max(0.0f, DistanceCm);
    const float Distance01 = FMath::Clamp(SafeDistance / Mix.MaxDistanceCm, 0.0f, 1.0f);
    Mix.DistanceGain = FMath::Pow(1.0f - Distance01, FalloffExponent);

    switch (AcousticSpace)
    {
        case EHorizonAcousticSpace::Outdoor:
            Mix.ReverbSend = CueClass == EHorizonSpatialCueClass::Weapon ? 0.22f : 0.08f;
            break;
        case EHorizonAcousticSpace::IndoorSmall:
            Mix.ReverbSend = 0.48f;
            break;
        case EHorizonAcousticSpace::IndoorLarge:
            Mix.ReverbSend = 0.68f;
            break;
        case EHorizonAcousticSpace::Tunnel:
            Mix.ReverbSend = 0.86f;
            break;
        case EHorizonAcousticSpace::Rooftop:
            Mix.ReverbSend = CueClass == EHorizonSpatialCueClass::Weapon ? 0.28f : 0.12f;
            break;
    }

    const float RuntimeOcclusion = FMath::Max(Occlusion01, bOccluded ? 0.78f : 0.0f);
    const float AppliedOcclusion = FMath::Clamp(RuntimeOcclusion * OcclusionStrength, 0.0f, 1.0f);
    Mix.DistanceGain *= FMath::Lerp(1.0f, 0.16f, AppliedOcclusion);
    Mix.LowPassCutoffHz = FMath::Lerp(20000.0f, 1800.0f, FMath::Pow(AppliedOcclusion, 0.72f));
    return Mix;
}

FHorizonFootstepMix UHorizonAudioDirectorSubsystem::GetFootstepMix(
    EHorizonFootstepSurface Surface,
    float MovementSpeed01,
    bool bCrouched) const
{
    FHorizonFootstepMix Mix;
    const float Speed = FMath::Clamp(MovementSpeed01, 0.0f, 1.0f);

    switch (Surface)
    {
        case EHorizonFootstepSurface::Concrete:
            Mix.LowFrequencyGain = 0.38f;
            Mix.DebrisGain = 0.12f;
            break;
        case EHorizonFootstepSurface::Asphalt:
            Mix.LowFrequencyGain = 0.46f;
            Mix.DebrisGain = 0.08f;
            break;
        case EHorizonFootstepSurface::Dirt:
            Mix.LowFrequencyGain = 0.58f;
            Mix.DebrisGain = 0.36f;
            break;
        case EHorizonFootstepSurface::Grass:
            Mix.LowFrequencyGain = 0.24f;
            Mix.DebrisGain = 0.52f;
            break;
        case EHorizonFootstepSurface::Metal:
            Mix.Volume = 1.10f;
            Mix.Pitch = 1.03f;
            Mix.LowFrequencyGain = 0.82f;
            Mix.DebrisGain = 0.04f;
            break;
        case EHorizonFootstepSurface::Wood:
            Mix.LowFrequencyGain = 0.66f;
            Mix.DebrisGain = 0.14f;
            break;
        case EHorizonFootstepSurface::ShallowWater:
            Mix.Volume = 1.08f;
            Mix.LowFrequencyGain = 0.34f;
            Mix.SplashGain = 1.0f;
            break;
        case EHorizonFootstepSurface::Snow:
            Mix.Volume = 0.78f;
            Mix.Pitch = 0.94f;
            Mix.LowFrequencyGain = 0.20f;
            Mix.DebrisGain = 0.68f;
            break;
    }

    Mix.Volume *= FMath::Lerp(0.55f, 1.18f, Speed);
    Mix.Pitch *= FMath::Lerp(0.96f, 1.06f, Speed);

    if (bCrouched)
    {
        Mix.Volume *= 0.42f;
        Mix.Pitch *= 0.97f;
        Mix.DebrisGain *= 0.55f;
        Mix.SplashGain *= 0.62f;
    }

    if (AcousticSpace == EHorizonAcousticSpace::IndoorSmall ||
        AcousticSpace == EHorizonAcousticSpace::IndoorLarge ||
        AcousticSpace == EHorizonAcousticSpace::Tunnel)
    {
        Mix.LowFrequencyGain = FMath::Min(1.0f, Mix.LowFrequencyGain + 0.12f);
    }

    return Mix;
}

FHorizonAudioMixState UHorizonAudioDirectorSubsystem::GetMixState(EHorizonGameMode Mode) const
{
    FHorizonAudioMixState Mix;

    switch (ThreatState)
    {
        case EHorizonThreatState::Calm:
            Mix.MusicIntensity = 0.08f;
            break;
        case EHorizonThreatState::Alert:
            Mix.MusicIntensity = 0.30f;
            break;
        case EHorizonThreatState::Chase:
            Mix.MusicIntensity = 0.62f;
            break;
        case EHorizonThreatState::Horde:
            Mix.MusicIntensity = 0.82f;
            break;
        case EHorizonThreatState::Boss:
            Mix.MusicIntensity = 1.0f;
            break;
    }

    Mix.CombatIntensity = FMath::Clamp(SmoothedCombatIntensity01, 0.0f, 1.0f);
    Mix.MusicIntensity = FMath::Max(
        Mix.MusicIntensity,
        FMath::Lerp(0.08f, 0.96f, Mix.CombatIntensity));
    Mix.AmbienceGain = FMath::Lerp(1.0f, 0.58f, Mix.CombatIntensity);
    Mix.EffectsGain = FMath::Lerp(1.0f, 1.12f, Mix.CombatIntensity);
    Mix.TransientDuck = TransientDuck01;
    Mix.AmbienceGain *= FMath::Lerp(1.0f, 0.48f, TransientDuck01);
    Mix.EffectsGain *= FMath::Lerp(1.0f, 0.78f, TransientDuck01);

    switch (AcousticSpace)
    {
        case EHorizonAcousticSpace::Outdoor:
            Mix.ReverbSend = 0.10f;
            Mix.OutdoorTailGain = 1.0f;
            Mix.IndoorReflectionGain = 0.0f;
            break;
        case EHorizonAcousticSpace::IndoorSmall:
            Mix.ReverbSend = 0.46f;
            Mix.OutdoorTailGain = 0.18f;
            Mix.IndoorReflectionGain = 0.90f;
            break;
        case EHorizonAcousticSpace::IndoorLarge:
            Mix.ReverbSend = 0.68f;
            Mix.OutdoorTailGain = 0.12f;
            Mix.IndoorReflectionGain = 1.0f;
            break;
        case EHorizonAcousticSpace::Tunnel:
            Mix.ReverbSend = 0.86f;
            Mix.OutdoorTailGain = 0.04f;
            Mix.IndoorReflectionGain = 1.0f;
            break;
        case EHorizonAcousticSpace::Rooftop:
            Mix.ReverbSend = 0.16f;
            Mix.OutdoorTailGain = 1.0f;
            Mix.IndoorReflectionGain = 0.04f;
            break;
    }

    Mix.LowPassCutoffHz = FMath::Lerp(20000.0f, 1850.0f, FMath::Pow(Occlusion01, 0.72f));
    Mix.HordeBedGain = FMath::Clamp(HordePressure01, 0.0f, 1.0f);

    Mix.WeatherGain = WeatherState == EHorizonWeatherAudioState::Clear ? 0.0f : 1.0f;
    if (WeatherState == EHorizonWeatherAudioState::Wind && AcousticSpace != EHorizonAcousticSpace::Outdoor)
    {
        Mix.WeatherGain = 0.28f;
    }

    if (Mode == EHorizonGameMode::YearOneSurvival)
    {
        Mix.bProximityVoiceEnabled = false;
        Mix.bPartyOrTeamVoiceEnabled = false;
        Mix.VoiceProximityMaxDistanceCm = 0.0f;
    }
    else
    {
        Mix.bProximityVoiceEnabled = true;
        Mix.bPartyOrTeamVoiceEnabled = true;
        Mix.VoiceProximityMaxDistanceCm = Mode == EHorizonGameMode::InfiniteTDM ? 2800.0f : 3600.0f;
    }

    if (const UGameInstance* GameInstance = GetGameInstance())
    {
        if (UWorld* World = GameInstance->GetWorld())
        {
            if (const UHorizonAutopilotSubsystem* Autopilot = World->GetSubsystem<UHorizonAutopilotSubsystem>())
            {
                const FHorizonAutopilotProfile Profile = Autopilot->GetProfile();
                Mix.DetailScale = FMath::Clamp(Profile.WorldDetailScale, 0.45f, 1.0f);
                Mix.SuggestedMaxWorldVoices = FMath::RoundToInt(
                    FMath::Lerp(40.0f, 128.0f, Mix.DetailScale));
                Mix.DistantVirtualizationDistanceCm = FMath::Lerp(
                    8500.0f,
                    26000.0f,
                    Mix.DetailScale);

                // Preserve gameplay-critical voice, weapon and threat cues first.
                // Only ambient/horde bed richness is reduced under performance pressure.
                Mix.HordeBedGain *= FMath::Lerp(0.72f, 1.0f, Mix.DetailScale);
                Mix.WeatherGain *= FMath::Lerp(0.78f, 1.0f, Mix.DetailScale);
            }
        }
    }

    return Mix;
}
