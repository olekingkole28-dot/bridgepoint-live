#include "HorizonWorldStreamSubsystem.h"

#include "Dom/JsonObject.h"
#include "HttpModule.h"
#include "Interfaces/IHttpRequest.h"
#include "Interfaces/IHttpResponse.h"
#include "Serialization/JsonReader.h"
#include "Serialization/JsonSerializer.h"

namespace HorizonWorldStream
{
    static double NumberFieldOr(
        const TSharedPtr<FJsonObject>& Object,
        const TCHAR* Field,
        double Fallback = 0.0)
    {
        if (!Object.IsValid())
        {
            return Fallback;
        }

        double Value = Fallback;
        Object->TryGetNumberField(Field, Value);
        return Value;
    }

    static int64 IntFieldOr(
        const TSharedPtr<FJsonObject>& Object,
        const TCHAR* Field,
        int64 Fallback = 0)
    {
        return static_cast<int64>(FMath::RoundToInt(NumberFieldOr(Object, Field, static_cast<double>(Fallback))));
    }
}

FString UHorizonWorldStreamSubsystem::MakeCacheKey(
    const FString& StateCode,
    double Latitude,
    double Longitude,
    double SpanKm,
    const FString& CellId) const
{
    return FString::Printf(
        TEXT("%s|%.5f|%.5f|%.3f|%s"),
        *StateCode.ToUpper(),
        Latitude,
        Longitude,
        SpanKm,
        *CellId);
}

bool UHorizonWorldStreamSubsystem::TryServeCachedCell(const FString& CacheKey)
{
    const FHorizonWorldCellSummary* Cached = CellCache.Find(CacheKey);
    const FDateTime* StoredUtc = CellCacheStoredUtc.Find(CacheKey);

    if (!Cached || !StoredUtc)
    {
        return false;
    }

    const double AgeSeconds = (FDateTime::UtcNow() - *StoredUtc).GetTotalSeconds();
    if (AgeSeconds < 0.0 || AgeSeconds > CacheTtlSeconds)
    {
        CellCache.Remove(CacheKey);
        CellCacheStoredUtc.Remove(CacheKey);
        CellCacheOrder.Remove(CacheKey);
        return false;
    }

    LastCell = *Cached;
    CellCacheOrder.Remove(CacheKey);
    CellCacheOrder.Add(CacheKey);
    OnWorldCellLoaded.Broadcast(true, LastCell, FString());
    return true;
}

void UHorizonWorldStreamSubsystem::StoreCachedCell(
    const FString& CacheKey,
    const FHorizonWorldCellSummary& Cell)
{
    if (CacheKey.IsEmpty() || !Cell.bComplete)
    {
        return;
    }

    CellCache.Add(CacheKey, Cell);
    CellCacheStoredUtc.Add(CacheKey, FDateTime::UtcNow());
    CellCacheOrder.Remove(CacheKey);
    CellCacheOrder.Add(CacheKey);

    while (CellCacheOrder.Num() > FMath::Max(1, MaxCachedCells))
    {
        const FString OldestKey = CellCacheOrder[0];
        CellCacheOrder.RemoveAt(0);
        CellCache.Remove(OldestKey);
        CellCacheStoredUtc.Remove(OldestKey);
    }
}

bool UHorizonWorldStreamSubsystem::RequestWorldCell(
    const FString& StateCode,
    double Latitude,
    double Longitude,
    double SpanKm,
    const FString& CellId)
{
    if (bRequestActive)
    {
        return false;
    }

    const FString SafeState = StateCode.ToUpper();
    const double SafeSpan = FMath::Clamp(SpanKm, 0.75, 5.5);
    const FString CacheKey = MakeCacheKey(
        SafeState,
        Latitude,
        Longitude,
        SafeSpan,
        CellId);

    if (TryServeCachedCell(CacheKey))
    {
        return true;
    }

    const FString Url = FString::Printf(
        TEXT("%s?state=%s&lat=%.8f&lon=%.8f&span_km=%.3f&cell_id=%s"),
        *Endpoint,
        *SafeState,
        Latitude,
        Longitude,
        SafeSpan,
        *CellId);

    ActiveRequest = FHttpModule::Get().CreateRequest();
    ActiveRequest->SetURL(Url);
    ActiveRequest->SetVerb(TEXT("GET"));
    ActiveRequest->SetHeader(TEXT("Accept"), TEXT("application/json"));
    ActiveRequest->SetTimeout(20.0f);
    ActiveRequest->OnProcessRequestComplete().BindUObject(
        this,
        &UHorizonWorldStreamSubsystem::HandleResponse);

    ActiveCacheKey = CacheKey;
    bRequestActive = ActiveRequest->ProcessRequest();
    if (!bRequestActive)
    {
        ActiveCacheKey.Reset();
        ActiveRequest.Reset();
        OnWorldCellLoaded.Broadcast(
            false,
            FHorizonWorldCellSummary(),
            TEXT("BridgePoint world request could not start."));
    }

    return bRequestActive;
}

void UHorizonWorldStreamSubsystem::CancelActiveRequest()
{
    if (ActiveRequest.IsValid())
    {
        ActiveRequest->CancelRequest();
        ActiveRequest.Reset();
    }

    ActiveCacheKey.Reset();
    bRequestActive = false;
}

void UHorizonWorldStreamSubsystem::HandleResponse(
    FHttpRequestPtr Request,
    FHttpResponsePtr Response,
    bool bConnectedSuccessfully)
{
    const FString CompletedCacheKey = ActiveCacheKey;
    ActiveCacheKey.Reset();
    bRequestActive = false;
    ActiveRequest.Reset();

    if (!bConnectedSuccessfully || !Response.IsValid())
    {
        OnWorldCellLoaded.Broadcast(
            false,
            FHorizonWorldCellSummary(),
            TEXT("BridgePoint world endpoint did not respond."));
        return;
    }

    const int32 Status = Response->GetResponseCode();
    const FString Body = Response->GetContentAsString();

    if (Status < 200 || Status >= 300)
    {
        OnWorldCellLoaded.Broadcast(
            false,
            FHorizonWorldCellSummary(),
            FString::Printf(TEXT("BridgePoint world endpoint returned HTTP %d."), Status));
        return;
    }

    TSharedPtr<FJsonObject> Root;
    const TSharedRef<TJsonReader<>> Reader = TJsonReaderFactory<>::Create(Body);
    if (!FJsonSerializer::Deserialize(Reader, Root) || !Root.IsValid())
    {
        OnWorldCellLoaded.Broadcast(
            false,
            FHorizonWorldCellSummary(),
            TEXT("BridgePoint world response was not valid JSON."));
        return;
    }

    FHorizonWorldCellSummary Summary;
    Summary.RawJson = Body;

    bool bComplete = false;
    Root->TryGetBoolField(TEXT("complete"), bComplete);
    Summary.bComplete = bComplete;

    bool bStreamed = false;
    Root->TryGetBoolField(TEXT("streamed"), bStreamed);
    Summary.bStreamed = bStreamed;

    Root->TryGetStringField(TEXT("cell_id"), Summary.CellId);
    Summary.SpanKm = HorizonWorldStream::NumberFieldOr(Root, TEXT("span_km"), 0.0);

    if (Root->HasTypedField<EJson::Object>(TEXT("center")))
    {
        const TSharedPtr<FJsonObject> Center = Root->GetObjectField(TEXT("center"));
        Summary.CenterLatitude = HorizonWorldStream::NumberFieldOr(Center, TEXT("lat"), 0.0);
        Summary.CenterLongitude = HorizonWorldStream::NumberFieldOr(Center, TEXT("lon"), 0.0);
    }

    if (Root->HasTypedField<EJson::Object>(TEXT("bbox")))
    {
        const TSharedPtr<FJsonObject> Bounds = Root->GetObjectField(TEXT("bbox"));
        Summary.Bounds.West = HorizonWorldStream::NumberFieldOr(Bounds, TEXT("west"), 0.0);
        Summary.Bounds.South = HorizonWorldStream::NumberFieldOr(Bounds, TEXT("south"), 0.0);
        Summary.Bounds.East = HorizonWorldStream::NumberFieldOr(Bounds, TEXT("east"), 0.0);
        Summary.Bounds.North = HorizonWorldStream::NumberFieldOr(Bounds, TEXT("north"), 0.0);
    }

    if (Root->HasTypedField<EJson::Object>(TEXT("counts")))
    {
        const TSharedPtr<FJsonObject> Counts = Root->GetObjectField(TEXT("counts"));
        Summary.BuildingCount = HorizonWorldStream::IntFieldOr(Counts, TEXT("buildings"));
        Summary.BuildingPartCount = HorizonWorldStream::IntFieldOr(Counts, TEXT("building_parts"));
        Summary.ParcelCount = HorizonWorldStream::IntFieldOr(Counts, TEXT("parcels"));
        Summary.RoadCount = HorizonWorldStream::IntFieldOr(Counts, TEXT("roads"));
    }

    if (Root->HasTypedField<EJson::Object>(TEXT("resolved_jurisdiction")))
    {
        const TSharedPtr<FJsonObject> Jurisdiction = Root->GetObjectField(TEXT("resolved_jurisdiction"));
        Jurisdiction->TryGetStringField(TEXT("state"), Summary.StateCode);
        Jurisdiction->TryGetStringField(TEXT("name"), Summary.JurisdictionName);
    }

    LastCell = Summary;

    if (!Summary.bComplete)
    {
        FString Error;
        Root->TryGetStringField(TEXT("error"), Error);
        OnWorldCellLoaded.Broadcast(
            false,
            Summary,
            Error.IsEmpty() ? TEXT("BridgePoint world cell was incomplete.") : Error);
        return;
    }

    StoreCachedCell(CompletedCacheKey, Summary);
    OnWorldCellLoaded.Broadcast(true, Summary, FString());
}
