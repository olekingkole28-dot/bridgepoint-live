#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "BridgePointEarthTypes.h"
#include "PCGData.h"
#include "BPPCGBridgeComponent.generated.h"

UCLASS(ClassGroup=(BridgePoint), meta=(BlueprintSpawnableComponent))
class BRIDGEPOINT_EARTH_API UBPPCGBridgeComponent : public UActorComponent
{
    GENERATED_BODY()

public:
    UBPPCGBridgeComponent();

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="BridgePoint|PCG")
    TArray<FBPGeoFeature> SourceFeatures;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="BridgePoint|PCG")
    double OriginLongitude = 0.0;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="BridgePoint|PCG")
    double OriginLatitude = 0.0;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="BridgePoint|PCG")
    float ClearanceSampleSpacingMeters = 8.0f;

    UFUNCTION(BlueprintCallable, Category="BridgePoint|PCG")
    FPCGDataCollection BuildStructuralCollection();

    UFUNCTION(BlueprintCallable, Category="BridgePoint|PCG")
    void SetSourceFeatures(const TArray<FBPGeoFeature>& Features);
};