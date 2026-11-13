#pragma once

#include "CoreMinimal.h"
#include "GameFramework/GameModeBase.h"
#include "BridgePointEarthGameMode.generated.h"

class APlayerStart;

UCLASS()
class BRIDGEPOINTHORIZON_API ABridgePointEarthGameMode : public AGameModeBase
{
    GENERATED_BODY()

public:
    ABridgePointEarthGameMode();

    virtual void StartPlay() override;
    virtual AActor* ChoosePlayerStart_Implementation(AController* Player) override;

private:
    UPROPERTY()
    TObjectPtr<APlayerStart> RuntimePlayerStart;

    void EnsureEarthWorld();
};
