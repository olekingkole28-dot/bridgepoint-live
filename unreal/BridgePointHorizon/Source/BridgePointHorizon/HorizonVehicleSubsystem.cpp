#include "HorizonVehicleSubsystem.h"

#include "HorizonSurvivalSubsystem.h"
#include "Engine/GameInstance.h"
#include "Kismet/GameplayStatics.h"

const TCHAR* UHorizonVehicleSubsystem::SaveSlot = TEXT("BridgePointHorizonVehicles");

void UHorizonVehicleSubsystem::Initialize(FSubsystemCollectionBase& Collection)
{
    Super::Initialize(Collection);
    TravelBroadcastAccumulators.Reset();

    if (USaveGame* Loaded = UGameplayStatics::LoadGameFromSlot(SaveSlot, 0))
    {
        State = Cast<UHorizonVehicleSaveGame>(Loaded);
    }

    if (!State)
    {
        State = Cast<UHorizonVehicleSaveGame>(
            UGameplayStatics::CreateSaveGameObject(UHorizonVehicleSaveGame::StaticClass()));
        SaveState();
        return;
    }

    TArray<FGuid> InvalidVehicleIds;
    for (TPair<FGuid, FHorizonVehicleState>& Entry : State->Vehicles)
    {
        if (!Entry.Key.IsValid())
        {
            InvalidVehicleIds.Add(Entry.Key);
            continue;
        }

        FHorizonVehicleState& Vehicle = Entry.Value;
        const FHorizonVehicleTuning Tuning = GetTuning(Vehicle.VehicleClass);
        Vehicle.VehicleId = Entry.Key;
        Vehicle.FuelLiters = FMath::Clamp(Vehicle.FuelLiters, 0.0f, Tuning.FuelCapacityLiters);
        Vehicle.Durability01 = FMath::Clamp(Vehicle.Durability01, 0.0f, 1.0f);
        Vehicle.OdometerKm = FMath::Max(0.0f, Vehicle.OdometerKm);
        Vehicle.bDestroyed = Vehicle.Durability01 <= KINDA_SMALL_NUMBER;
        Vehicle.bEngineRunning = false;
        Vehicle.ActiveDriverId.Invalidate();
    }
    for (const FGuid& InvalidId : InvalidVehicleIds)
    {
        State->Vehicles.Remove(InvalidId);
    }
    SaveState();
}

FHorizonVehicleTuning UHorizonVehicleSubsystem::GetTuning(
    EHorizonVehicleClass VehicleClass)
{
    FHorizonVehicleTuning Tuning;
    switch (VehicleClass)
    {
        case EHorizonVehicleClass::Sedan:
            Tuning.FuelCapacityLiters = 55.0f;
            Tuning.LitersPer100Km = 8.6f;
            Tuning.IdleLitersPerHour = 1.1f;
            Tuning.MaximumSpeedKph = 190.0f;
            break;
        case EHorizonVehicleClass::Pickup:
            Tuning.FuelCapacityLiters = 82.0f;
            Tuning.LitersPer100Km = 13.4f;
            Tuning.IdleLitersPerHour = 1.7f;
            Tuning.MaximumSpeedKph = 170.0f;
            break;
        case EHorizonVehicleClass::Offroad:
            Tuning.FuelCapacityLiters = 70.0f;
            Tuning.LitersPer100Km = 15.2f;
            Tuning.IdleLitersPerHour = 1.8f;
            Tuning.MaximumSpeedKph = 145.0f;
            break;
        case EHorizonVehicleClass::UtilityVan:
            Tuning.FuelCapacityLiters = 90.0f;
            Tuning.LitersPer100Km = 12.8f;
            Tuning.IdleLitersPerHour = 1.6f;
            Tuning.MaximumSpeedKph = 155.0f;
            break;
    }
    return Tuning;
}

EHorizonVehicleAudioClass UHorizonVehicleSubsystem::ResolveAudioClass(
    EHorizonVehicleClass VehicleClass)
{
    switch (VehicleClass)
    {
        case EHorizonVehicleClass::Pickup:
            return EHorizonVehicleAudioClass::Pickup;
        case EHorizonVehicleClass::Offroad:
            return EHorizonVehicleAudioClass::Offroad;
        case EHorizonVehicleClass::UtilityVan:
            return EHorizonVehicleAudioClass::UtilityVan;
        case EHorizonVehicleClass::Sedan:
        default:
            return EHorizonVehicleAudioClass::Sedan;
    }
}

bool UHorizonVehicleSubsystem::CanStartEngine(
    const FHorizonVehicleState& Vehicle,
    FGuid DriverId)
{
    return Vehicle.VehicleId.IsValid() &&
        DriverId.IsValid() &&
        !Vehicle.bDestroyed &&
        Vehicle.Durability01 > KINDA_SMALL_NUMBER &&
        Vehicle.FuelLiters > KINDA_SMALL_NUMBER &&
        (!Vehicle.ActiveDriverId.IsValid() || Vehicle.ActiveDriverId == DriverId);
}

bool UHorizonVehicleSubsystem::IsDriverAuthorized(
    const FHorizonVehicleState& Vehicle,
    FGuid DriverId)
{
    return DriverId.IsValid() &&
        Vehicle.ActiveDriverId.IsValid() &&
        Vehicle.ActiveDriverId == DriverId;
}

bool UHorizonVehicleSubsystem::ShouldBroadcastTravelUpdate(
    float AccumulatedSeconds,
    float DeltaSeconds,
    bool bCollision,
    bool bStopped,
    float& OutRemainderSeconds)
{
    constexpr float BroadcastIntervalSeconds = 0.10f;
    const float SafeAccumulated = FMath::IsFinite(AccumulatedSeconds)
        ? FMath::Max(0.0f, AccumulatedSeconds)
        : 0.0f;
    const float SafeDelta = FMath::IsFinite(DeltaSeconds)
        ? FMath::Clamp(DeltaSeconds, 0.0f, 1.0f)
        : 0.0f;

    if (bCollision || bStopped)
    {
        OutRemainderSeconds = 0.0f;
        return true;
    }

    const float TotalSeconds = SafeAccumulated + SafeDelta;
    if (TotalSeconds + KINDA_SMALL_NUMBER < BroadcastIntervalSeconds)
    {
        OutRemainderSeconds = TotalSeconds;
        return false;
    }

    OutRemainderSeconds = FMath::Fmod(TotalSeconds, BroadcastIntervalSeconds);
    return true;
}

FHorizonVehicleState UHorizonVehicleSubsystem::SimulateTravel(
    const FHorizonVehicleState& Input,
    const FHorizonVehicleTuning& Tuning,
    float DeltaSeconds,
    float SpeedKph,
    bool bCollision,
    float CollisionSeverity01)
{
    FHorizonVehicleState Output = Input;
    if (!Output.bEngineRunning ||
        Output.bDestroyed ||
        Output.FuelLiters <= KINDA_SMALL_NUMBER ||
        Output.Durability01 <= KINDA_SMALL_NUMBER ||
        !FMath::IsFinite(DeltaSeconds) ||
        DeltaSeconds <= 0.0f)
    {
        return Output;
    }

    // Preserve ordinary frame hitches while preventing resume-from-background
    // from consuming fuel or applying collision damage for unbounded wall time.
    const float SafeDeltaSeconds = FMath::Min(DeltaSeconds, 1.0f);
    const float SafeMaximumSpeed = FMath::Max(1.0f, Tuning.MaximumSpeedKph);
    const float SafeSpeedKph = FMath::Clamp(
        FMath::IsFinite(SpeedKph) ? SpeedKph : 0.0f,
        0.0f,
        SafeMaximumSpeed);
    const float DistanceKm = SafeSpeedKph * SafeDeltaSeconds / 3600.0f;
    const float FuelUsed =
        FMath::Max(0.0f, Tuning.IdleLitersPerHour) * SafeDeltaSeconds / 3600.0f +
        DistanceKm * FMath::Max(0.0f, Tuning.LitersPer100Km) / 100.0f;

    const float FuelScale = FuelUsed > KINDA_SMALL_NUMBER
        ? FMath::Clamp(Output.FuelLiters / FuelUsed, 0.0f, 1.0f)
        : 1.0f;
    Output.OdometerKm += DistanceKm * FuelScale;
    Output.FuelLiters = FMath::Clamp(
        Output.FuelLiters - FuelUsed,
        0.0f,
        FMath::Max(1.0f, Tuning.FuelCapacityLiters));

    if (bCollision)
    {
        const float Severity = FMath::Clamp(
            FMath::IsFinite(CollisionSeverity01) ? CollisionSeverity01 : 0.0f,
            0.0f,
            1.0f);
        Output.Durability01 = FMath::Clamp(
            Output.Durability01 - Severity * 0.18f,
            0.0f,
            1.0f);
    }

    Output.bDestroyed = Output.Durability01 <= KINDA_SMALL_NUMBER;
    if (Output.bDestroyed || Output.FuelLiters <= KINDA_SMALL_NUMBER)
    {
        Output.bEngineRunning = false;
        Output.ActiveDriverId.Invalidate();
    }
    return Output;
}

bool UHorizonVehicleSubsystem::RegisterVehicle(
    FGuid VehicleId,
    EHorizonVehicleClass VehicleClass,
    float InitialFuelLiters)
{
    if (!State || !VehicleId.IsValid() || State->Vehicles.Contains(VehicleId))
    {
        return false;
    }

    const FHorizonVehicleTuning Tuning = GetTuning(VehicleClass);
    FHorizonVehicleState Vehicle;
    Vehicle.VehicleId = VehicleId;
    Vehicle.VehicleClass = VehicleClass;
    Vehicle.FuelLiters = FMath::Clamp(
        FMath::IsFinite(InitialFuelLiters) ? InitialFuelLiters : 0.0f,
        0.0f,
        Tuning.FuelCapacityLiters);
    State->Vehicles.Add(VehicleId, Vehicle);
    SaveState();
    BroadcastVehicle(Vehicle);
    return true;
}

bool UHorizonVehicleSubsystem::GetVehicleState(
    FGuid VehicleId,
    FHorizonVehicleState& OutState) const
{
    if (!State)
    {
        return false;
    }
    if (const FHorizonVehicleState* Found = State->Vehicles.Find(VehicleId))
    {
        OutState = *Found;
        return true;
    }
    return false;
}

bool UHorizonVehicleSubsystem::TryStartEngine(FGuid VehicleId, FGuid DriverId)
{
    if (!State)
    {
        return false;
    }
    FHorizonVehicleState* Vehicle = State->Vehicles.Find(VehicleId);
    if (!Vehicle || !CanStartEngine(*Vehicle, DriverId))
    {
        return false;
    }

    Vehicle->ActiveDriverId = DriverId;
    Vehicle->bEngineRunning = true;
    TravelBroadcastAccumulators.FindOrAdd(VehicleId) = 0.0f;
    SaveState();
    BroadcastVehicle(*Vehicle);
    BroadcastVehicleAudio(*Vehicle, 0.0f);
    return true;
}

bool UHorizonVehicleSubsystem::StopEngine(FGuid VehicleId, FGuid DriverId)
{
    if (!State)
    {
        return false;
    }
    FHorizonVehicleState* Vehicle = State->Vehicles.Find(VehicleId);
    if (!Vehicle || !IsDriverAuthorized(*Vehicle, DriverId))
    {
        return false;
    }

    Vehicle->bEngineRunning = false;
    Vehicle->ActiveDriverId.Invalidate();
    TravelBroadcastAccumulators.Remove(VehicleId);
    SaveState();
    BroadcastVehicle(*Vehicle);
    BroadcastVehicleAudio(*Vehicle, 0.0f);
    return true;
}

bool UHorizonVehicleSubsystem::AdvanceVehicle(
    FGuid VehicleId,
    FGuid DriverId,
    float DeltaSeconds,
    float SpeedKph,
    bool bCollision,
    float CollisionSeverity01)
{
    if (!State)
    {
        return false;
    }
    FHorizonVehicleState* Vehicle = State->Vehicles.Find(VehicleId);
    if (!Vehicle ||
        !Vehicle->bEngineRunning ||
        !IsDriverAuthorized(*Vehicle, DriverId))
    {
        return false;
    }

    const int32 PreviousCheckpoint = FMath::FloorToInt(Vehicle->OdometerKm * 4.0f);
    const bool bWasRunning = Vehicle->bEngineRunning;
    *Vehicle = SimulateTravel(
        *Vehicle,
        GetTuning(Vehicle->VehicleClass),
        DeltaSeconds,
        SpeedKph,
        bCollision,
        CollisionSeverity01);

    const bool bStopped = bWasRunning && !Vehicle->bEngineRunning;
    const int32 NewCheckpoint = FMath::FloorToInt(Vehicle->OdometerKm * 4.0f);
    if (NewCheckpoint != PreviousCheckpoint || bStopped)
    {
        SaveState();
    }

    float& BroadcastAccumulator = TravelBroadcastAccumulators.FindOrAdd(VehicleId);
    if (ShouldBroadcastTravelUpdate(
            BroadcastAccumulator,
            DeltaSeconds,
            bCollision,
            bStopped,
            BroadcastAccumulator))
    {
        BroadcastVehicle(*Vehicle);
        BroadcastVehicleAudio(*Vehicle, SpeedKph);
    }
    if (bStopped)
    {
        TravelBroadcastAccumulators.Remove(VehicleId);
    }
    return true;
}

bool UHorizonVehicleSubsystem::RefuelFromInventory(FGuid VehicleId)
{
    if (!State)
    {
        return false;
    }
    FHorizonVehicleState* Vehicle = State->Vehicles.Find(VehicleId);
    if (!Vehicle || Vehicle->bEngineRunning || Vehicle->bDestroyed)
    {
        return false;
    }

    const FHorizonVehicleTuning Tuning = GetTuning(Vehicle->VehicleClass);
    if (Vehicle->FuelLiters >= Tuning.FuelCapacityLiters - KINDA_SMALL_NUMBER)
    {
        return false;
    }

    UGameInstance* GameInstance = GetGameInstance();
    UHorizonSurvivalSubsystem* Survival =
        GameInstance ? GameInstance->GetSubsystem<UHorizonSurvivalSubsystem>() : nullptr;
    if (!Survival || !Survival->TryRemoveItem(TEXT("fuel_can"), 1))
    {
        return false;
    }

    Vehicle->FuelLiters = FMath::Min(
        Tuning.FuelCapacityLiters,
        Vehicle->FuelLiters + 10.0f);
    SaveState();
    BroadcastVehicle(*Vehicle);
    return true;
}

bool UHorizonVehicleSubsystem::RepairFromInventory(FGuid VehicleId)
{
    if (!State)
    {
        return false;
    }
    FHorizonVehicleState* Vehicle = State->Vehicles.Find(VehicleId);
    if (!Vehicle || Vehicle->bEngineRunning ||
        Vehicle->Durability01 >= 1.0f - KINDA_SMALL_NUMBER)
    {
        return false;
    }

    UGameInstance* GameInstance = GetGameInstance();
    UHorizonSurvivalSubsystem* Survival =
        GameInstance ? GameInstance->GetSubsystem<UHorizonSurvivalSubsystem>() : nullptr;
    if (!Survival || !Survival->TryRemoveItem(TEXT("repair_kit"), 1))
    {
        return false;
    }

    Vehicle->Durability01 = FMath::Min(1.0f, Vehicle->Durability01 + 0.35f);
    Vehicle->bDestroyed = false;
    SaveState();
    BroadcastVehicle(*Vehicle);
    return true;
}

void UHorizonVehicleSubsystem::SaveState()
{
    if (State)
    {
        UGameplayStatics::SaveGameToSlot(State, SaveSlot, 0);
    }
}

void UHorizonVehicleSubsystem::BroadcastVehicleAudio(
    const FHorizonVehicleState& Vehicle,
    float SpeedKph)
{
    const FHorizonVehicleTuning Tuning = GetTuning(Vehicle.VehicleClass);
    const float SafeSpeedKph = FMath::IsFinite(SpeedKph)
        ? FMath::Clamp(SpeedKph, 0.0f, Tuning.MaximumSpeedKph)
        : 0.0f;
    const float EngineLoad01 = Tuning.MaximumSpeedKph > KINDA_SMALL_NUMBER
        ? SafeSpeedKph / Tuning.MaximumSpeedKph
        : 0.0f;
    const int32 VariationSeed =
        static_cast<int32>(GetTypeHash(Vehicle.VehicleId)) ^
        FMath::FloorToInt(Vehicle.OdometerKm * 10.0f);

    FHorizonVehicleAudioFrame Frame;
    Frame.VehicleId = Vehicle.VehicleId;
    Frame.SpeedKph = SafeSpeedKph;

    UGameInstance* GameInstance = GetGameInstance();
    UHorizonAudioDirectorSubsystem* Audio =
        GameInstance ? GameInstance->GetSubsystem<UHorizonAudioDirectorSubsystem>() : nullptr;
    if (Audio)
    {
        Frame.Mix = Audio->GetVehicleAudioMix(
            ResolveAudioClass(Vehicle.VehicleClass),
            Vehicle.bEngineRunning,
            SafeSpeedKph,
            EngineLoad01,
            Vehicle.Durability01,
            0.0f,
            true,
            false,
            VariationSeed);
    }
    else
    {
        Frame.Mix = UHorizonAudioDirectorSubsystem::BuildVehicleAudioMix(
            ResolveAudioClass(Vehicle.VehicleClass),
            Vehicle.bEngineRunning,
            SafeSpeedKph,
            EngineLoad01,
            Vehicle.Durability01,
            0.0f,
            true,
            false,
            VariationSeed);
    }

    OnVehicleAudioUpdated.Broadcast(Frame);
}

void UHorizonVehicleSubsystem::BroadcastVehicle(
    const FHorizonVehicleState& Vehicle)
{
    OnVehicleStateChanged.Broadcast(Vehicle);
}
