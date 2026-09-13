#pragma once

#include "CoreMinimal.h"
#include "GameFramework/GameModeBase.h"
#include "HorizonGameMode.generated.h"

UCLASS()
class BRIDGEPOINTHORIZON_API AHorizonGameMode : public AGameModeBase
{
    GENERATED_BODY()

public:
    AHorizonGameMode();

    virtual void StartPlay() override;
    virtual AActor* ChoosePlayerStart_Implementation(AController* Player) override;

private:
    UPROPERTY()
    TObjectPtr<AActor> RuntimePlayerStart;

    void EnsureWorldRuntime();
};
