#include "BridgePointEarthGameMode.h"

#include "BridgePointEarthCameraPawn.h"
#include "BridgePointEarthWorld.h"
#include "Engine/World.h"
#include "EngineUtils.h"
#include "GameFramework/PlayerStart.h"

ABridgePointEarthGameMode::ABridgePointEarthGameMode()
{
    DefaultPawnClass = ABridgePointEarthCameraPawn::StaticClass();
    bStartPlayersAsSpectators = false;
}

void ABridgePointEarthGameMode::StartPlay()
{
    EnsureEarthWorld();
    Super::StartPlay();
}

void ABridgePointEarthGameMode::EnsureEarthWorld()
{
    if (!GetWorld())
    {
        return;
    }

    for (TActorIterator<ABridgePointEarthWorld> It(GetWorld()); It; ++It)
    {
        return;
    }

    FActorSpawnParameters Params;
    Params.SpawnCollisionHandlingOverride =
        ESpawnActorCollisionHandlingMethod::AlwaysSpawn;

    GetWorld()->SpawnActor<ABridgePointEarthWorld>(
        ABridgePointEarthWorld::StaticClass(),
        FTransform::Identity,
        Params);
}

AActor* ABridgePointEarthGameMode::ChoosePlayerStart_Implementation(AController* Player)
{
    if (RuntimePlayerStart)
    {
        return RuntimePlayerStart;
    }

    if (!GetWorld())
    {
        return Super::ChoosePlayerStart_Implementation(Player);
    }

    FActorSpawnParameters Params;
    Params.SpawnCollisionHandlingOverride =
        ESpawnActorCollisionHandlingMethod::AlwaysSpawn;

    constexpr double InitialAltitudeCentimeters = 16000000.0 * 100.0;
    RuntimePlayerStart = GetWorld()->SpawnActor<APlayerStart>(
        APlayerStart::StaticClass(),
        FVector(0.0, 0.0, InitialAltitudeCentimeters),
        FRotator::ZeroRotator,
        Params);

    return RuntimePlayerStart
        ? RuntimePlayerStart.Get()
        : Super::ChoosePlayerStart_Implementation(Player);
}
