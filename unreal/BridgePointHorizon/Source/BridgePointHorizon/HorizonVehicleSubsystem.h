#pragma once

#include "CoreMinimal.h"
#include "GameFramework/SaveGame.h"
#include "Subsystems/GameInstanceSubsystem.h"
#include "HorizonVehicleSubsystem.generated.h"

UENUM(BlueprintType)
enum class EHorizonVehicleClass : uint8
{
    Sedan,
    Pickup,
    Offroad,
    UtilityVan
};

USTRUCT(BlueprintType)
struct FHorizonVehicleTuning
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadOnly)
    float FuelCapacityLiters = 55.0f;

    UPROPERTY(BlueprintReadOnly)
    float LitersPer100Km = 9.0f;

    UPROPERTY(BlueprintReadOnly)
    float IdleLitersPerHour = 1.2f;

    UPROPERTY(BlueprintReadOnly)
    float MaximumSpeedKph = 180.0f;
};

USTRUCT(BlueprintType)
struct FHorizonVehicleState
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadOnly)
    FGuid VehicleId;

    UPROPERTY(BlueprintReadOnly)
    EHorizonVehicleClass VehicleClass = EHorizonVehicleClass::Sedan;

    UPROPERTY(BlueprintReadOnly)
    float FuelLiters = 0.0f;

    UPROPERTY(BlueprintReadOnly)
    float Durability01 = 1.0f;

    UPROPERTY(BlueprintReadOnly)
    float OdometerKm = 0.0f;

    UPROPERTY(BlueprintReadOnly)
    FGuid ActiveDriverId;

    UPROPERTY(BlueprintReadOnly)
    bool bEngineRunning = false;

    UPROPERTY(BlueprintReadOnly)
    bool bDestroyed = false;
};

UCLASS()
class BRIDGEPOINTHORIZON_API UHorizonVehicleSaveGame : public USaveGame
{
    GENERATED_BODY()

public:
    UPROPERTY()
    TMap<FGuid, FHorizonVehicleState> Vehicles;
};

DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(
    FHorizonVehicleStateChanged,
    const FHorizonVehicleState&,
    VehicleState);

UCLASS()
class BRIDGEPOINTHORIZON_API UHorizonVehicleSubsystem : public UGameInstanceSubsystem
{
    GENERATED_BODY()

public:
    virtual void Initialize(FSubsystemCollectionBase& Collection) override;

    UPROPERTY(BlueprintAssignable)
    FHorizonVehicleStateChanged OnVehicleStateChanged;

    UFUNCTION(BlueprintCallable, Category="Horizon|Vehicle")
    bool RegisterVehicle(
        FGuid VehicleId,
        EHorizonVehicleClass VehicleClass,
        float InitialFuelLiters);

    UFUNCTION(BlueprintPure, Category="Horizon|Vehicle")
    bool GetVehicleState(FGuid VehicleId, FHorizonVehicleState& OutState) const;

    UFUNCTION(BlueprintCallable, Category="Horizon|Vehicle")
    bool TryStartEngine(FGuid VehicleId, FGuid DriverId);

    UFUNCTION(BlueprintCallable, Category="Horizon|Vehicle")
    bool StopEngine(FGuid VehicleId, FGuid DriverId);

    UFUNCTION(BlueprintCallable, Category="Horizon|Vehicle")
    bool AdvanceVehicle(
        FGuid VehicleId,
        FGuid DriverId,
        float DeltaSeconds,
        float SpeedKph,
        bool bCollision,
        float CollisionSeverity01);

    UFUNCTION(BlueprintCallable, Category="Horizon|Vehicle")
    bool RefuelFromInventory(FGuid VehicleId);

    UFUNCTION(BlueprintCallable, Category="Horizon|Vehicle")
    bool RepairFromInventory(FGuid VehicleId);

    UFUNCTION(BlueprintPure, Category="Horizon|Vehicle")
    static FHorizonVehicleTuning GetTuning(EHorizonVehicleClass VehicleClass);

    static bool CanStartEngine(const FHorizonVehicleState& State, FGuid DriverId);
    static bool IsDriverAuthorized(const FHorizonVehicleState& State, FGuid DriverId);
    static FHorizonVehicleState SimulateTravel(
        const FHorizonVehicleState& Input,
        const FHorizonVehicleTuning& Tuning,
        float DeltaSeconds,
        float SpeedKph,
        bool bCollision,
        float CollisionSeverity01);

private:
    static const TCHAR* SaveSlot;

    UPROPERTY()
    TObjectPtr<UHorizonVehicleSaveGame> State;

    void SaveState();
    void BroadcastVehicle(const FHorizonVehicleState& Vehicle);
};
