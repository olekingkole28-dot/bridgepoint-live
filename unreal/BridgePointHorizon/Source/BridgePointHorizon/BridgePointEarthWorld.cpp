#include "BridgePointEarthWorld.h"

#include "Cesium3DTileset.h"
#include "CesiumGeoreference.h"
#include "CesiumUrlTemplateRasterOverlay.h"
#include "Engine/World.h"

ABridgePointEarthWorld::ABridgePointEarthWorld()
{
    PrimaryActorTick.bCanEverTick = false;
    SetActorHiddenInGame(false);
    SetCanBeDamaged(false);
}

void ABridgePointEarthWorld::BeginPlay()
{
    Super::BeginPlay();
    InitializeEarth();
}

void ABridgePointEarthWorld::EndPlay(const EEndPlayReason::Type EndPlayReason)
{
    if (BaseEllipsoidTileset)
    {
        BaseEllipsoidTileset->Destroy();
        BaseEllipsoidTileset = nullptr;
    }

    if (Georeference)
    {
        Georeference->Destroy();
        Georeference = nullptr;
    }

    SatelliteImageryOverlay = nullptr;
    bInitialized = false;
    Super::EndPlay(EndPlayReason);
}

bool ABridgePointEarthWorld::InitializeEarth()
{
    if (bInitialized)
    {
        return true;
    }

    if (!GetWorld() ||
        !FMath::IsFinite(OriginLatitudeDegrees) ||
        !FMath::IsFinite(OriginLongitudeDegrees) ||
        !FMath::IsFinite(OriginHeightMeters) ||
        OriginLatitudeDegrees < -90.0 ||
        OriginLatitudeDegrees > 90.0 ||
        OriginLongitudeDegrees < -180.0 ||
        OriginLongitudeDegrees > 180.0)
    {
        return false;
    }

    if (!CreateGeoreference() || !CreateBaseEllipsoid())
    {
        return false;
    }

    if (bEnableGlobalSatelliteImagery)
    {
        CreateSatelliteImageryOverlay();
    }

    bInitialized = true;
    return true;
}

bool ABridgePointEarthWorld::CreateGeoreference()
{
    if (Georeference)
    {
        return true;
    }

    FActorSpawnParameters Params;
    Params.Owner = this;
    Params.SpawnCollisionHandlingOverride =
        ESpawnActorCollisionHandlingMethod::AlwaysSpawn;

    Georeference = GetWorld()->SpawnActor<ACesiumGeoreference>(
        ACesiumGeoreference::StaticClass(),
        FTransform::Identity,
        Params);

    if (!Georeference)
    {
        return false;
    }

    // Cesium's georeference maps longitude (X), latitude (Y) and ellipsoid
    // height (Z) to the Unreal origin. The default is the Horizon CT start.
    Georeference->SetOriginLongitudeLatitudeHeight(
        FVector(OriginLongitudeDegrees, OriginLatitudeDegrees, OriginHeightMeters));
    return true;
}

bool ABridgePointEarthWorld::CreateBaseEllipsoid()
{
    if (BaseEllipsoidTileset)
    {
        return true;
    }

    FActorSpawnParameters Params;
    Params.Owner = this;
    Params.SpawnCollisionHandlingOverride =
        ESpawnActorCollisionHandlingMethod::AlwaysSpawn;

    BaseEllipsoidTileset = GetWorld()->SpawnActor<ACesium3DTileset>(
        ACesium3DTileset::StaticClass(),
        FTransform::Identity,
        Params);

    if (!BaseEllipsoidTileset)
    {
        return false;
    }

    BaseEllipsoidTileset->SetGeoreference(
        TSoftObjectPtr<ACesiumGeoreference>(Georeference));
    BaseEllipsoidTileset->SetTilesetSource(ETilesetSource::FromEllipsoid);
    BaseEllipsoidTileset->SetMaximumScreenSpaceError(16.0);
    BaseEllipsoidTileset->SetUseLodTransitions(true);
    BaseEllipsoidTileset->SetEnableOcclusionCulling(true);
    BaseEllipsoidTileset->SetEnableWaterMask(true);
    BaseEllipsoidTileset->SetCreatePhysicsMeshes(false);
    BaseEllipsoidTileset->ShowCreditsOnScreen = true;
    return true;
}

bool ABridgePointEarthWorld::CreateSatelliteImageryOverlay()
{
    if (!BaseEllipsoidTileset)
    {
        return false;
    }

    if (SatelliteImageryOverlay)
    {
        return true;
    }

    SatelliteImageryOverlay =
        NewObject<UCesiumUrlTemplateRasterOverlay>(BaseEllipsoidTileset);
    if (!SatelliteImageryOverlay)
    {
        return false;
    }

    // NASA GIBS supports "default" for the latest available daily mosaic.
    // reverseY matches the north-origin WMTS row order to Cesium's URL template.
    SatelliteImageryOverlay->TemplateUrl =
        TEXT("https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_NOAA20_CorrectedReflectance_TrueColor/default/default/GoogleMapsCompatible_Level9/{z}/{reverseY}/{x}.jpeg");
    SatelliteImageryOverlay->Projection =
        ECesiumUrlTemplateRasterOverlayProjection::WebMercator;
    SatelliteImageryOverlay->MinimumLevel = 0;
    SatelliteImageryOverlay->MaximumLevel =
        FMath::Clamp(MaximumSatelliteImageryLevel, 0, 9);
    SatelliteImageryOverlay->SetMaximumTextureSize(2048);
    SatelliteImageryOverlay->SetMaximumSimultaneousTileLoads(16);
    SatelliteImageryOverlay->SetSubTileCacheBytes(64 * 1024 * 1024LL);
    SatelliteImageryOverlay->RegisterComponent();
    SatelliteImageryOverlay->Activate(true);
    return true;
}
