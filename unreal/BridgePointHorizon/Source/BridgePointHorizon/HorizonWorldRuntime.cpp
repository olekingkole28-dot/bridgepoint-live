#include "HorizonWorldRuntime.h"

#include "Engine/GameInstance.h"
#include "Engine/World.h"
#include "HorizonWorldCellRenderer.h"

AHorizonWorldRuntime::AHorizonWorldRuntime()
{
    PrimaryActorTick.bCanEverTick = false;
    RendererClass = AHorizonWorldCellRenderer::StaticClass();
}

void AHorizonWorldRuntime::BeginPlay()
{
    Super::BeginPlay();

    if (UWorld* World = GetWorld())
    {
        if (UGameInstance* GameInstance = World->GetGameInstance())
        {
            StreamSubsystem = GameInstance->GetSubsystem<UHorizonWorldStreamSubsystem>();
        }
    }

    if (StreamSubsystem)
    {
        StreamSubsystem->OnWorldCellLoaded.AddDynamic(
            this,
            &AHorizonWorldRuntime::HandleWorldCellLoaded);
    }

    if (!Renderer && GetWorld() && RendererClass)
    {
        FActorSpawnParameters Params;
        Params.Owner = this;
        Params.SpawnCollisionHandlingOverride = ESpawnActorCollisionHandlingMethod::AlwaysSpawn;

        Renderer = GetWorld()->SpawnActor<AHorizonWorldCellRenderer>(
            RendererClass,
            GetActorTransform(),
            Params);
    }

    if (bRequestOnBeginPlay)
    {
        RequestCurrentCell();
    }
}

void AHorizonWorldRuntime::EndPlay(const EEndPlayReason::Type EndPlayReason)
{
    if (StreamSubsystem)
    {
        StreamSubsystem->OnWorldCellLoaded.RemoveDynamic(
            this,
            &AHorizonWorldRuntime::HandleWorldCellLoaded);
    }

    Super::EndPlay(EndPlayReason);
}

bool AHorizonWorldRuntime::RequestCurrentCell()
{
    if (!StreamSubsystem)
    {
        OnWorldRuntimeReady.Broadcast(false, TEXT("BridgePoint world stream subsystem is unavailable."));
        return false;
    }

    return StreamSubsystem->RequestWorldCell(
        StateCode,
        Latitude,
        Longitude,
        SpanKm,
        CellId);
}

bool AHorizonWorldRuntime::TravelToCell(
    const FString& NewStateCode,
    double NewLatitude,
    double NewLongitude)
{
    if (StreamSubsystem && StreamSubsystem->IsRequestActive())
    {
        StreamSubsystem->CancelActiveRequest();
    }

    StateCode = NewStateCode.ToUpper();
    Latitude = NewLatitude;
    Longitude = NewLongitude;
    CellId = FString::Printf(
        TEXT("HORIZON_UE_%s_%.4f_%.4f"),
        *StateCode,
        Latitude,
        Longitude);

    return RequestCurrentCell();
}

void AHorizonWorldRuntime::HandleWorldCellLoaded(
    bool bSuccess,
    FHorizonWorldCellSummary Cell,
    const FString& ErrorMessage)
{
    if (!bSuccess)
    {
        OnWorldRuntimeReady.Broadcast(false, ErrorMessage);
        return;
    }

    if (!Renderer)
    {
        OnWorldRuntimeReady.Broadcast(false, TEXT("Horizon world renderer is unavailable."));
        return;
    }

    if (!Renderer->RenderCellJson(Cell.RawJson))
    {
        OnWorldRuntimeReady.Broadcast(false, TEXT("Horizon world renderer could not build the streamed cell."));
        return;
    }

    const FString Message = FString::Printf(
        TEXT("%s ready: %lld buildings, %d detailed parts, %d road segments, %d water features"),
        Cell.JurisdictionName.IsEmpty() ? *StateCode : *Cell.JurisdictionName,
        Cell.BuildingCount,
        Renderer->GetRenderedBuildingPartCount(),
        Renderer->GetRenderedRoadSegmentCount(),
        Renderer->GetRenderedWaterFeatureCount());

    OnWorldRuntimeReady.Broadcast(true, Message);
}
