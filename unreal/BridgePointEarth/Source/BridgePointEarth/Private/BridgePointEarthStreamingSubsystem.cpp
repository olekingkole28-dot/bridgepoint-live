#include "BridgePointEarthStreamingSubsystem.h"
#include "BridgePointGeoReference.h"
#include "BridgePointMVTDecoder.h"
#include "BPGeoTileProxyActor.h"
#include "Engine/World.h"
#include "GameFramework/Pawn.h"
#include "GameFramework/PlayerController.h"
#include "HttpModule.h"
#include "Interfaces/IHttpRequest.h"
#include "Interfaces/IHttpResponse.h"
#include "ImageWrapperModule.h"
#include "IImageWrapper.h"
#include "IImageWrapperModule.h"
#include "Modules/ModuleManager.h"

void UBridgePointEarthStreamingSubsystem::Initialize(FSubsystemCollectionBase& Collection)
{
    Super::Initialize(Collection);
    BuildLayerCatalog();
}

void UBridgePointEarthStreamingSubsystem::Deinitialize()
{
    TArray<FString> Keys;
    Tiles.GetKeys(Keys);
    for (const FString& Key : Keys) UnloadTile(Key);
    Super::Deinitialize();
}

void UBridgePointEarthStreamingSubsystem::BuildLayerCatalog()
{
    LayerCatalog.Reset();
    auto Add = [this](EBPWorldLayer Id, const TCHAR* Tag, const TCHAR* Name, const TCHAR* Group,
                      bool bDefault, bool bConnected, bool bClearance=false, float Radius=0.0f)
    {
        FBPWorldLayerDefinition D;
        D.Id=Id; D.RuntimeTag=FName(Tag); D.DisplayName=FText::FromString(Name);
        D.Group=FText::FromString(Group); D.bEnabledByDefault=bDefault;
        D.bSourceAdapterConnected=bConnected; D.bClearanceInput=bClearance; D.ClearanceRadiusMeters=Radius;
        LayerCatalog.Add(D); LayerEnabled.Add(D.RuntimeTag,bDefault);
    };

    Add(EBPWorldLayer::Satellite,TEXT("satellite"),TEXT("Satellite imagery"),TEXT("Base"),true,false);
    Add(EBPWorldLayer::Terrain,TEXT("terrain"),TEXT("Terrain elevation"),TEXT("Base"),true,true);
    Add(EBPWorldLayer::Buildings,TEXT("buildings"),TEXT("Buildings and structures"),TEXT("Built world"),true,true);
    Add(EBPWorldLayer::Roofs,TEXT("roofs"),TEXT("Roof planes and detail"),TEXT("Built world"),true,true);
    Add(EBPWorldLayer::Parcels,TEXT("parcels"),TEXT("Parcels and property boundaries"),TEXT("Property"),false,true,true,1.0f);
    Add(EBPWorldLayer::Roads,TEXT("roads"),TEXT("Roads and carriageways"),TEXT("Transport"),true,true,true,6.0f);
    Add(EBPWorldLayer::Sidewalks,TEXT("sidewalks"),TEXT("Sidewalks and footpaths"),TEXT("Transport"),true,true,true,1.5f);
    Add(EBPWorldLayer::Rail,TEXT("rail"),TEXT("Rail and transit corridors"),TEXT("Transport"),true,true,true,4.0f);
    Add(EBPWorldLayer::Bridges,TEXT("bridges"),TEXT("Bridges and overpasses"),TEXT("Transport"),true,true,true,8.0f);
    Add(EBPWorldLayer::Water,TEXT("water"),TEXT("Water bodies and waterways"),TEXT("Environment"),true,true);
    Add(EBPWorldLayer::Trees,TEXT("vegetation"),TEXT("Trees and vegetation"),TEXT("Environment"),true,true);
    Add(EBPWorldLayer::StreetFurniture,TEXT("street_furniture"),TEXT("Street furniture"),TEXT("Infrastructure"),false,false,true,2.0f);
    Add(EBPWorldLayer::Streetlights,TEXT("streetlights"),TEXT("Streetlights"),TEXT("Infrastructure"),false,false,true,2.0f);
    Add(EBPWorldLayer::Wells,TEXT("wells"),TEXT("Wells and boreholes"),TEXT("Infrastructure"),false,false,true,3.0f);
    Add(EBPWorldLayer::Towers,TEXT("towers"),TEXT("Communications and utility towers"),TEXT("Infrastructure"),false,false,true,8.0f);
    Add(EBPWorldLayer::Powerlines,TEXT("powerlines"),TEXT("Power lines and poles"),TEXT("Infrastructure"),false,false,true,5.0f);
    Add(EBPWorldLayer::Subsurface,TEXT("subsurface"),TEXT("Subsurface utilities and assets"),TEXT("Infrastructure"),false,false,true,4.0f);
    Add(EBPWorldLayer::Weather,TEXT("weather"),TEXT("Current weather"),TEXT("Weather and hazards"),false,false);
    Add(EBPWorldLayer::Radar,TEXT("radar"),TEXT("Radar and precipitation"),TEXT("Weather and hazards"),false,false);
    Add(EBPWorldLayer::Storms,TEXT("storms"),TEXT("Storms and warnings"),TEXT("Weather and hazards"),false,false);
    Add(EBPWorldLayer::Wildfire,TEXT("wildfire"),TEXT("Wildfire perimeters"),TEXT("Weather and hazards"),false,false);
    Add(EBPWorldLayer::Flood,TEXT("flood"),TEXT("Flood extent and depth"),TEXT("Weather and hazards"),false,false);
    Add(EBPWorldLayer::Wind,TEXT("wind"),TEXT("Wind field"),TEXT("Weather and hazards"),false,false);
    Add(EBPWorldLayer::Aircraft,TEXT("aircraft"),TEXT("Aircraft awareness"),TEXT("Motion and tracking"),false,false);
    Add(EBPWorldLayer::Drones,TEXT("drones"),TEXT("Drone awareness"),TEXT("Motion and tracking"),false,false);
    Add(EBPWorldLayer::Vessels,TEXT("vessels"),TEXT("Vessels and ships"),TEXT("Motion and tracking"),false,false);
    Add(EBPWorldLayer::Satellites,TEXT("orbital_satellites"),TEXT("Orbital satellites"),TEXT("Motion and tracking"),false,false);
    Add(EBPWorldLayer::Opportunities,TEXT("opportunities"),TEXT("Property opportunities"),TEXT("Property intelligence"),false,false);
    Add(EBPWorldLayer::Listings,TEXT("listings"),TEXT("Listings"),TEXT("Property intelligence"),false,false);
    Add(EBPWorldLayer::History,TEXT("history"),TEXT("Thirty-day activity history"),TEXT("Property intelligence"),false,false);
    Add(EBPWorldLayer::Moon,TEXT("moon"),TEXT("Moon and lunar surface"),TEXT("Celestial"),false,false);
}

void UBridgePointEarthStreamingSubsystem::ConfigureWorldOrigin(double Longitude, double Latitude)
{
    WorldOriginLongitude = FBridgePointGeoReference::NormalizeLongitude(Longitude);
    WorldOriginLatitude = FMath::Clamp(Latitude, -FBridgePointGeoReference::MaxMercatorLatitude, FBridgePointGeoReference::MaxMercatorLatitude);
    bWorldOriginElevationSet = false;
    WorldOriginElevationMeters = 0.0;
    bWorldOriginConfigured = true;
    for (TPair<FString,FBPStreamedTileState>& Pair:Tiles)
        if (Pair.Value.TerrainHeights.Num() == Pair.Value.TerrainWidth*Pair.Value.TerrainHeight)
            Pair.Value.bProxyDirty = true;
    ForceRefresh();
}

void UBridgePointEarthStreamingSubsystem::ForceRefresh()
{
    RefreshAccumulator = 1.0;
}

void UBridgePointEarthStreamingSubsystem::Tick(float DeltaTime)
{
    RefreshAccumulator += DeltaTime;
    if (RefreshAccumulator < 0.75) return;
    RefreshAccumulator = 0.0;

    double Lat=0.0, Lon=0.0;
    if (!bWorldOriginConfigured || !GetPlayerGeoLocation(Lat,Lon)) return;
    LastPlayerLatitude=Lat;
    LastPlayerLongitude=Lon;
    // Reconcile on every streaming heartbeat. This also drains request slots for
    // neighboring tiles after earlier HTTP work completes while the pawn is stationary.
    ReconcileTiles(Lat,Lon);
    FlushDirtyProxies();
}

bool UBridgePointEarthStreamingSubsystem::GetPlayerGeoLocation(double& OutLatitude, double& OutLongitude) const
{
    UWorld* World=GetWorld();
    APlayerController* PC=World ? World->GetFirstPlayerController() : nullptr;
    APawn* Pawn=PC ? PC->GetPawn() : nullptr;
    if (!Pawn) return false;
    const FVector Location=Pawn->GetActorLocation();
    const FVector2D Geo=FBridgePointGeoReference::LocalMetersToGeo(Location.X/100.0,Location.Y/100.0,WorldOriginLongitude,WorldOriginLatitude);
    OutLongitude=Geo.X; OutLatitude=Geo.Y;
    return true;
}

void UBridgePointEarthStreamingSubsystem::ReconcileTiles(double Latitude, double Longitude)
{
    const FBPGeoTileKey Center=FBridgePointGeoReference::TileForLocation(Latitude,Longitude,TileZoom);
    const int32 N=1<<Center.Zoom;
    TSet<FString> Desired;
    for (int32 DY=-TileRadius; DY<=TileRadius; ++DY)
    {
        for (int32 DX=-TileRadius; DX<=TileRadius; ++DX)
        {
            FBPGeoTileKey Key;
            Key.Zoom=Center.Zoom;
            Key.X=(Center.X+DX)%N; if (Key.X<0) Key.X+=N;
            Key.Y=FMath::Clamp(Center.Y+DY,0,N-1);
            const FString Id=Key.ToString();
            Desired.Add(Id);
            EnsureTile(Key);
        }
    }

    TArray<FString> Existing;
    Tiles.GetKeys(Existing);
    for (const FString& Id:Existing)
        if (!Desired.Contains(Id)) UnloadTile(Id);
}

void UBridgePointEarthStreamingSubsystem::EnsureTile(const FBPGeoTileKey& Key)
{
    const FString Id=Key.ToString();
    FBPStreamedTileState& State=Tiles.FindOrAdd(Id);
    State.Key=Key;

    if (GetWorld() && GetWorld()->GetTimeSeconds() < State.RetryAfterTime) return;
    if (CountInFlightRequests() >= MaxConcurrentRequests) return;
    if (!State.bBridgePointRequested)
        StartVectorRequest(Id,TEXT("bridgepoint"),BridgePointTileUrl(Key));
    if (CountInFlightRequests() < MaxConcurrentRequests && !State.bCityStructuresRequested)
        StartVectorRequest(Id,TEXT("city_structures"),CityStructuresTileUrl(Key));
    if (CountInFlightRequests() < MaxConcurrentRequests && !State.bCityRoofsRequested)
        StartVectorRequest(Id,TEXT("city_roofs"),CityRoofsTileUrl(Key));
    if (CountInFlightRequests() < MaxConcurrentRequests && !State.bParcelRequested)
        StartVectorRequest(Id,TEXT("parcels"),ParcelTileUrl(Key));
    if (bStreamOpenFreeMap && CountInFlightRequests() < MaxConcurrentRequests && !State.bOpenFreeMapRequested)
        StartVectorRequest(Id,TEXT("openfreemap"),BuildTileUrl(OpenFreeMapTileTemplate,Key));
    if (bStreamTerrariumElevation && CountInFlightRequests() < MaxConcurrentRequests && !State.bTerrainRequested)
        StartTerrainRequest(Id,BuildTileUrl(TerrariumTileTemplate,Key));
}

int32 UBridgePointEarthStreamingSubsystem::CountInFlightRequests() const
{
    int32 Count=0;
    for (const TPair<FString,FBPStreamedTileState>& Pair:Tiles)
        Count+=Pair.Value.Requests.Num();
    return Count;
}

FString UBridgePointEarthStreamingSubsystem::BuildTileUrl(const FString& Template, const FBPGeoTileKey& Key) const
{
    FString URL=Template;
    URL.ReplaceInline(TEXT("{z}"),*LexToString(Key.Zoom));
    URL.ReplaceInline(TEXT("{x}"),*LexToString(Key.X));
    URL.ReplaceInline(TEXT("{y}"),*LexToString(Key.Y));
    return URL;
}

FString UBridgePointEarthStreamingSubsystem::BridgePointTileUrl(const FBPGeoTileKey& Key) const
{
    return FString::Printf(TEXT("%s/%s?z=%d&x=%d&y=%d&limit=%d"),
        *BridgePointFunctionsUrl, *BridgePointBuildingTileName, Key.Zoom, Key.X, Key.Y, MaxBuildingFeaturesPerTile);
}

FString UBridgePointEarthStreamingSubsystem::CityStructuresTileUrl(const FBPGeoTileKey& Key) const
{
    return FString::Printf(TEXT("%s/%s?z=%d&x=%d&y=%d&limit=650&v=5380"),
        *BridgePointFunctionsUrl,*BridgePointCityStructuresTileName,Key.Zoom,Key.X,Key.Y);
}

FString UBridgePointEarthStreamingSubsystem::CityRoofsTileUrl(const FBPGeoTileKey& Key) const
{
    return FString::Printf(TEXT("%s/%s?z=%d&x=%d&y=%d&limit=650&v=5380"),
        *BridgePointFunctionsUrl,*BridgePointCityRoofsTileName,Key.Zoom,Key.X,Key.Y);
}

FString UBridgePointEarthStreamingSubsystem::ParcelTileUrl(const FBPGeoTileKey& Key) const
{
    const int64 CacheBucket=FDateTime::UtcNow().ToUnixTimestamp()/300;
    return FString::Printf(TEXT("%s/%s?mode=public&z=%d&x=%d&y=%d&v=%lld"),
        *BridgePointFunctionsUrl,*BridgePointParcelTileName,Key.Zoom,Key.X,Key.Y,CacheBucket);
}

void UBridgePointEarthStreamingSubsystem::StartVectorRequest(const FString& TileId, const FString& Source, const FString& Url)
{
    FBPStreamedTileState* State=Tiles.Find(TileId);
    if (!State) return;
    if (Source==TEXT("bridgepoint")) State->bBridgePointRequested=true;
    else if (Source==TEXT("city_structures")) State->bCityStructuresRequested=true;
    else if (Source==TEXT("city_roofs")) State->bCityRoofsRequested=true;
    else if (Source==TEXT("parcels")) State->bParcelRequested=true;
    else State->bOpenFreeMapRequested=true;

    TSharedRef<IHttpRequest,ESPMode::ThreadSafe> Request=FHttpModule::Get().CreateRequest();
    Request->SetURL(Url);
    Request->SetVerb(TEXT("GET"));
    Request->SetHeader(TEXT("Accept"),TEXT("application/x-protobuf, application/vnd.mapbox-vector-tile, */*"));
    if (!PublicApiKey.IsEmpty()) Request->SetHeader(TEXT("apikey"),PublicApiKey);
    const TWeakObjectPtr<UBridgePointEarthStreamingSubsystem> WeakThis(this);
    Request->OnProcessRequestComplete().BindLambda([WeakThis,TileId,Source](FHttpRequestPtr Req,FHttpResponsePtr Response,bool bSuccess)
    {
        if (UBridgePointEarthStreamingSubsystem* Self=WeakThis.Get())
        {
            TArray<uint8> Bytes;
            const bool bOK=bSuccess && Response.IsValid() && EHttpResponseCodes::IsOk(Response->GetResponseCode());
            if (bOK) Bytes=Response->GetContent();
            Self->HandleVectorResponse(TileId,Source,Bytes,bOK);
            if (FBPStreamedTileState* TileState=Self->Tiles.Find(TileId))
                TileState->Requests.Remove(Req);
        }
    });
    State->Requests.Add(Request);
    if (!Request->ProcessRequest())
    {
        State->Requests.Remove(Request);
        State->RetryAfterTime=GetWorld() ? GetWorld()->GetTimeSeconds()+5.0 : 0.0;
        if (Source==TEXT("bridgepoint")) State->bBridgePointRequested=false;
        else if (Source==TEXT("city_structures")) State->bCityStructuresRequested=false;
        else if (Source==TEXT("city_roofs")) State->bCityRoofsRequested=false;
        else if (Source==TEXT("parcels")) State->bParcelRequested=false;
        else State->bOpenFreeMapRequested=false;
    }
}

void UBridgePointEarthStreamingSubsystem::StartTerrainRequest(const FString& TileId, const FString& Url)
{
    FBPStreamedTileState* State=Tiles.Find(TileId);
    if (!State) return;
    State->bTerrainRequested=true;
    TSharedRef<IHttpRequest,ESPMode::ThreadSafe> Request=FHttpModule::Get().CreateRequest();
    Request->SetURL(Url); Request->SetVerb(TEXT("GET"));
    const TWeakObjectPtr<UBridgePointEarthStreamingSubsystem> WeakThis(this);
    Request->OnProcessRequestComplete().BindLambda([WeakThis,TileId](FHttpRequestPtr Req,FHttpResponsePtr Response,bool bSuccess)
    {
        if (UBridgePointEarthStreamingSubsystem* Self=WeakThis.Get())
        {
            TArray<uint8> Bytes;
            const bool bOK=bSuccess && Response.IsValid() && EHttpResponseCodes::IsOk(Response->GetResponseCode());
            if (bOK) Bytes=Response->GetContent();
            Self->HandleTerrainResponse(TileId,Bytes,bOK);
            if (FBPStreamedTileState* TileState=Self->Tiles.Find(TileId))
                TileState->Requests.Remove(Req);
        }
    });
    State->Requests.Add(Request);
    if (!Request->ProcessRequest())
    {
        State->Requests.Remove(Request);
        State->bTerrainRequested=false;
        State->RetryAfterTime=GetWorld() ? GetWorld()->GetTimeSeconds()+5.0 : 0.0;
    }
}

void UBridgePointEarthStreamingSubsystem::HandleVectorResponse(const FString& TileId, const FString& Source, const TArray<uint8>& Bytes, bool bSuccess)
{
    FBPStreamedTileState* State=Tiles.Find(TileId);
    if (!State) return;
    if (!bSuccess)
    {
        State->RetryAfterTime=GetWorld() ? GetWorld()->GetTimeSeconds()+5.0 : 0.0;
        if (Source==TEXT("bridgepoint")) State->bBridgePointRequested=false;
        else if (Source==TEXT("city_structures")) State->bCityStructuresRequested=false;
        else if (Source==TEXT("city_roofs")) State->bCityRoofsRequested=false;
        else if (Source==TEXT("parcels")) State->bParcelRequested=false;
        else State->bOpenFreeMapRequested=false;
        return;
    }
    // A successful empty tile is a valid "no coverage here" response.
    if (Bytes.IsEmpty()) return;

    TArray<FBPGeoFeature> Decoded;
    FString Error;
    if (FBridgePointMVTDecoder::Decode(Bytes,State->Key,Decoded,Error))
    {
        for (FBPGeoFeature& Feature:Decoded)
        {
            if (Source==TEXT("bridgepoint")) Feature.SourceLayer=TEXT("bridgepoint_")+Feature.SourceLayer;
            else if (Source==TEXT("city_structures")) Feature.SourceLayer=TEXT("city_structure_")+Feature.SourceLayer;
            else if (Source==TEXT("city_roofs")) Feature.SourceLayer=TEXT("city_roof_")+Feature.SourceLayer;
            else if (Source==TEXT("parcels")) Feature.SourceLayer=TEXT("parcel_")+Feature.SourceLayer;
            State->Features.Add(MoveTemp(Feature));
        }
        State->bProxyDirty=true;
    }
    else
    {
        State->RetryAfterTime=GetWorld() ? GetWorld()->GetTimeSeconds()+5.0 : 0.0;
        if (Source==TEXT("bridgepoint")) State->bBridgePointRequested=false;
        else if (Source==TEXT("city_structures")) State->bCityStructuresRequested=false;
        else if (Source==TEXT("city_roofs")) State->bCityRoofsRequested=false;
        else if (Source==TEXT("parcels")) State->bParcelRequested=false;
        else State->bOpenFreeMapRequested=false;
        UE_LOG(LogTemp,Warning,TEXT("BridgePoint MVT decode failed for %s (%s): %s"),*TileId,*Source,*Error);
    }
}

void UBridgePointEarthStreamingSubsystem::HandleTerrainResponse(const FString& TileId, const TArray<uint8>& Bytes, bool bSuccess)
{
    FBPStreamedTileState* State=Tiles.Find(TileId);
    if (!State) return;
    if (!bSuccess)
    {
        State->bTerrainRequested=false;
        State->RetryAfterTime=GetWorld() ? GetWorld()->GetTimeSeconds()+5.0 : 0.0;
        return;
    }
    if (Bytes.IsEmpty()) return;

    IImageWrapperModule& Module=FModuleManager::LoadModuleChecked<IImageWrapperModule>(FName("ImageWrapper"));
    IImageWrapperPtr Wrapper=Module.CreateImageWrapper(EImageFormat::PNG);
    if (!Wrapper.IsValid() || !Wrapper->SetCompressed(Bytes.GetData(),Bytes.Num()))
    {
        State->bTerrainRequested=false;
        State->RetryAfterTime=GetWorld() ? GetWorld()->GetTimeSeconds()+5.0 : 0.0;
        return;
    }

    TArray64<uint8> Raw;
    if (!Wrapper->GetRaw(ERGBFormat::BGRA,8,Raw))
    {
        State->bTerrainRequested=false;
        State->RetryAfterTime=GetWorld() ? GetWorld()->GetTimeSeconds()+5.0 : 0.0;
        return;
    }
    const int32 SourceW=Wrapper->GetWidth(), SourceH=Wrapper->GetHeight();
    if (SourceW<2 || SourceH<2)
    {
        State->bTerrainRequested=false;
        State->RetryAfterTime=GetWorld() ? GetWorld()->GetTimeSeconds()+5.0 : 0.0;
        return;
    }

    const int32 TargetW=65, TargetH=65;
    State->TerrainHeights.SetNum(TargetW*TargetH);
    State->TerrainWidth=TargetW; State->TerrainHeight=TargetH;
    const FColor* Pixels=reinterpret_cast<const FColor*>(Raw.GetData());

    for (int32 Y=0;Y<TargetH;++Y)
    {
        const int32 SY=FMath::Clamp(FMath::RoundToInt(static_cast<float>(Y)*(SourceH-1)/(TargetH-1)),0,SourceH-1);
        for (int32 X=0;X<TargetW;++X)
        {
            const int32 SX=FMath::Clamp(FMath::RoundToInt(static_cast<float>(X)*(SourceW-1)/(TargetW-1)),0,SourceW-1);
            const FColor C=Pixels[SY*SourceW+SX];
            State->TerrainHeights[Y*TargetW+X]=static_cast<float>(C.R*256.0+C.G+C.B/256.0-32768.0);
        }
    }

    // Establish the local vertical datum from the DEM sample at the chosen geographic
    // origin. Otherwise a player spawned at local Z=0 could start below a hillside
    // whose absolute Terrarium elevation is, for example, 140 metres.
    if (!bWorldOriginElevationSet)
    {
        const FBPGeoBounds Bounds=FBridgePointGeoReference::BoundsForTile(State->Key);
        const bool bContainsOrigin=WorldOriginLongitude>=Bounds.West && WorldOriginLongitude<=Bounds.East &&
                                   WorldOriginLatitude>=Bounds.South && WorldOriginLatitude<=Bounds.North;
        if (bContainsOrigin)
        {
            const double U=FMath::Clamp((WorldOriginLongitude-Bounds.West)/FMath::Max(UE_SMALL_NUMBER,Bounds.East-Bounds.West),0.0,1.0);
            const double V=FMath::Clamp((Bounds.North-WorldOriginLatitude)/FMath::Max(UE_SMALL_NUMBER,Bounds.North-Bounds.South),0.0,1.0);
            const double GX=U*(TargetW-1), GY=V*(TargetH-1);
            const int32 X0=FMath::Clamp(FMath::FloorToInt(GX),0,TargetW-1);
            const int32 Y0=FMath::Clamp(FMath::FloorToInt(GY),0,TargetH-1);
            const int32 X1=FMath::Min(X0+1,TargetW-1), Y1=FMath::Min(Y0+1,TargetH-1);
            const double AX=GX-X0, AY=GY-Y0;
            const double H00=State->TerrainHeights[Y0*TargetW+X0];
            const double H10=State->TerrainHeights[Y0*TargetW+X1];
            const double H01=State->TerrainHeights[Y1*TargetW+X0];
            const double H11=State->TerrainHeights[Y1*TargetW+X1];
            WorldOriginElevationMeters=FMath::Lerp(FMath::Lerp(H00,H10,AX),FMath::Lerp(H01,H11,AX),AY);
            bWorldOriginElevationSet=true;
            for (TPair<FString,FBPStreamedTileState>& Pair:Tiles)
                if (!Pair.Value.TerrainHeights.IsEmpty()) Pair.Value.bProxyDirty=true;
        }
    }
    State->bProxyDirty=true;
}

void UBridgePointEarthStreamingSubsystem::FlushDirtyProxies()
{
    TArray<FString> DirtyIds;
    for (const TPair<FString,FBPStreamedTileState>& Pair:Tiles)
        if (Pair.Value.bProxyDirty) DirtyIds.Add(Pair.Key);
    for (const FString& Id:DirtyIds) UpdateProxy(Id);
}

void UBridgePointEarthStreamingSubsystem::UpdateProxy(const FString& TileId)
{
    FBPStreamedTileState* State=Tiles.Find(TileId);
    if (!State || !GetWorld() || !State->bProxyDirty) return;
    State->bProxyDirty=false;
    ABPGeoTileProxyActor* Proxy=State->Proxy.Get();
    if (!Proxy)
    {
        FActorSpawnParameters Params;
        Params.SpawnCollisionHandlingOverride=ESpawnActorCollisionHandlingMethod::AlwaysSpawn;
        Proxy=GetWorld()->SpawnActor<ABPGeoTileProxyActor>(ABPGeoTileProxyActor::StaticClass(),FTransform::Identity,Params);
        if (!Proxy) return;
        State->Proxy=Proxy;
    }
    Proxy->InitializeTile(State->Key,WorldOriginLongitude,WorldOriginLatitude,WorldOriginElevationMeters,State->Features);
    if (!State->TerrainHeights.IsEmpty())
        Proxy->SetTerrainGrid(State->TerrainHeights,State->TerrainWidth,State->TerrainHeight);
    else
        Proxy->RebuildVectorGeometry();
    for (const TPair<FName,bool>& Layer:LayerEnabled)
        Proxy->SetLayerEnabled(Layer.Key,Layer.Value);
}

void UBridgePointEarthStreamingSubsystem::UnloadTile(const FString& TileId)
{
    FBPStreamedTileState* State=Tiles.Find(TileId);
    if (!State) return;
    for (const TSharedPtr<IHttpRequest,ESPMode::ThreadSafe>& Request:State->Requests)
        if (Request.IsValid()) Request->CancelRequest();
    if (ABPGeoTileProxyActor* Proxy=State->Proxy.Get()) Proxy->Destroy();
    Tiles.Remove(TileId);
}

void UBridgePointEarthStreamingSubsystem::SetLayerEnabled(FName LayerTag, bool bEnabled)
{
    LayerEnabled.Add(LayerTag,bEnabled);
    for (TPair<FString,FBPStreamedTileState>& Pair:Tiles)
        if (ABPGeoTileProxyActor* Proxy=Pair.Value.Proxy.Get())
            Proxy->SetLayerEnabled(LayerTag,bEnabled);
}

TArray<FBPWorldLayerDefinition> UBridgePointEarthStreamingSubsystem::GetLayerCatalog() const
{
    return LayerCatalog;
}

void UBridgePointEarthStreamingSubsystem::GetLoadedFeatures(TArray<FBPGeoFeature>& OutFeatures) const
{
    OutFeatures.Reset();
    for (const TPair<FString,FBPStreamedTileState>& Pair:Tiles)
        OutFeatures.Append(Pair.Value.Features);
}