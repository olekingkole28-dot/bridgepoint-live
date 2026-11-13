#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "BPWorldPartitionAnchor.generated.h"

class UWorldPartitionStreamingSourceComponent;

UCLASS(BlueprintType)
class BRIDGEPOINTEARTH_API ABPWorldPartitionAnchor : public AActor
{
    GENERATED_BODY()

public:
    ABPWorldPartitionAnchor();
    virtual void Tick(float DeltaSeconds) override;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category="BridgePoint|Streaming")
    TObjectPtr<UWorldPartitionStreamingSourceComponent> StreamingSource;

    UFUNCTION(BlueprintCallable, Category="BridgePoint|Streaming")
    void FollowActor(AActor* Target);

    UFUNCTION(BlueprintCallable, Category="BridgePoint|Streaming")
    void SetStreamingEnabled(bool bEnabled);
};