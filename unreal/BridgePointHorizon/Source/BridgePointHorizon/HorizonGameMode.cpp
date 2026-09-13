#include "HorizonGameMode.h"

#include "EngineUtils.h"
#include "Engine/World.h"
#include "GameFramework/PlayerStart.h"
#include "HorizonPlayerCharacter.h"
#include "HorizonWorldRuntime.h"

AHorizonGameMode::AHorizonGameMode()
{
    DefaultPawnClass = AHorizonPlayerCharacter::StaticClass();
    bStartPlayersAsSpectators = false;
}

void AHorizonGameMode::StartPlay()
{
    EnsureWorldRuntime();
    Super::StartPlay();
}

AActor* AHorizonGameMode::ChoosePlayerStart_Implementation(AController* Player)
{
    if (AActor* Existing = Super::ChoosePlayerStart_Implementation(Player))
    {
        return Existing;
    }

    if (!RuntimePlayerStart && GetWorld())
    {
        FActorSpawnParameters Params;
        Params.SpawnCollisionHandlingOverride = ESpawnActorCollisionHandlingMethod::AlwaysSpawn;
        RuntimePlayerStart = GetWorld()->SpawnActor<APlayerStart>(
            APlayerStart::StaticClass(),
            FVector(0.0f, 0.0f, 500.0f),
            FRotator::ZeroRotator,
            Params);
    }

    return RuntimePlayerStart;
}

void AHorizonGameMode::EnsureWorldRuntime()
{
    if (!GetWorld())
    {
        return;
    }

    for (TActorIterator<AHorizonWorldRuntime> It(GetWorld()); It; ++It)
    {
        return;
    }

    FActorSpawnParameters Params;
    Params.SpawnCollisionHandlingOverride = ESpawnActorCollisionHandlingMethod::AlwaysSpawn;

    GetWorld()->SpawnActor<AHorizonWorldRuntime>(
        AHorizonWorldRuntime::StaticClass(),
        FTransform::Identity,
        Params);
}
