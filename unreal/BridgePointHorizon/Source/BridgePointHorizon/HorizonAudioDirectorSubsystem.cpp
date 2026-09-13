#include "HorizonAudioDirectorSubsystem.h"

void UHorizonAudioDirectorSubsystem::Initialize(FSubsystemCollectionBase& Collection)
{
    Super::Initialize(Collection);
    AcousticSpace = EHorizonAcousticSpace::Outdoor;
    ThreatState = EHorizonThreatState::Calm;
    WeatherState = EHorizonWeatherAudioState::Clear;
    Occlusion01 = 0.0f;
    HordePressure01 = 0.0f;
}

void UHorizonAudioDirectorSubsystem::SetAcousticSpace(EHorizonAcousticSpace NewSpace)
{
    if (AcousticSpace != NewSpace)
    {
        AcousticSpace = NewSpace;
        OnAudioStateChanged.Broadcast();
    }
}

void UHorizonAudioDirectorSubsystem::SetThreatState(EHorizonThreatState NewThreat)
{
    if (ThreatState != NewThreat)
    {
        ThreatState = NewThreat;
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
        HordePressure01 = Clamped;
        OnAudioStateChanged.Broadcast();
    }
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

    return Mix;
}
