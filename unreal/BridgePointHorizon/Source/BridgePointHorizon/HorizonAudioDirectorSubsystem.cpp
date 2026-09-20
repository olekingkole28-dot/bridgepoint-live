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
    RegionalAmbience = EHorizonRegionalAmbience::NortheastUrban;
    Occlusion01 = 0.0f;
    HordePressure01 = 0.0f;
    DesiredWeatherIntensity01 = 0.0f;
    SmoothedWeatherIntensity01 = 0.0f;
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
    if (WeatherState == NewWeather)
    {
        return;
    }

    WeatherState = NewWeather;
    switch (WeatherState)
    {
        case EHorizonWeatherAudioState::Clear: DesiredWeatherIntensity01 = 0.0f; break;
        case EHorizonWeatherAudioState::Rain: DesiredWeatherIntensity01 = 0.72f; break;
        case EHorizonWeatherAudioState::Storm: DesiredWeatherIntensity01 = 1.0f; break;
        case EHorizonWeatherAudioState::Snow: DesiredWeatherIntensity01 = 0.58f; break;
        case EHorizonWeatherAudioState::Wind: DesiredWeatherIntensity01 = 0.66f; break;
    }

    OnAudioStateChanged.Broadcast();
}

void UHorizonAudioDirectorSubsystem::SetWeatherIntensity01(float NewIntensity)
{
    const float Clamped = FMath::Clamp(NewIntensity, 0.0f, 1.0f);
    if (!FMath::IsNearlyEqual(DesiredWeatherIntensity01, Clamped, 0.01f))
    {
        DesiredWeatherIntensity01 = Clamped;
        OnAudioStateChanged.Broadcast();
    }
}

void UHorizonAudioDirectorSubsystem::SetRegionalAmbience(EHorizonRegionalAmbience NewRegion)
{
    if (RegionalAmbience != NewRegion)
    {
        RegionalAmbience = NewRegion;
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

    const float PreviousWeather = SmoothedWeatherIntensity01;
    const float WeatherInterpSpeed =
        DesiredWeatherIntensity01 >= SmoothedWeatherIntensity01 ? 2.8f : 0.72f;
    SmoothedWeatherIntensity01 = FMath::FInterpTo(
        SmoothedWeatherIntensity01,
        DesiredWeatherIntensity01,
        Step,
        WeatherInterpSpeed);

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

    if (!FMath::IsNearlyEqual(Previous, SmoothedCombatIntensity01, 0.005f) ||
        !FMath::IsNearlyEqual(PreviousWeather, SmoothedWeatherIntensity01, 0.005f))
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

FHorizonUiFeedbackMix UHorizonAudioDirectorSubsystem::BuildUiFeedbackMix(
    EHorizonUiFeedbackCue Cue,
    float CombatIntensity01,
    int32 VariationSeed)
{
    FHorizonUiFeedbackMix Mix;
    switch (Cue)
    {
        case EHorizonUiFeedbackCue::Confirm:
            Mix.Gain = 0.54f;
            Mix.Pitch = 1.08f;
            Mix.HighToneGain = 0.72f;
            Mix.LowToneGain = 0.10f;
            Mix.TransientDuck = 0.02f;
            break;
        case EHorizonUiFeedbackCue::Denied:
            Mix.Gain = 0.64f;
            Mix.Pitch = 0.90f;
            Mix.HighToneGain = 0.20f;
            Mix.LowToneGain = 0.72f;
            Mix.TransientDuck = 0.04f;
            break;
        case EHorizonUiFeedbackCue::LowAmmo:
            Mix.Gain = 0.72f;
            Mix.Pitch = 1.02f;
            Mix.HighToneGain = 0.58f;
            Mix.LowToneGain = 0.50f;
            Mix.TransientDuck = 0.04f;
            break;
        case EHorizonUiFeedbackCue::Empty:
            Mix.Gain = 0.78f;
            Mix.Pitch = 0.86f;
            Mix.HighToneGain = 0.15f;
            Mix.LowToneGain = 0.82f;
            Mix.TransientDuck = 0.05f;
            break;
        case EHorizonUiFeedbackCue::ReloadStart:
            Mix.Gain = 0.50f;
            Mix.Pitch = 0.96f;
            Mix.HighToneGain = 0.35f;
            Mix.LowToneGain = 0.42f;
            Mix.TransientDuck = 0.01f;
            break;
        case EHorizonUiFeedbackCue::ReloadComplete:
            Mix.Gain = 0.62f;
            Mix.Pitch = 1.10f;
            Mix.HighToneGain = 0.80f;
            Mix.LowToneGain = 0.16f;
            Mix.TransientDuck = 0.02f;
            break;
    }

    const float Combat = FMath::Clamp(CombatIntensity01, 0.0f, 1.0f);
    const bool bCritical =
        Cue == EHorizonUiFeedbackCue::LowAmmo ||
        Cue == EHorizonUiFeedbackCue::Empty ||
        Cue == EHorizonUiFeedbackCue::Denied;
    Mix.Gain *= FMath::Lerp(1.0f, bCritical ? 0.90f : 0.72f, Combat);

    // Seeded micro-variation avoids sterile repetition without changing cue identity.
    FRandomStream Variation(
        VariationSeed * 3571 + static_cast<int32>(Cue) * 193);
    Mix.Pitch *= Variation.FRandRange(0.985f, 1.015f);
    Mix.Gain *= Variation.FRandRange(0.98f, 1.02f);
    Mix.Gain = FMath::Clamp(Mix.Gain, 0.0f, 0.82f);
    Mix.Pitch = FMath::Clamp(Mix.Pitch, 0.82f, 1.14f);
    Mix.HighToneGain = FMath::Clamp(Mix.HighToneGain, 0.0f, 1.0f);
    Mix.LowToneGain = FMath::Clamp(Mix.LowToneGain, 0.0f, 1.0f);
    Mix.TransientDuck = FMath::Clamp(Mix.TransientDuck, 0.0f, 0.08f);
    Mix.bListenerRelative = true;
    return Mix;
}

FHorizonUiFeedbackMix UHorizonAudioDirectorSubsystem::GetUiFeedbackMix(
    EHorizonUiFeedbackCue Cue,
    int32 VariationSeed) const
{
    return BuildUiFeedbackMix(Cue, SmoothedCombatIntensity01, VariationSeed);
}

FHorizonVehicleAudioMix UHorizonAudioDirectorSubsystem::BuildVehicleAudioMix(
    EHorizonVehicleAudioClass VehicleClass,
    bool bEngineRunning,
    float SpeedKph,
    float EngineLoad01,
    float Durability01,
    float DistanceCm,
    bool bListenerInside,
    bool bOccluded,
    int32 VariationSeed)
{
    FHorizonVehicleAudioMix Mix;
    Mix.bListenerInside = bListenerInside;
    if (!bEngineRunning)
    {
        Mix.Pitch = 0.0f;
        Mix.LowPassCutoffHz = bListenerInside ? 5200.0f : 18000.0f;
        return Mix;
    }

    float MaximumSpeedKph = 190.0f;
    float BasePitch = 0.82f;
    float ExhaustCharacter = 0.72f;
    switch (VehicleClass)
    {
        case EHorizonVehicleAudioClass::Sedan:
            MaximumSpeedKph = 190.0f;
            BasePitch = 0.82f;
            ExhaustCharacter = 0.62f;
            Mix.MaxDistanceCm = 30000.0f;
            break;
        case EHorizonVehicleAudioClass::Pickup:
            MaximumSpeedKph = 170.0f;
            BasePitch = 0.74f;
            ExhaustCharacter = 0.88f;
            Mix.MaxDistanceCm = 36000.0f;
            break;
        case EHorizonVehicleAudioClass::Offroad:
            MaximumSpeedKph = 145.0f;
            BasePitch = 0.78f;
            ExhaustCharacter = 0.94f;
            Mix.MaxDistanceCm = 34000.0f;
            break;
        case EHorizonVehicleAudioClass::UtilityVan:
            MaximumSpeedKph = 155.0f;
            BasePitch = 0.70f;
            ExhaustCharacter = 0.80f;
            Mix.MaxDistanceCm = 33000.0f;
            break;
    }

    const float SafeSpeed = FMath::Clamp(
        FMath::IsFinite(SpeedKph) ? SpeedKph : 0.0f,
        0.0f,
        MaximumSpeedKph);
    const float Speed01 = SafeSpeed / MaximumSpeedKph;
    const float Load01 = FMath::Clamp(
        FMath::IsFinite(EngineLoad01) ? EngineLoad01 : 0.0f,
        0.0f,
        1.0f);
    const float SafeDurability = FMath::Clamp(
        FMath::IsFinite(Durability01) ? Durability01 : 0.0f,
        0.0f,
        1.0f);
    const float SafeDistance = FMath::Max(
        0.0f,
        FMath::IsFinite(DistanceCm) ? DistanceCm : Mix.MaxDistanceCm);
    const float Distance01 = FMath::Clamp(SafeDistance / Mix.MaxDistanceCm, 0.0f, 1.0f);
    const float DistanceGain = FMath::Pow(1.0f - Distance01, 0.72f);

    Mix.EngineGain = (0.34f + Load01 * 0.52f + Speed01 * 0.16f) * DistanceGain;
    Mix.ExhaustGain = (0.20f + Load01 * ExhaustCharacter) * DistanceGain;
    Mix.TireGain = FMath::Pow(Speed01, 0.78f) * 0.68f * DistanceGain;
    Mix.DamageSputter01 = SafeDurability < 0.45f
        ? FMath::Square(1.0f - SafeDurability / 0.45f)
        : 0.0f;
    Mix.MechanicalRattleGain =
        (1.0f - SafeDurability) * 0.62f * DistanceGain +
        (VehicleClass == EHorizonVehicleAudioClass::Offroad ? 0.06f : 0.0f);
    Mix.Pitch = BasePitch + Speed01 * 0.72f + Load01 * 0.16f;

    if (bListenerInside)
    {
        Mix.EngineGain *= 0.76f;
        Mix.ExhaustGain *= 0.38f;
        Mix.TireGain *= 0.56f;
        Mix.MechanicalRattleGain *= 0.82f;
        Mix.LowPassCutoffHz = 5200.0f;
        Mix.ReverbSend = 0.05f;
    }
    else
    {
        Mix.LowPassCutoffHz = 18000.0f;
        Mix.ReverbSend = 0.18f;
    }

    if (bOccluded)
    {
        Mix.EngineGain *= 0.68f;
        Mix.ExhaustGain *= 0.74f;
        Mix.TireGain *= 0.58f;
        Mix.LowPassCutoffHz = FMath::Min(Mix.LowPassCutoffHz, 2600.0f);
        Mix.ReverbSend = FMath::Max(Mix.ReverbSend, 0.26f);
    }

    FRandomStream Variation(
        VariationSeed * 1877 + static_cast<int32>(VehicleClass) * 283);
    Mix.Pitch *= Variation.FRandRange(0.992f, 1.008f);
    Mix.EngineGain *= Variation.FRandRange(0.985f, 1.015f);

    Mix.EngineGain = FMath::Clamp(Mix.EngineGain, 0.0f, 1.0f);
    Mix.ExhaustGain = FMath::Clamp(Mix.ExhaustGain, 0.0f, 1.0f);
    Mix.TireGain = FMath::Clamp(Mix.TireGain, 0.0f, 1.0f);
    Mix.MechanicalRattleGain = FMath::Clamp(Mix.MechanicalRattleGain, 0.0f, 1.0f);
    Mix.DamageSputter01 = FMath::Clamp(Mix.DamageSputter01, 0.0f, 1.0f);
    Mix.Pitch = FMath::Clamp(Mix.Pitch, 0.65f, 1.72f);
    return Mix;
}

FHorizonVehicleAudioMix UHorizonAudioDirectorSubsystem::GetVehicleAudioMix(
    EHorizonVehicleAudioClass VehicleClass,
    bool bEngineRunning,
    float SpeedKph,
    float EngineLoad01,
    float Durability01,
    float DistanceCm,
    bool bListenerInside,
    bool bOccluded,
    int32 VariationSeed) const
{
    return BuildVehicleAudioMix(
        VehicleClass,
        bEngineRunning,
        SpeedKph,
        EngineLoad01,
        Durability01,
        DistanceCm,
        bListenerInside,
        bOccluded,
        VariationSeed);
}

FHorizonWeaponReportMix UHorizonAudioDirectorSubsystem::GetWeaponReportMix(
    EHorizonWeaponReportClass ReportClass,
    float DistanceCm,
    bool bOccluded,
    int32 VariationSeed) const
{
    FHorizonWeaponReportMix Mix;

    switch (ReportClass)
    {
        case EHorizonWeaponReportClass::Sidearm:
            Mix.ReportGain = 0.86f;
            Mix.MechanicalGain = 0.56f;
            Mix.LowFrequencyGain = 0.42f;
            Mix.MaxDistanceCm = 35000.0f;
            break;
        case EHorizonWeaponReportClass::Rifle:
            Mix.ReportGain = 1.0f;
            Mix.MechanicalGain = 0.46f;
            Mix.LowFrequencyGain = 0.78f;
            Mix.MaxDistanceCm = 52000.0f;
            break;
        case EHorizonWeaponReportClass::Shotgun:
            Mix.ReportGain = 1.12f;
            Mix.MechanicalGain = 0.40f;
            Mix.LowFrequencyGain = 1.0f;
            Mix.MaxDistanceCm = 44000.0f;
            break;
        case EHorizonWeaponReportClass::Precision:
            Mix.ReportGain = 1.16f;
            Mix.MechanicalGain = 0.34f;
            Mix.LowFrequencyGain = 0.94f;
            Mix.MaxDistanceCm = 75000.0f;
            break;
        case EHorizonWeaponReportClass::Suppressed:
            Mix.ReportGain = 0.42f;
            Mix.MechanicalGain = 0.76f;
            Mix.LowFrequencyGain = 0.24f;
            Mix.MaxDistanceCm = 18000.0f;
            break;
    }

    const float SafeDistance = FMath::Max(0.0f, DistanceCm);
    const float Distance01 = FMath::Clamp(SafeDistance / Mix.MaxDistanceCm, 0.0f, 1.0f);
    const float DistanceGain = FMath::Pow(1.0f - Distance01, 0.65f);
    Mix.PropagationDelaySeconds = FMath::Min(2.5f, SafeDistance / 34300.0f);

    switch (AcousticSpace)
    {
        case EHorizonAcousticSpace::Outdoor:
            Mix.EarlyReflectionGain = 0.18f;
            Mix.TailGain = 0.72f;
            Mix.TailDelaySeconds = 0.08f;
            break;
        case EHorizonAcousticSpace::IndoorSmall:
            Mix.EarlyReflectionGain = 1.0f;
            Mix.TailGain = 0.34f;
            Mix.TailDelaySeconds = 0.025f;
            break;
        case EHorizonAcousticSpace::IndoorLarge:
            Mix.EarlyReflectionGain = 0.82f;
            Mix.TailGain = 0.68f;
            Mix.TailDelaySeconds = 0.055f;
            break;
        case EHorizonAcousticSpace::Tunnel:
            Mix.EarlyReflectionGain = 1.10f;
            Mix.TailGain = 0.94f;
            Mix.TailDelaySeconds = 0.12f;
            break;
        case EHorizonAcousticSpace::Rooftop:
            Mix.EarlyReflectionGain = 0.16f;
            Mix.TailGain = 0.88f;
            Mix.TailDelaySeconds = 0.095f;
            break;
    }

    float RegionalTailScale = 1.0f;
    switch (RegionalAmbience)
    {
        case EHorizonRegionalAmbience::NortheastUrban: RegionalTailScale = 1.08f; break;
        case EHorizonRegionalAmbience::SoutheastWetlands: RegionalTailScale = 0.82f; break;
        case EHorizonRegionalAmbience::DesertSouthwest: RegionalTailScale = 1.12f; break;
        case EHorizonRegionalAmbience::PacificForest: RegionalTailScale = 0.78f; break;
        case EHorizonRegionalAmbience::GreatPlains: RegionalTailScale = 1.06f; break;
        case EHorizonRegionalAmbience::Mountain: RegionalTailScale = 1.20f; break;
        case EHorizonRegionalAmbience::TropicalTerritory: RegionalTailScale = 0.84f; break;
        case EHorizonRegionalAmbience::Arctic: RegionalTailScale = 1.02f; break;
    }

    if (ReportClass == EHorizonWeaponReportClass::Suppressed)
    {
        Mix.TailGain *= 0.32f;
        Mix.EarlyReflectionGain *= 0.58f;
    }

    const float RuntimeOcclusion = FMath::Max(Occlusion01, bOccluded ? 0.82f : 0.0f);
    const float AppliedOcclusion = FMath::Clamp(RuntimeOcclusion * 0.62f, 0.0f, 1.0f);
    const float OccludedGain = FMath::Lerp(1.0f, 0.18f, AppliedOcclusion);
    Mix.ReportGain *= DistanceGain * OccludedGain;
    Mix.MechanicalGain *= FMath::Pow(DistanceGain, 1.35f) * OccludedGain;
    Mix.LowFrequencyGain *= DistanceGain * FMath::Lerp(1.0f, 0.62f, AppliedOcclusion);
    Mix.EarlyReflectionGain *= DistanceGain * OccludedGain;
    Mix.TailGain *= DistanceGain * RegionalTailScale * FMath::Lerp(1.0f, 0.44f, AppliedOcclusion);
    Mix.LowPassCutoffHz = FMath::Lerp(
        20000.0f,
        1450.0f,
        FMath::Pow(AppliedOcclusion, 0.70f));

    const uint32 SeedHash = GetTypeHash(VariationSeed);
    const float Variation01 = static_cast<float>(SeedHash % 1001u) / 1000.0f;
    Mix.Pitch = FMath::Lerp(0.975f, 1.025f, Variation01);

    // Weapon transients retain clarity as combat rises while ambience/music
    // remain ducked by the director's shared combat mix.
    Mix.ReportGain *= FMath::Lerp(1.0f, 1.08f, SmoothedCombatIntensity01);
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

FHorizonCreatureVocalMix UHorizonAudioDirectorSubsystem::GetCreatureVocalMix(
    EHorizonCreatureVocalArchetype Archetype,
    EHorizonCreatureVocalIntent Intent,
    float DistanceCm,
    bool bOccluded,
    int32 VariationSeed) const
{
    FHorizonCreatureVocalMix Mix;
    const FHorizonSpatialCueMix Spatial = GetSpatialCueMix(
        EHorizonSpatialCueClass::Creature,
        DistanceCm,
        bOccluded);

    Mix.Volume = Spatial.DistanceGain;
    Mix.LowPassCutoffHz = Spatial.LowPassCutoffHz;
    Mix.ReverbSend = Spatial.ReverbSend;
    Mix.MaxDistanceCm = Spatial.MaxDistanceCm;
    Mix.bVirtualizeWhenSilent = Spatial.bVirtualizeWhenSilent;

    switch (Archetype)
    {
        case EHorizonCreatureVocalArchetype::Shambler:
            Mix.Pitch = 0.82f;
            Mix.GrowlLayerGain = 0.86f;
            Mix.BreathLayerGain = 0.36f;
            break;
        case EHorizonCreatureVocalArchetype::Lurker:
            Mix.Pitch = 0.92f;
            Mix.GrowlLayerGain = 0.44f;
            Mix.BreathLayerGain = 0.78f;
            break;
        case EHorizonCreatureVocalArchetype::Stalker:
            Mix.Pitch = 1.02f;
            Mix.GrowlLayerGain = 0.34f;
            Mix.BreathLayerGain = 0.68f;
            break;
        case EHorizonCreatureVocalArchetype::Screamer:
            Mix.Pitch = 1.12f;
            Mix.GrowlLayerGain = 0.18f;
            Mix.BreathLayerGain = 0.32f;
            Mix.ScreamLayerGain = 1.0f;
            Mix.MaxDistanceCm = 36000.0f;
            break;
        case EHorizonCreatureVocalArchetype::Sprinter:
            Mix.Pitch = 1.08f;
            Mix.GrowlLayerGain = 0.52f;
            Mix.BreathLayerGain = 0.94f;
            break;
        case EHorizonCreatureVocalArchetype::Beast:
            Mix.Pitch = 0.68f;
            Mix.GrowlLayerGain = 1.0f;
            Mix.BreathLayerGain = 0.62f;
            Mix.MaxDistanceCm = 32000.0f;
            break;
    }

    switch (Intent)
    {
        case EHorizonCreatureVocalIntent::Idle:
            Mix.Volume *= 0.48f;
            Mix.ScreamLayerGain *= 0.12f;
            break;
        case EHorizonCreatureVocalIntent::Alert:
            Mix.Volume *= 0.82f;
            Mix.GrowlLayerGain = FMath::Min(1.0f, Mix.GrowlLayerGain + 0.12f);
            Mix.ScreamLayerGain *= 0.72f;
            break;
        case EHorizonCreatureVocalIntent::Attack:
            Mix.Volume *= 1.08f;
            Mix.GrowlLayerGain = FMath::Min(1.0f, Mix.GrowlLayerGain + 0.20f);
            break;
        case EHorizonCreatureVocalIntent::Pain:
            Mix.Volume *= 0.90f;
            Mix.Pitch *= 1.06f;
            Mix.ScreamLayerGain = FMath::Max(0.34f, Mix.ScreamLayerGain);
            break;
        case EHorizonCreatureVocalIntent::Death:
            Mix.Volume *= 1.0f;
            Mix.Pitch *= 0.88f;
            Mix.GrowlLayerGain = FMath::Max(0.58f, Mix.GrowlLayerGain);
            break;
    }

    // Seeded micro-variation avoids robotic repetition while remaining replay/network deterministic.
    FRandomStream Variation(VariationSeed * 7919 + static_cast<int32>(Archetype) * 379 + static_cast<int32>(Intent) * 53);
    Mix.Pitch *= Variation.FRandRange(0.965f, 1.035f);
    Mix.Volume *= Variation.FRandRange(0.94f, 1.06f);
    Mix.Volume = FMath::Clamp(Mix.Volume, 0.0f, 1.15f);
    Mix.Pitch = FMath::Clamp(Mix.Pitch, 0.55f, 1.30f);
    Mix.GrowlLayerGain = FMath::Clamp(Mix.GrowlLayerGain, 0.0f, 1.0f);
    Mix.BreathLayerGain = FMath::Clamp(Mix.BreathLayerGain, 0.0f, 1.0f);
    Mix.ScreamLayerGain = FMath::Clamp(Mix.ScreamLayerGain, 0.0f, 1.0f);
    return Mix;
}

FHorizonRegionalAmbienceMix UHorizonAudioDirectorSubsystem::GetRegionalAmbienceMix() const
{
    FHorizonRegionalAmbienceMix Mix;

    switch (RegionalAmbience)
    {
        case EHorizonRegionalAmbience::NortheastUrban:
            Mix.WindGain = 0.28f;
            Mix.FaunaGain = 0.16f;
            Mix.UrbanHumGain = 0.92f;
            Mix.WaterGain = 0.18f;
            Mix.VegetationGain = 0.22f;
            break;
        case EHorizonRegionalAmbience::SoutheastWetlands:
            Mix.WindGain = 0.20f;
            Mix.FaunaGain = 0.90f;
            Mix.UrbanHumGain = 0.12f;
            Mix.WaterGain = 0.78f;
            Mix.VegetationGain = 0.84f;
            break;
        case EHorizonRegionalAmbience::DesertSouthwest:
            Mix.WindGain = 0.72f;
            Mix.FaunaGain = 0.18f;
            Mix.UrbanHumGain = 0.10f;
            Mix.WaterGain = 0.02f;
            Mix.VegetationGain = 0.08f;
            break;
        case EHorizonRegionalAmbience::PacificForest:
            Mix.WindGain = 0.44f;
            Mix.FaunaGain = 0.70f;
            Mix.UrbanHumGain = 0.08f;
            Mix.WaterGain = 0.48f;
            Mix.VegetationGain = 0.94f;
            break;
        case EHorizonRegionalAmbience::GreatPlains:
            Mix.WindGain = 0.86f;
            Mix.FaunaGain = 0.38f;
            Mix.UrbanHumGain = 0.04f;
            Mix.WaterGain = 0.10f;
            Mix.VegetationGain = 0.46f;
            break;
        case EHorizonRegionalAmbience::Mountain:
            Mix.WindGain = 0.76f;
            Mix.FaunaGain = 0.34f;
            Mix.UrbanHumGain = 0.02f;
            Mix.WaterGain = 0.40f;
            Mix.VegetationGain = 0.56f;
            break;
        case EHorizonRegionalAmbience::TropicalTerritory:
            Mix.WindGain = 0.48f;
            Mix.FaunaGain = 0.88f;
            Mix.UrbanHumGain = 0.10f;
            Mix.WaterGain = 0.92f;
            Mix.VegetationGain = 0.90f;
            break;
        case EHorizonRegionalAmbience::Arctic:
            Mix.WindGain = 0.92f;
            Mix.FaunaGain = 0.08f;
            Mix.UrbanHumGain = 0.02f;
            Mix.WaterGain = 0.10f;
            Mix.VegetationGain = 0.04f;
            break;
    }

    const float Weather = FMath::Clamp(SmoothedWeatherIntensity01, 0.0f, 1.0f);
    switch (WeatherState)
    {
        case EHorizonWeatherAudioState::Clear:
            break;
        case EHorizonWeatherAudioState::Rain:
            Mix.RainGain = Weather;
            Mix.WindGain = FMath::Max(Mix.WindGain, Weather * 0.38f);
            break;
        case EHorizonWeatherAudioState::Storm:
            Mix.RainGain = Weather;
            Mix.ThunderGain = FMath::Pow(Weather, 1.35f);
            Mix.WindGain = FMath::Max(Mix.WindGain, Weather);
            break;
        case EHorizonWeatherAudioState::Snow:
            Mix.SnowGain = Weather;
            Mix.WindGain = FMath::Max(Mix.WindGain, Weather * 0.55f);
            break;
        case EHorizonWeatherAudioState::Wind:
            Mix.WindGain = FMath::Max(Mix.WindGain, Weather);
            break;
    }

    switch (AcousticSpace)
    {
        case EHorizonAcousticSpace::Outdoor: Mix.InteriorTransmission = 1.0f; break;
        case EHorizonAcousticSpace::IndoorSmall: Mix.InteriorTransmission = 0.24f; break;
        case EHorizonAcousticSpace::IndoorLarge: Mix.InteriorTransmission = 0.34f; break;
        case EHorizonAcousticSpace::Tunnel: Mix.InteriorTransmission = 0.08f; break;
        case EHorizonAcousticSpace::Rooftop: Mix.InteriorTransmission = 1.12f; break;
    }

    const float CombatDuck = FMath::Lerp(1.0f, 0.62f, SmoothedCombatIntensity01);
    const float ExteriorGain = Mix.InteriorTransmission * CombatDuck;
    Mix.WindGain *= ExteriorGain;
    Mix.RainGain *= ExteriorGain;
    Mix.SnowGain *= ExteriorGain;
    Mix.ThunderGain *= Mix.InteriorTransmission;
    Mix.FaunaGain *= ExteriorGain;
    Mix.UrbanHumGain *= FMath::Lerp(0.46f, 1.0f, Mix.InteriorTransmission) * CombatDuck;
    Mix.WaterGain *= ExteriorGain;
    Mix.VegetationGain *= ExteriorGain;
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

    const FHorizonRegionalAmbienceMix AmbienceMix = GetRegionalAmbienceMix();
    Mix.WeatherGain = WeatherState == EHorizonWeatherAudioState::Clear
        ? 0.0f
        : SmoothedWeatherIntensity01 * AmbienceMix.InteriorTransmission;

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
