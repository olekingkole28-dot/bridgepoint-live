#include "BridgePointEarthWorld.h"

#include "Cesium3DTileset.h"
#include "CesiumGeoreference.h"
#include "CesiumSunSky.h"
#include "CesiumGlobeAnchorComponent.h"
#include "BridgePointEarthSubsystem.h"
#include "Engine/GameInstance.h"
#include "CesiumUrlTemplateRasterOverlay.h"
#include "Engine/World.h"
#include "HAL/PlatformMisc.h"

namespace BridgePointEarth
{
    constexpr int64 CesiumWorldTerrainAssetId = 1;
    constexpr int64 CesiumOSMBuildingsAssetId = 96188;
}

ABridgePointEarthWorld::ABridgePointEarthWorld()
{
    PrimaryActorTick.bCanEverTick = true;
    PrimaryActorTick.bStartWithTickEnabled = true;
    SetActorHiddenInGame(false);
    SetCanBeDamaged(false);
}

void ABridgePointEarthWorld::BeginPlay()
{
    Super::BeginPlay();
    InitializeEarth();
}

void ABridgePointEarthWorld::Tick(float DeltaSeconds)
{
    Super::Tick(DeltaSeconds);

    if (!SunSky || !FMath::IsFinite(DeltaSeconds) || DeltaSeconds <= 0.0f)
    {
        return;
    }

    SunUpdateAccumulatorSeconds += DeltaSeconds;
    const float Interval = FMath::Clamp(SunUpdateIntervalSeconds, 0.25f, 60.0f);
    if (SunUpdateAccumulatorSeconds >= Interval)
    {
        SunUpdateAccumulatorSeconds = FMath::Fmod(SunUpdateAccumulatorSeconds, Interval);
        UpdateSunFromSimulationClock();
    }
}

void ABridgePointEarthWorld::EndPlay(const EEndPlayReason::Type EndPlayReason)
{
    if (SunSky)
    {
        SunSky->Destroy();
        SunSky = nullptr;
    }

    if (SatelliteImageryOverlay)
    {
        SatelliteImageryOverlay->Deactivate();
        SatelliteImageryOverlay->DestroyComponent();
        SatelliteImageryOverlay = nullptr;
    }
    if (OSMBuildingsTileset)
    {
        OSMBuildingsTileset->Destroy();
        OSMBuildingsTileset = nullptr;
    }
    if (WorldTerrainTileset)
    {
        WorldTerrainTileset->Destroy();
        WorldTerrainTileset = nullptr;
    }
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

    ActiveSurfaceTileset = nullptr;
    bInitialized = false;
    Super::EndPlay(EndPlayReason);
}

FString ABridgePointEarthWorld::ReadIonAccessToken() const
{
    FString Token = FPlatformMisc::GetEnvironmentVariable(*IonTokenEnvironmentVariable);
    Token.TrimStartAndEndInline();
    return Token;
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
        OriginLatitudeDegrees < -90.0 || OriginLatitudeDegrees > 90.0 ||
        OriginLongitudeDegrees < -180.0 || OriginLongitudeDegrees > 180.0)
    {
        return false;
    }
    if (!CreateGeoreference())
    {
        return false;
    }

    if (bEnableAstronomicalSunSky)
    {
        CreateSunSky();
    }

    const FString IonToken = ReadIonAccessToken();
    if (!IonToken.IsEmpty() && bPreferCesiumWorldTerrain)
    {
        CreateWorldTerrain(IonToken);
    }
    if (!ActiveSurfaceTileset && !CreateBaseEllipsoid())
    {
        return false;
    }
    if (!IonToken.IsEmpty() && bEnableCesiumOSMBuildings)
    {
        CreateOSMBuildings(IonToken);
    }
    if (bEnableGlobalSatelliteImagery)
    {
        CreateSatelliteImageryOverlay();
    }

    bInitialized = ActiveSurfaceTileset != nullptr;
    return bInitialized;
}

bool ABridgePointEarthWorld::CreateSunSky()
{
    if (SunSky)
    {
        return true;
    }

    if (!GetWorld() || !Georeference)
    {
        return false;
    }

    FActorSpawnParameters Params;
    Params.Owner = this;
    Params.SpawnCollisionHandlingOverride = ESpawnActorCollisionHandlingMethod::AlwaysSpawn;

    SunSky = GetWorld()->SpawnActor<ACesiumSunSky>(
        ACesiumSunSky::StaticClass(),
        FTransform::Identity,
        Params);

    if (!SunSky || !SunSky->GlobeAnchor)
    {
        if (SunSky)
        {
            SunSky->Destroy();
            SunSky = nullptr;
        }
        return false;
    }

    SunSky->GlobeAnchor->SetGeoreference(
        TSoftObjectPtr<ACesiumGeoreference>(Georeference));

    // Solar calculations use UTC directly. Keeping DST off avoids applying a
    // local civil-time adjustment to the global solar direction.
    SunSky->TimeZone = 0.0;
    SunSky->UseDaylightSavingTime = false;
    SunSky->UpdateAtmosphereAtRuntime = true;
    UpdateSunFromSimulationClock();
    return true;
}

void ABridgePointEarthWorld::UpdateSunFromSimulationClock()
{
    if (!SunSky)
    {
        return;
    }

    FDateTime SimulationUtc = FDateTime::UtcNow();
    if (GetWorld())
    {
        if (UGameInstance* GameInstance = GetWorld()->GetGameInstance())
        {
            if (UBridgePointEarthSubsystem* Earth =
                GameInstance->GetSubsystem<UBridgePointEarthSubsystem>())
            {
                SimulationUtc = Earth->GetSimulationClockUtc();
            }
        }
    }

    SunSky->Year = SimulationUtc.GetYear();
    SunSky->Month = SimulationUtc.GetMonth();
    SunSky->Day = SimulationUtc.GetDay();
    SunSky->TimeZone = 0.0;
    SunSky->UseDaylightSavingTime = false;
    SunSky->SolarTime =
        static_cast<double>(SimulationUtc.GetHour()) +
        static_cast<double>(SimulationUtc.GetMinute()) / 60.0 +
        static_cast<double>(SimulationUtc.GetSecond()) / 3600.0;
    SunSky->UpdateSun();
}

bool ABridgePointEarthWorld::CreateGeoreference()
{
    if (Georeference)
    {
        return true;
    }

    FActorSpawnParameters Params;
    Params.Owner = this;
    Params.SpawnCollisionHandlingOverride = ESpawnActorCollisionHandlingMethod::AlwaysSpawn;
    Georeference = GetWorld()->SpawnActor<ACesiumGeoreference>(
        ACesiumGeoreference::StaticClass(), FTransform::Identity, Params);

    if (!Georeference)
    {
        return false;
    }

    Georeference->SetOriginLongitudeLatitudeHeight(
        FVector(OriginLongitudeDegrees, OriginLatitudeDegrees, OriginHeightMeters));
    return true;
}

ACesium3DTileset* ABridgePointEarthWorld::SpawnIonTileset(
    int64 AssetId,
    const FString& IonToken,
    double MaximumScreenSpaceError)
{
    if (!GetWorld() || !Georeference || IonToken.IsEmpty() || AssetId <= 0)
    {
        return nullptr;
    }

    FActorSpawnParameters Params;
    Params.Owner = this;
    Params.SpawnCollisionHandlingOverride = ESpawnActorCollisionHandlingMethod::AlwaysSpawn;
    ACesium3DTileset* Tileset = GetWorld()->SpawnActor<ACesium3DTileset>(
        ACesium3DTileset::StaticClass(), FTransform::Identity, Params);

    if (!Tileset)
    {
        return nullptr;
    }

    Tileset->SetGeoreference(TSoftObjectPtr<ACesiumGeoreference>(Georeference));
    Tileset->SetTilesetSource(ETilesetSource::FromCesiumIon);
    Tileset->SetIonAssetID(AssetId);
    Tileset->SetIonAccessToken(IonToken);
    Tileset->SetMaximumScreenSpaceError(MaximumScreenSpaceError);
    Tileset->SetUseLodTransitions(true);
    Tileset->SetEnableOcclusionCulling(true);
    Tileset->SetCreatePhysicsMeshes(false);
    Tileset->ShowCreditsOnScreen = true;
    return Tileset;
}

bool ABridgePointEarthWorld::CreateWorldTerrain(const FString& IonToken)
{
    if (WorldTerrainTileset)
    {
        ActiveSurfaceTileset = WorldTerrainTileset;
        return true;
    }

    WorldTerrainTileset = SpawnIonTileset(
        BridgePointEarth::CesiumWorldTerrainAssetId,
        IonToken,
        TerrainMaximumScreenSpaceError);

    if (!WorldTerrainTileset)
    {
        return false;
    }

    WorldTerrainTileset->SetEnableWaterMask(true);
    ActiveSurfaceTileset = WorldTerrainTileset;
    return true;
}

bool ABridgePointEarthWorld::CreateBaseEllipsoid()
{
    if (BaseEllipsoidTileset)
    {
        ActiveSurfaceTileset = BaseEllipsoidTileset;
        return true;
    }

    FActorSpawnParameters Params;
    Params.Owner = this;
    Params.SpawnCollisionHandlingOverride = ESpawnActorCollisionHandlingMethod::AlwaysSpawn;
    BaseEllipsoidTileset = GetWorld()->SpawnActor<ACesium3DTileset>(
        ACesium3DTileset::StaticClass(), FTransform::Identity, Params);

    if (!BaseEllipsoidTileset)
    {
        return false;
    }

    BaseEllipsoidTileset->SetGeoreference(TSoftObjectPtr<ACesiumGeoreference>(Georeference));
    BaseEllipsoidTileset->SetTilesetSource(ETilesetSource::FromEllipsoid);
    BaseEllipsoidTileset->SetMaximumScreenSpaceError(16.0);
    BaseEllipsoidTileset->SetUseLodTransitions(true);
    BaseEllipsoidTileset->SetEnableOcclusionCulling(true);
    BaseEllipsoidTileset->SetEnableWaterMask(true);
    BaseEllipsoidTileset->SetCreatePhysicsMeshes(false);
    BaseEllipsoidTileset->ShowCreditsOnScreen = true;
    ActiveSurfaceTileset = BaseEllipsoidTileset;
    return true;
}

bool ABridgePointEarthWorld::CreateOSMBuildings(const FString& IonToken)
{
    if (OSMBuildingsTileset)
    {
        return true;
    }

    OSMBuildingsTileset = SpawnIonTileset(
        BridgePointEarth::CesiumOSMBuildingsAssetId,
        IonToken,
        BuildingsMaximumScreenSpaceError);

    if (!OSMBuildingsTileset)
    {
        return false;
    }

    OSMBuildingsTileset->SetEnableWaterMask(false);
    return true;
}

bool ABridgePointEarthWorld::CreateSatelliteImageryOverlay()
{
    if (!ActiveSurfaceTileset)
    {
        return false;
    }
    if (SatelliteImageryOverlay)
    {
        return true;
    }

    SatelliteImageryOverlay =
        NewObject<UCesiumUrlTemplateRasterOverlay>(ActiveSurfaceTileset);
    if (!SatelliteImageryOverlay)
    {
        return false;
    }

    SatelliteImageryOverlay->TemplateUrl =
        TEXT("https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_NOAA20_CorrectedReflectance_TrueColor/default/default/GoogleMapsCompatible_Level9/{z}/{reverseY}/{x}.jpeg");
    SatelliteImageryOverlay->Projection =
        ECesiumUrlTemplateRasterOverlayProjection::WebMercator;
    SatelliteImageryOverlay->MinimumLevel = 0;
    SatelliteImageryOverlay->MaximumLevel = FMath::Clamp(MaximumSatelliteImageryLevel, 0, 9);
    SatelliteImageryOverlay->SetMaximumTextureSize(2048);
    SatelliteImageryOverlay->SetMaximumSimultaneousTileLoads(16);
    SatelliteImageryOverlay->SetSubTileCacheBytes(64 * 1024 * 1024LL);
    SatelliteImageryOverlay->ShowCreditsOnScreen = true;
    SatelliteImageryOverlay->RegisterComponent();
    SatelliteImageryOverlay->Activate(true);
    return true;
}
