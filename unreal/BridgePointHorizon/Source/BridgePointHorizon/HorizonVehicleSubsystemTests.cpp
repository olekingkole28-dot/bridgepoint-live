#if WITH_DEV_AUTOMATION_TESTS

#include "HorizonVehicleSubsystem.h"

#include "Misc/AutomationTest.h"

IMPLEMENT_SIMPLE_AUTOMATION_TEST(
    FHorizonVehicleDriverGuardTest,
    "BridgePoint.Horizon.Systems.Vehicle.DriverGuard",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FHorizonVehicleDriverGuardTest::RunTest(const FString& Parameters)
{
    const FGuid VehicleId(1, 2, 3, 4);
    const FGuid DriverA(5, 6, 7, 8);
    const FGuid DriverB(9, 10, 11, 12);

    FHorizonVehicleState Vehicle;
    Vehicle.VehicleId = VehicleId;
    Vehicle.FuelLiters = 20.0f;
    Vehicle.Durability01 = 1.0f;

    TestTrue(TEXT("Operational unoccupied vehicle accepts a valid driver"),
        UHorizonVehicleSubsystem::CanStartEngine(Vehicle, DriverA));
    Vehicle.ActiveDriverId = DriverA;
    TestTrue(TEXT("Active driver remains authorized"),
        UHorizonVehicleSubsystem::IsDriverAuthorized(Vehicle, DriverA));
    TestFalse(TEXT("Second driver cannot take over an occupied vehicle"),
        UHorizonVehicleSubsystem::CanStartEngine(Vehicle, DriverB));
    TestFalse(TEXT("Non-driver cannot advance vehicle state"),
        UHorizonVehicleSubsystem::IsDriverAuthorized(Vehicle, DriverB));

    Vehicle.bDestroyed = true;
    TestFalse(TEXT("Destroyed vehicle cannot start"),
        UHorizonVehicleSubsystem::CanStartEngine(Vehicle, DriverA));
    Vehicle.bDestroyed = false;
    Vehicle.FuelLiters = 0.0f;
    TestFalse(TEXT("Empty vehicle cannot start"),
        UHorizonVehicleSubsystem::CanStartEngine(Vehicle, DriverA));
    return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(
    FHorizonVehicleTravelSimulationTest,
    "BridgePoint.Horizon.Systems.Vehicle.TravelSimulation",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FHorizonVehicleTravelSimulationTest::RunTest(const FString& Parameters)
{
    FHorizonVehicleState Vehicle;
    Vehicle.VehicleId = FGuid(20, 21, 22, 23);
    Vehicle.ActiveDriverId = FGuid(30, 31, 32, 33);
    Vehicle.VehicleClass = EHorizonVehicleClass::Sedan;
    Vehicle.FuelLiters = 25.0f;
    Vehicle.Durability01 = 1.0f;
    Vehicle.bEngineRunning = true;

    const FHorizonVehicleTuning Tuning =
        UHorizonVehicleSubsystem::GetTuning(EHorizonVehicleClass::Sedan);
    const FHorizonVehicleState Travelled =
        UHorizonVehicleSubsystem::SimulateTravel(
            Vehicle, Tuning, 1.0f, 60.0f, false, 0.0f);
    TestTrue(TEXT("Driven distance advances odometer"), Travelled.OdometerKm > 0.0f);
    TestTrue(TEXT("Engine travel consumes fuel"), Travelled.FuelLiters < Vehicle.FuelLiters);
    TestEqual(TEXT("Ordinary travel does not damage vehicle"),
        Travelled.Durability01, Vehicle.Durability01);

    const FHorizonVehicleState Collided =
        UHorizonVehicleSubsystem::SimulateTravel(
            Vehicle, Tuning, 1.0f, 30.0f, true, 0.75f);
    TestTrue(TEXT("Collision severity reduces durability"),
        Collided.Durability01 < Vehicle.Durability01);

    const FHorizonVehicleState OneSecond =
        UHorizonVehicleSubsystem::SimulateTravel(
            Vehicle, Tuning, 1.0f, 100.0f, false, 0.0f);
    const FHorizonVehicleState ResumeSpike =
        UHorizonVehicleSubsystem::SimulateTravel(
            Vehicle, Tuning, 30.0f, 100.0f, false, 0.0f);
    TestTrue(TEXT("Resume spike cannot consume unbounded travel time"),
        FMath::IsNearlyEqual(ResumeSpike.OdometerKm, OneSecond.OdometerKm));
    TestTrue(TEXT("Resume spike fuel cost is bounded"),
        FMath::IsNearlyEqual(ResumeSpike.FuelLiters, OneSecond.FuelLiters));

    Vehicle.FuelLiters = 0.001f;
    const FHorizonVehicleState Exhausted =
        UHorizonVehicleSubsystem::SimulateTravel(
            Vehicle, Tuning, 1.0f, 60.0f, false, 0.0f);
    TestEqual(TEXT("Fuel exhaustion clamps at zero"), Exhausted.FuelLiters, 0.0f);
    TestFalse(TEXT("Fuel exhaustion stops engine"), Exhausted.bEngineRunning);
    TestFalse(TEXT("Fuel exhaustion releases driver"), Exhausted.ActiveDriverId.IsValid());
    return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(
    FHorizonVehicleTuningTest,
    "BridgePoint.Horizon.Systems.Vehicle.ClassTuning",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FHorizonVehicleTuningTest::RunTest(const FString& Parameters)
{
    const FHorizonVehicleTuning Sedan =
        UHorizonVehicleSubsystem::GetTuning(EHorizonVehicleClass::Sedan);
    const FHorizonVehicleTuning Pickup =
        UHorizonVehicleSubsystem::GetTuning(EHorizonVehicleClass::Pickup);
    const FHorizonVehicleTuning Offroad =
        UHorizonVehicleSubsystem::GetTuning(EHorizonVehicleClass::Offroad);
    TestTrue(TEXT("Pickup carries more fuel than sedan"),
        Pickup.FuelCapacityLiters > Sedan.FuelCapacityLiters);
    TestTrue(TEXT("Offroad vehicle trades efficiency for traversal profile"),
        Offroad.LitersPer100Km > Sedan.LitersPer100Km);
    TestTrue(TEXT("All class speed caps remain positive"),
        Sedan.MaximumSpeedKph > 0.0f &&
        Pickup.MaximumSpeedKph > 0.0f &&
        Offroad.MaximumSpeedKph > 0.0f);
    TestEqual(TEXT("Sedan resolves to sedan acoustic identity"),
        UHorizonVehicleSubsystem::ResolveAudioClass(EHorizonVehicleClass::Sedan),
        EHorizonVehicleAudioClass::Sedan);
    TestEqual(TEXT("Pickup resolves to pickup acoustic identity"),
        UHorizonVehicleSubsystem::ResolveAudioClass(EHorizonVehicleClass::Pickup),
        EHorizonVehicleAudioClass::Pickup);
    TestEqual(TEXT("Offroad resolves to offroad acoustic identity"),
        UHorizonVehicleSubsystem::ResolveAudioClass(EHorizonVehicleClass::Offroad),
        EHorizonVehicleAudioClass::Offroad);
    TestEqual(TEXT("Utility van resolves to utility van acoustic identity"),
        UHorizonVehicleSubsystem::ResolveAudioClass(EHorizonVehicleClass::UtilityVan),
        EHorizonVehicleAudioClass::UtilityVan);
    return true;
}


IMPLEMENT_SIMPLE_AUTOMATION_TEST(
    FHorizonVehicleBroadcastBudgetTest,
    "BridgePoint.Horizon.Performance.Vehicle.BroadcastBudget",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FHorizonVehicleBroadcastBudgetTest::RunTest(const FString& Parameters)
{
    float Accumulator = 0.0f;
    for (int32 Frame = 0; Frame < 6; ++Frame)
    {
        TestFalse(TEXT("Sub-budget travel frame does not broadcast"),
            UHorizonVehicleSubsystem::ShouldBroadcastTravelUpdate(
                Accumulator, 0.016f, false, false, Accumulator));
    }
    TestTrue(TEXT("Travel update broadcasts when ten-hertz budget is reached"),
        UHorizonVehicleSubsystem::ShouldBroadcastTravelUpdate(
            Accumulator, 0.016f, false, false, Accumulator));
    TestTrue(TEXT("Broadcast remainder remains below interval"),
        Accumulator >= 0.0f && Accumulator < 0.10f);

    TestTrue(TEXT("Collision feedback bypasses travel throttle"),
        UHorizonVehicleSubsystem::ShouldBroadcastTravelUpdate(
            0.0f, 0.001f, true, false, Accumulator));
    TestEqual(TEXT("Collision clears broadcast remainder"), Accumulator, 0.0f);

    TestTrue(TEXT("Engine shutdown bypasses travel throttle"),
        UHorizonVehicleSubsystem::ShouldBroadcastTravelUpdate(
            0.0f, 0.001f, false, true, Accumulator));
    TestFalse(TEXT("Invalid frame delta cannot synthesize a broadcast"),
        UHorizonVehicleSubsystem::ShouldBroadcastTravelUpdate(
            0.0f, -1.0f, false, false, Accumulator));
    return true;
}

#endif
