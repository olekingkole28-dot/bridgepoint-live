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

    UPROPERTY(EditDefaultsOnly, BlueprintReadWrite, Category="BridgePoint|Earth|Startup", meta=(ClampMin="1000.0", ClampMax="30000000.0"))
    double InitialCameraAltitudeMeters = 16000000.0;

    virtual void StartPlay() override;
    virtual AActor* ChoosePlayerStart_Implementation(AController* Player) override;

private:
    UPROPERTY()
    TObjectPtr<APlayerStart> RuntimePlayerStart;

    void EnsureEarthWorld();
};
