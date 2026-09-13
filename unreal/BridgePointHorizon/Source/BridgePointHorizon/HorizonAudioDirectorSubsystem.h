#pragma once

#include "CoreMinimal.h"
#include "Subsystems/GameInstanceSubsystem.h"
#include "HorizonGameStateSubsystem.h"
#include "HorizonAudioDirectorSubsystem.generated.h"

UENUM(BlueprintType)
enum class EHorizonAcousticSpace : uint8
{
    Outdoor,
    IndoorSmall,
    IndoorLarge,
    Tunnel,
    Rooftop
};

UENUM(BlueprintType)
enum class EHorizonThreatState : uint8
{
    Calm,
    Alert,
    Chase,
    Horde,
    Boss
};

UENUM(BlueprintType)
enum class EHorizonWeatherAudioState : uint8
{
    Clear,
    Rain,
    Storm,
    Snow,
    Wind
};

USTRUCT(BlueprintType)
struct FHorizonAudioMixState
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadOnly)
    float MusicIntensity = 0.0f;

    UPROPERTY(BlueprintReadOnly)
    float ReverbSend = 0.0f;

    UPROPERTY(BlueprintReadOnly)
    float OutdoorTailGain = 1.0f;

    UPROPERTY(BlueprintReadOnly)
    float IndoorReflectionGain = 0.0f;

    UPROPERTY(BlueprintReadOnly)
    float LowPassCutoffHz = 20000.0f;

    UPROPERTY(BlueprintReadOnly)
    float HordeBedGain = 0.0f;

    UPROPERTY(BlueprintReadOnly)
    float WeatherGain = 0.0f;

    UPROPERTY(BlueprintReadOnly)
    float VoiceProximityMaxDistanceCm = 0.0f;

    UPROPERTY(BlueprintReadOnly)
    float DetailScale = 1.0f;

    UPROPERTY(BlueprintReadOnly)
    int32 SuggestedMaxWorldVoices = 96;

    UPROPERTY(BlueprintReadOnly)
    float DistantVirtualizationDistanceCm = 18000.0f;

    UPROPERTY(BlueprintReadOnly)
    bool bProximityVoiceEnabled = false;

    UPROPERTY(BlueprintReadOnly)
    bool bPartyOrTeamVoiceEnabled = false;
};

DECLARE_DYNAMIC_MULTICAST_DELEGATE(FHorizonAudioStateChanged);

UCLASS()
class BRIDGEPOINTHORIZON_API UHorizonAudioDirectorSubsystem : public UGameInstanceSubsystem
{
    GENERATED_BODY()

public:
    virtual void Initialize(FSubsystemCollectionBase& Collection) override;

    UPROPERTY(BlueprintAssignable)
    FHorizonAudioStateChanged OnAudioStateChanged;

    UFUNCTION(BlueprintCallable, Category="Horizon|Audio")
    void SetAcousticSpace(EHorizonAcousticSpace NewSpace);

    UFUNCTION(BlueprintCallable, Category="Horizon|Audio")
    void SetThreatState(EHorizonThreatState NewThreat);

    UFUNCTION(BlueprintCallable, Category="Horizon|Audio")
    void SetWeatherState(EHorizonWeatherAudioState NewWeather);

    UFUNCTION(BlueprintCallable, Category="Horizon|Audio")
    void SetOcclusion01(float NewOcclusion);

    UFUNCTION(BlueprintCallable, Category="Horizon|Audio")
    void SetHordePressure01(float NewPressure);

    UFUNCTION(BlueprintPure, Category="Horizon|Audio")
    FHorizonAudioMixState GetMixState(EHorizonGameMode Mode) const;

    UFUNCTION(BlueprintPure, Category="Horizon|Audio")
    EHorizonAcousticSpace GetAcousticSpace() const { return AcousticSpace; }

    UFUNCTION(BlueprintPure, Category="Horizon|Audio")
    EHorizonThreatState GetThreatState() const { return ThreatState; }

private:
    UPROPERTY()
    EHorizonAcousticSpace AcousticSpace = EHorizonAcousticSpace::Outdoor;

    UPROPERTY()
    EHorizonThreatState ThreatState = EHorizonThreatState::Calm;

    UPROPERTY()
    EHorizonWeatherAudioState WeatherState = EHorizonWeatherAudioState::Clear;

    float Occlusion01 = 0.0f;
    float HordePressure01 = 0.0f;
};
