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

UENUM(BlueprintType)
enum class EHorizonRegionalAmbience : uint8
{
    NortheastUrban,
    SoutheastWetlands,
    DesertSouthwest,
    PacificForest,
    GreatPlains,
    Mountain,
    TropicalTerritory,
    Arctic
};

UENUM(BlueprintType)
enum class EHorizonSensoryStinger : uint8
{
    None,
    ThreatRise,
    HordeSurge,
    PlayerHit
};

UENUM(BlueprintType)
enum class EHorizonSpatialCueClass : uint8
{
    Weapon,
    Footstep,
    Creature,
    Weather,
    Fire,
    Water,
    Music,
    UI
};

UENUM(BlueprintType)
enum class EHorizonWeaponReportClass : uint8
{
    Sidearm,
    Rifle,
    Shotgun,
    Precision,
    Suppressed
};

UENUM(BlueprintType)
enum class EHorizonFootstepSurface : uint8
{
    Concrete,
    Asphalt,
    Dirt,
    Grass,
    Metal,
    Wood,
    ShallowWater,
    Snow
};

UENUM(BlueprintType)
enum class EHorizonCreatureVocalArchetype : uint8
{
    Shambler,
    Lurker,
    Stalker,
    Screamer,
    Sprinter,
    Beast
};

UENUM(BlueprintType)
enum class EHorizonCreatureVocalIntent : uint8
{
    Idle,
    Alert,
    Attack,
    Pain,
    Death
};

USTRUCT(BlueprintType)
struct FHorizonSpatialCueMix
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadOnly)
    float DistanceGain = 1.0f;

    UPROPERTY(BlueprintReadOnly)
    float ReverbSend = 0.0f;

    UPROPERTY(BlueprintReadOnly)
    float LowPassCutoffHz = 20000.0f;

    UPROPERTY(BlueprintReadOnly)
    float MaxDistanceCm = 12000.0f;

    UPROPERTY(BlueprintReadOnly)
    bool bVirtualizeWhenSilent = true;
};

USTRUCT(BlueprintType)
struct FHorizonWeaponReportMix
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadOnly)
    float ReportGain = 1.0f;

    UPROPERTY(BlueprintReadOnly)
    float MechanicalGain = 0.45f;

    UPROPERTY(BlueprintReadOnly)
    float LowFrequencyGain = 0.70f;

    UPROPERTY(BlueprintReadOnly)
    float EarlyReflectionGain = 0.0f;

    UPROPERTY(BlueprintReadOnly)
    float TailGain = 0.0f;

    UPROPERTY(BlueprintReadOnly)
    float Pitch = 1.0f;

    UPROPERTY(BlueprintReadOnly)
    float PropagationDelaySeconds = 0.0f;

    UPROPERTY(BlueprintReadOnly)
    float TailDelaySeconds = 0.0f;

    UPROPERTY(BlueprintReadOnly)
    float LowPassCutoffHz = 20000.0f;

    UPROPERTY(BlueprintReadOnly)
    float MaxDistanceCm = 45000.0f;

    UPROPERTY(BlueprintReadOnly)
    bool bVirtualizeWhenSilent = true;
};

USTRUCT(BlueprintType)
struct FHorizonFootstepMix
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadOnly)
    float Volume = 1.0f;

    UPROPERTY(BlueprintReadOnly)
    float Pitch = 1.0f;

    UPROPERTY(BlueprintReadOnly)
    float LowFrequencyGain = 0.25f;

    UPROPERTY(BlueprintReadOnly)
    float DebrisGain = 0.0f;

    UPROPERTY(BlueprintReadOnly)
    float SplashGain = 0.0f;
};

USTRUCT(BlueprintType)
struct FHorizonCreatureVocalMix
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadOnly)
    float Volume = 1.0f;

    UPROPERTY(BlueprintReadOnly)
    float Pitch = 1.0f;

    UPROPERTY(BlueprintReadOnly)
    float GrowlLayerGain = 0.0f;

    UPROPERTY(BlueprintReadOnly)
    float BreathLayerGain = 0.0f;

    UPROPERTY(BlueprintReadOnly)
    float ScreamLayerGain = 0.0f;

    UPROPERTY(BlueprintReadOnly)
    float LowPassCutoffHz = 20000.0f;

    UPROPERTY(BlueprintReadOnly)
    float ReverbSend = 0.0f;

    UPROPERTY(BlueprintReadOnly)
    float MaxDistanceCm = 24000.0f;

    UPROPERTY(BlueprintReadOnly)
    bool bVirtualizeWhenSilent = true;
};

USTRUCT(BlueprintType)
struct FHorizonRegionalAmbienceMix
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadOnly)
    float WindGain = 0.0f;

    UPROPERTY(BlueprintReadOnly)
    float RainGain = 0.0f;

    UPROPERTY(BlueprintReadOnly)
    float SnowGain = 0.0f;

    UPROPERTY(BlueprintReadOnly)
    float ThunderGain = 0.0f;

    UPROPERTY(BlueprintReadOnly)
    float FaunaGain = 0.0f;

    UPROPERTY(BlueprintReadOnly)
    float UrbanHumGain = 0.0f;

    UPROPERTY(BlueprintReadOnly)
    float WaterGain = 0.0f;

    UPROPERTY(BlueprintReadOnly)
    float VegetationGain = 0.0f;

    UPROPERTY(BlueprintReadOnly)
    float InteriorTransmission = 1.0f;
};

USTRUCT(BlueprintType)
struct FHorizonAudioMixState
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadOnly)
    float MusicIntensity = 0.0f;

    UPROPERTY(BlueprintReadOnly)
    float CombatIntensity = 0.0f;

    UPROPERTY(BlueprintReadOnly)
    float AmbienceGain = 1.0f;

    UPROPERTY(BlueprintReadOnly)
    float EffectsGain = 1.0f;

    UPROPERTY(BlueprintReadOnly)
    float TransientDuck = 0.0f;

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
    virtual void Deinitialize() override;

    UPROPERTY(BlueprintAssignable)
    FHorizonAudioStateChanged OnAudioStateChanged;

    UFUNCTION(BlueprintCallable, Category="Horizon|Audio")
    void SetAcousticSpace(EHorizonAcousticSpace NewSpace);

    UFUNCTION(BlueprintCallable, Category="Horizon|Audio")
    void SetThreatState(EHorizonThreatState NewThreat);

    UFUNCTION(BlueprintCallable, Category="Horizon|Audio")
    void SetWeatherState(EHorizonWeatherAudioState NewWeather);

    UFUNCTION(BlueprintCallable, Category="Horizon|Audio")
    void SetWeatherIntensity01(float NewIntensity);

    UFUNCTION(BlueprintCallable, Category="Horizon|Audio")
    void SetRegionalAmbience(EHorizonRegionalAmbience NewRegion);

    UFUNCTION(BlueprintCallable, Category="Horizon|Audio")
    void SetOcclusion01(float NewOcclusion);

    UFUNCTION(BlueprintCallable, Category="Horizon|Audio")
    void SetHordePressure01(float NewPressure);

    UFUNCTION(BlueprintCallable, Category="Horizon|Audio")
    void PushPlayerHitFeedback(float Damage01);

    UFUNCTION(BlueprintCallable, Category="Horizon|Audio")
    EHorizonSensoryStinger ConsumePendingStinger();

    UFUNCTION(BlueprintPure, Category="Horizon|Audio")
    FHorizonAudioMixState GetMixState(EHorizonGameMode Mode) const;

    UFUNCTION(BlueprintPure, Category="Horizon|Audio")
    FHorizonSpatialCueMix GetSpatialCueMix(
        EHorizonSpatialCueClass CueClass,
        float DistanceCm,
        bool bOccluded) const;

    UFUNCTION(BlueprintPure, Category="Horizon|Audio")
    FHorizonWeaponReportMix GetWeaponReportMix(
        EHorizonWeaponReportClass ReportClass,
        float DistanceCm,
        bool bOccluded,
        int32 VariationSeed = 0) const;

    UFUNCTION(BlueprintPure, Category="Horizon|Audio")
    FHorizonFootstepMix GetFootstepMix(
        EHorizonFootstepSurface Surface,
        float MovementSpeed01,
        bool bCrouched) const;

    UFUNCTION(BlueprintPure, Category="Horizon|Audio")
    FHorizonCreatureVocalMix GetCreatureVocalMix(
        EHorizonCreatureVocalArchetype Archetype,
        EHorizonCreatureVocalIntent Intent,
        float DistanceCm,
        bool bOccluded,
        int32 VariationSeed = 0) const;

    UFUNCTION(BlueprintPure, Category="Horizon|Audio")
    FHorizonRegionalAmbienceMix GetRegionalAmbienceMix() const;

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

    UPROPERTY()
    EHorizonRegionalAmbience RegionalAmbience = EHorizonRegionalAmbience::NortheastUrban;

    bool TickCombatMix(float DeltaSeconds);
    float ThreatToIntensity(EHorizonThreatState Threat) const;
    void QueueStinger(EHorizonSensoryStinger Stinger);

    float Occlusion01 = 0.0f;
    float HordePressure01 = 0.0f;
    float DesiredWeatherIntensity01 = 0.0f;
    float SmoothedWeatherIntensity01 = 0.0f;
    float DesiredCombatIntensity01 = 0.0f;
    float SmoothedCombatIntensity01 = 0.0f;
    float CombatReleaseHoldSeconds = 0.0f;
    float TransientDuck01 = 0.0f;
    float StingerCooldownSeconds = 0.0f;
    EHorizonSensoryStinger PendingStinger = EHorizonSensoryStinger::None;
    FDelegateHandle CombatTickerHandle;
};
