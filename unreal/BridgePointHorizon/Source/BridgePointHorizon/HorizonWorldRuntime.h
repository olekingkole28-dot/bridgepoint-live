#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "HorizonWorldStreamSubsystem.h"
#include "HorizonWorldRuntime.generated.h"

class AHorizonWorldCellRenderer;

DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(
    FHorizonWorldRuntimeReady,
    bool, bSuccess,
    const FString&, Message);

UCLASS(BlueprintType)
class BRIDGEPOINTHORIZON_API AHorizonWorldRuntime : public AActor
{
    GENERATED_BODY()

public:
    AHorizonWorldRuntime();

    virtual void BeginPlay() override;
    virtual void EndPlay(const EEndPlayReason::Type EndPlayReason) override;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Horizon|World")
    FString StateCode = TEXT("CT");

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Horizon|World")
    double Latitude = 41.5623;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Horizon|World")
    double Longitude = -72.6506;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Horizon|World", meta=(ClampMin="0.75", ClampMax="5.5"))
    double SpanKm = 3.4;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Horizon|World")
    FString CellId = TEXT("HORIZON_UE_RUNTIME");

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Horizon|World")
    bool bRequestOnBeginPlay = true;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Horizon|World")
    TSubclassOf<AHorizonWorldCellRenderer> RendererClass;

    UPROPERTY(BlueprintAssignable)
    FHorizonWorldRuntimeReady OnWorldRuntimeReady;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category="Horizon|World")
    TObjectPtr<AHorizonWorldCellRenderer> Renderer;

    UFUNCTION(BlueprintCallable, Category="Horizon|World")
    bool RequestCurrentCell();

    UFUNCTION(BlueprintCallable, Category="Horizon|World")
    bool TravelToCell(const FString& NewStateCode, double NewLatitude, double NewLongitude);

private:
    UPROPERTY()
    TObjectPtr<UHorizonWorldStreamSubsystem> StreamSubsystem;

    UFUNCTION()
    void HandleWorldCellLoaded(
        bool bSuccess,
        FHorizonWorldCellSummary Cell,
        const FString& ErrorMessage);
};
