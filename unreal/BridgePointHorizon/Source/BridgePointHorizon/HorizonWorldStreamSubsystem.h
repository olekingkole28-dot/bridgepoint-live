#pragma once

#include "CoreMinimal.h"
#include "HttpFwd.h"
#include "Subsystems/GameInstanceSubsystem.h"
#include "HorizonWorldStreamSubsystem.generated.h"

USTRUCT(BlueprintType)
struct FHorizonWorldBounds
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadOnly)
    double West = 0.0;

    UPROPERTY(BlueprintReadOnly)
    double South = 0.0;

    UPROPERTY(BlueprintReadOnly)
    double East = 0.0;

    UPROPERTY(BlueprintReadOnly)
    double North = 0.0;
};

USTRUCT(BlueprintType)
struct FHorizonWorldCellSummary
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadOnly)
    bool bComplete = false;

    UPROPERTY(BlueprintReadOnly)
    bool bStreamed = false;

    UPROPERTY(BlueprintReadOnly)
    FString StateCode;

    UPROPERTY(BlueprintReadOnly)
    FString JurisdictionName;

    UPROPERTY(BlueprintReadOnly)
    FString CellId;

    UPROPERTY(BlueprintReadOnly)
    double CenterLatitude = 0.0;

    UPROPERTY(BlueprintReadOnly)
    double CenterLongitude = 0.0;

    UPROPERTY(BlueprintReadOnly)
    double SpanKm = 0.0;

    UPROPERTY(BlueprintReadOnly)
    int64 BuildingCount = 0;

    UPROPERTY(BlueprintReadOnly)
    int64 BuildingPartCount = 0;

    UPROPERTY(BlueprintReadOnly)
    int64 ParcelCount = 0;

    UPROPERTY(BlueprintReadOnly)
    int64 RoadCount = 0;

    UPROPERTY(BlueprintReadOnly)
    FHorizonWorldBounds Bounds;

    UPROPERTY(BlueprintReadOnly)
    FString RawJson;
};

DECLARE_DYNAMIC_MULTICAST_DELEGATE_ThreeParams(
    FHorizonWorldCellLoaded,
    bool, bSuccess,
    FHorizonWorldCellSummary, Cell,
    const FString&, ErrorMessage);

UCLASS()
class BRIDGEPOINTHORIZON_API UHorizonWorldStreamSubsystem : public UGameInstanceSubsystem
{
    GENERATED_BODY()

public:
    UPROPERTY(BlueprintAssignable)
    FHorizonWorldCellLoaded OnWorldCellLoaded;

    UFUNCTION(BlueprintCallable, Category="Horizon|World")
    bool RequestWorldCell(
        const FString& StateCode,
        double Latitude,
        double Longitude,
        double SpanKm = 3.4,
        const FString& CellId = TEXT("HORIZON_UE"));

    UFUNCTION(BlueprintCallable, Category="Horizon|World")
    void CancelActiveRequest();

    UFUNCTION(BlueprintPure, Category="Horizon|World")
    bool IsRequestActive() const { return bRequestActive; }

    UFUNCTION(BlueprintPure, Category="Horizon|World")
    FHorizonWorldCellSummary GetLastCell() const { return LastCell; }

    UFUNCTION(BlueprintPure, Category="Horizon|World")
    FString GetEndpoint() const { return Endpoint; }

private:
    FString Endpoint = TEXT("https://xdfsjztwgsbmabshzsjw.supabase.co/functions/v1/bridgepoint-horizon-stream-v3020");

    bool bRequestActive = false;

    UPROPERTY()
    FHorizonWorldCellSummary LastCell;

    TSharedPtr<class IHttpRequest, ESPMode::ThreadSafe> ActiveRequest;

    void HandleResponse(
        FHttpRequestPtr Request,
        FHttpResponsePtr Response,
        bool bConnectedSuccessfully);
};
