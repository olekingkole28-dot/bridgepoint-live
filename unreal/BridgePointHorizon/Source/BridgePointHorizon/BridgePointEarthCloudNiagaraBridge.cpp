#include "BridgePointEarthCloudNiagaraBridge.h"

#include "BridgePointEarthCloudSubsystem.h"
#include "BridgePointEarthSubsystem.h"
#include "CesiumGeoreference.h"
#include "Engine/GameInstance.h"
#include "Engine/World.h"
#include "HAL/PlatformMisc.h"
#include "NiagaraComponent.h"
#include "NiagaraDataInterfaceArrayFunctionLibrary.h"
#include "NiagaraFunctionLibrary.h"
#include "NiagaraSystem.h"

UBridgePointEarthCloudNiagaraBridge::UBridgePointEarthCloudNiagaraBridge()
{
    PrimaryComponentTick.bCanEverTick = true;
    PrimaryComponentTick.bStartWithTickEnabled = true;
}

bool UBridgePointEarthCloudNiagaraBridge::InitializeForEarth(
    ACesiumGeoreference* InGeoreference)
{
    if (!IsValid(InGeoreference) || !GetWorld())
    {
        StatusMessage = TEXT("Cloud renderer needs a valid Cesium georeference.");
        return false;
    }

    Georeference = InGeoreference;
    if (UGameInstance* GameInstance = GetWorld()->GetGameInstance())
    {
        CloudSubsystem = GameInstance->GetSubsystem<UBridgePointEarthCloudSubsystem>();
        EarthSubsystem = GameInstance->GetSubsystem<UBridgePointEarthSubsystem>();
    }

    bEarthInitialized = true;
    RefreshAccumulatorSeconds = RefreshIntervalSeconds;

    if (!TryLoadNiagaraSystem())
    {
        return false;
    }

    if (!EnsureNiagaraFrameComponents())
    {
        return false;
    }

    UpdateObservedCloudFrames();
    return true;
}

void UBridgePointEarthCloudNiagaraBridge::TickComponent(
    float DeltaTime,
    ELevelTick TickType,
    FActorComponentTickFunction* ThisTickFunction)
{
    Super::TickComponent(DeltaTime, TickType, ThisTickFunction);

    if (!bEarthInitialized || !IsValid(Georeference) ||
        !FMath::IsFinite(DeltaTime) || DeltaTime <= 0.0f)
    {
        return;
    }

    if (!CloudNiagaraSystem)
    {
        AssetRetryAccumulatorSeconds += DeltaTime;
        if (AssetRetryAccumulatorSeconds >= 20.0f)
        {
            AssetRetryAccumulatorSeconds = 0.0f;
            if (TryLoadNiagaraSystem() && EnsureNiagaraFrameComponents())
            {
                UpdateObservedCloudFrames();
            }
        }
        return;
    }

    RefreshAccumulatorSeconds += DeltaTime;
    const float RefreshInterval = FMath::Clamp(RefreshIntervalSeconds, 1.0f, 60.0f);
    if (RefreshAccumulatorSeconds >= RefreshInterval)
    {
        RefreshAccumulatorSeconds = FMath::Fmod(RefreshAccumulatorSeconds, RefreshInterval);
        UpdateObservedCloudFrames();
    }
}

void UBridgePointEarthCloudNiagaraBridge::EndPlay(
    const EEndPlayReason::Type EndPlayReason)
{
    ShutdownCloudRendering();
    Super::EndPlay(EndPlayReason);
}

bool UBridgePointEarthCloudNiagaraBridge::TryLoadNiagaraSystem()
{
    if (CloudNiagaraSystem)
    {
        return true;
    }

    FString AssetPath = FPlatformMisc::GetEnvironmentVariable(
        TEXT("BRIDGEPOINT_EARTH_CLOUD_NIAGARA_ASSET"));
    AssetPath.TrimStartAndEndInline();

    if (AssetPath.IsEmpty())
    {
        StatusMessage = TEXT(
            "GOES observations are loaded; Niagara cloud effect is not configured. "
            "Set BRIDGEPOINT_EARTH_CLOUD_NIAGARA_ASSET to a Niagara system asset path.");
        if (!bLoggedMissingAssetPath)
        {
            UE_LOG(LogTemp, Display, TEXT("BridgePoint Earth: %s"), *StatusMessage);
            bLoggedMissingAssetPath = true;
        }
        return false;
    }

    CloudNiagaraSystem = LoadObject<UNiagaraSystem>(nullptr, *AssetPath);
    if (!CloudNiagaraSystem)
    {
        StatusMessage = FString::Printf(
            TEXT("Niagara cloud system could not be loaded from '%s'. "
                 "Earth rendering will continue without cloud effects."),
            *AssetPath);
        if (!bLoggedInvalidAsset)
        {
            UE_LOG(LogTemp, Warning, TEXT("BridgePoint Earth: %s"), *StatusMessage);
            bLoggedInvalidAsset = true;
        }
        return false;
    }

    bLoggedMissingAssetPath = false;
    bLoggedInvalidAsset = false;
    StatusMessage = TEXT("Observed GOES cloud Niagara system loaded.");
    return true;
}

bool UBridgePointEarthCloudNiagaraBridge::EnsureNiagaraFrameComponents()
{
    if (!GetWorld() || !CloudNiagaraSystem)
    {
        return false;
    }

    NiagaraFrameComponents.SetNum(NiagaraFrameSlotCount);

    for (int32 Slot = 0; Slot < NiagaraFrameSlotCount; ++Slot)
    {
        if (IsValid(NiagaraFrameComponents[Slot]))
        {
            continue;
        }

        UNiagaraComponent* NiagaraComponent =
            UNiagaraFunctionLibrary::SpawnSystemAtLocation(
                this,
                CloudNiagaraSystem,
                FVector::ZeroVector,
                FRotator::ZeroRotator,
                FVector::OneVector,
                false,
                false,
                ENCPoolMethod::None,
                false);

        if (!NiagaraComponent)
        {
            StatusMessage = TEXT("Failed to create a Niagara cloud frame component.");
            UE_LOG(LogTemp, Warning, TEXT("BridgePoint Earth: %s"), *StatusMessage);
            return false;
        }

        NiagaraFrameComponents[Slot] = NiagaraComponent;
        NiagaraComponent->SetVariableFloat(TEXT("User.VisibilityWeight"), 0.0f);
        NiagaraComponent->SetVariableInt(TEXT("User.PointCount"), 0);
        NiagaraComponent->Activate(true);
        NiagaraComponent->SetVisibility(false);
    }

    return true;
}

void UBridgePointEarthCloudNiagaraBridge::UpdateObservedCloudFrames()
{
    if (!CloudSubsystem.IsValid() || !EarthSubsystem.IsValid() ||
        !Georeference || NiagaraFrameComponents.Num() != NiagaraFrameSlotCount)
    {
        for (int32 Slot = 0; Slot < NiagaraFrameSlotCount; ++Slot)
        {
            ClearCloudFrame(Slot);
        }
        LastSubmittedPointCount = 0;
        StatusMessage = TEXT("Waiting for observed cloud data, simulation clock, or Cesium georeference.");
        return;
    }

    UpdateSatelliteFrames(TEXT("GOES19"), 0);
    UpdateSatelliteFrames(TEXT("GOES18"), 2);

    StatusMessage = FString::Printf(
        TEXT("NOAA observed cloud samples bridged to Niagara: %d point(s). "
             "Coverage is limited to valid GOES observations."),
        LastSubmittedPointCount);
}

void UBridgePointEarthCloudNiagaraBridge::UpdateSatelliteFrames(
    const FString& Satellite,
    int32 FirstSlot)
{
    int32 EarlierSourceIndex = INDEX_NONE;
    int32 LaterSourceIndex = INDEX_NONE;
    float BlendAlpha = 0.0f;

    const FDateTime SimulationTimeUtc = EarthSubsystem.IsValid()
        ? EarthSubsystem->GetSimulationClockUtc()
        : FDateTime::UtcNow();

    if (!CloudSubsystem->ResolveCloudFramePair(
        Satellite,
        SimulationTimeUtc,
        EarlierSourceIndex,
        LaterSourceIndex,
        BlendAlpha))
    {
        ClearCloudFrame(FirstSlot);
        ClearCloudFrame(FirstSlot + 1);
        return;
    }

    if (EarlierSourceIndex == LaterSourceIndex)
    {
        SubmitCloudFrame(FirstSlot, EarlierSourceIndex, 1.0f);
        ClearCloudFrame(FirstSlot + 1);
        return;
    }

    SubmitCloudFrame(FirstSlot, EarlierSourceIndex, 1.0f - BlendAlpha);
    SubmitCloudFrame(FirstSlot + 1, LaterSourceIndex, BlendAlpha);
}

bool UBridgePointEarthCloudNiagaraBridge::SubmitCloudFrame(
    int32 Slot,
    int32 SourceIndex,
    float VisibilityWeight)
{
    if (!NiagaraFrameComponents.IsValidIndex(Slot) ||
        !IsValid(NiagaraFrameComponents[Slot]) ||
        !CloudSubsystem.IsValid() ||
        !Georeference ||
        !FMath::IsFinite(VisibilityWeight) ||
        VisibilityWeight <= KINDA_SMALL_NUMBER)
    {
        ClearCloudFrame(Slot);
        return false;
    }

    const TArray<FBridgePointEarthCloudPoint> SourcePoints =
        CloudSubsystem->GetCloudPointsForSource(SourceIndex);
    if (SourcePoints.IsEmpty())
    {
        ClearCloudFrame(Slot);
        return false;
    }

    const int32 PointLimit = FMath::Clamp(MaximumPointsPerFrame, 100, 20000);
    const int32 Stride = FMath::Max(
        1,
        FMath::CeilToInt(static_cast<float>(SourcePoints.Num()) /
            static_cast<float>(PointLimit)));

    TArray<FVector> WorldPositions;
    TArray<FVector4> CloudAttributes;
    WorldPositions.Reserve(FMath::Min(PointLimit, SourcePoints.Num()));
    CloudAttributes.Reserve(FMath::Min(PointLimit, SourcePoints.Num()));

    for (int32 Index = 0; Index < SourcePoints.Num(); Index += Stride)
    {
        const FBridgePointEarthCloudPoint& Point = SourcePoints[Index];
        const double GeometricHeightMeters =
            GeopotentialToGeometricHeightMeters(Point.CloudTopHeightMeters);
        if (!FMath::IsFinite(GeometricHeightMeters) ||
            !Point.Location.IsValid())
        {
            continue;
        }

        const FVector LongitudeLatitudeHeight(
            Point.Location.LongitudeDegrees,
            Point.Location.LatitudeDegrees,
            GeometricHeightMeters);
        const FVector WorldPosition =
            Georeference->TransformLongitudeLatitudeHeightPositionToUnreal(
                LongitudeLatitudeHeight);

        if (!FMath::IsFinite(WorldPosition.X) ||
            !FMath::IsFinite(WorldPosition.Y) ||
            !FMath::IsFinite(WorldPosition.Z))
        {
            continue;
        }

        WorldPositions.Add(WorldPosition);
        CloudAttributes.Add(FVector4(
            FMath::Clamp(Point.OpacityHint, 0.0f, 1.0f),
            FMath::Clamp(Point.Probability, 0.0f, 1.0f),
            static_cast<float>(Point.MaskClass),
            Point.CloudTopHeightMeters));
    }

    UNiagaraComponent* NiagaraComponent = NiagaraFrameComponents[Slot];
    if (!NiagaraComponent)
    {
        return false;
    }

    UNiagaraDataInterfaceArrayFunctionLibrary::SetNiagaraArrayPosition(
        NiagaraComponent,
        FName(TEXT("User.CloudPositions")),
        WorldPositions);
    UNiagaraDataInterfaceArrayFunctionLibrary::SetNiagaraArrayVector4(
        NiagaraComponent,
        FName(TEXT("User.CloudAttributes")),
        CloudAttributes);

    NiagaraComponent->SetVariableFloat(
        FName(TEXT("User.VisibilityWeight")),
        VisibilityWeight);
    NiagaraComponent->SetVariableInt(
        FName(TEXT("User.PointCount")),
        WorldPositions.Num());
    NiagaraComponent->SetVisibility(!WorldPositions.IsEmpty());
    NiagaraComponent->Activate(true);

    LastSubmittedPointCount += WorldPositions.Num();
    return !WorldPositions.IsEmpty();
}

void UBridgePointEarthCloudNiagaraBridge::ClearCloudFrame(int32 Slot)
{
    if (!NiagaraFrameComponents.IsValidIndex(Slot) ||
        !IsValid(NiagaraFrameComponents[Slot]))
    {
        return;
    }

    UNiagaraComponent* NiagaraComponent = NiagaraFrameComponents[Slot];
    UNiagaraDataInterfaceArrayFunctionLibrary::SetNiagaraArrayPosition(
        NiagaraComponent,
        FName(TEXT("User.CloudPositions")),
        TArray<FVector>());
    UNiagaraDataInterfaceArrayFunctionLibrary::SetNiagaraArrayVector4(
        NiagaraComponent,
        FName(TEXT("User.CloudAttributes")),
        TArray<FVector4>());
    NiagaraComponent->SetVariableFloat(
        FName(TEXT("User.VisibilityWeight")),
        0.0f);
    NiagaraComponent->SetVariableInt(
        FName(TEXT("User.PointCount")),
        0);
    NiagaraComponent->SetVisibility(false);
}

double UBridgePointEarthCloudNiagaraBridge::GeopotentialToGeometricHeightMeters(
    double GeopotentialHeightMeters)
{
    if (!FMath::IsFinite(GeopotentialHeightMeters) ||
        GeopotentialHeightMeters < 0.0 ||
        GeopotentialHeightMeters >= MeanEarthRadiusMeters)
    {
        return TNumericLimits<double>::QuietNaN();
    }

    // GOES cloud-top height is geopotential height. Convert it to an
    // approximate geometric height before passing it to Cesium's ellipsoid-
    // height transform. This spherical conversion is accurate enough for
    // rendering cloud tops at atmospheric heights, but is not a survey datum.
    return (MeanEarthRadiusMeters * GeopotentialHeightMeters) /
        (MeanEarthRadiusMeters - GeopotentialHeightMeters);
}

void UBridgePointEarthCloudNiagaraBridge::ShutdownCloudRendering()
{
    for (TObjectPtr<UNiagaraComponent>& Component : NiagaraFrameComponents)
    {
        if (IsValid(Component))
        {
            Component->DeactivateImmediate();
            Component->DestroyComponent();
        }
    }

    NiagaraFrameComponents.Reset();
    CloudNiagaraSystem = nullptr;
    Georeference = nullptr;
    CloudSubsystem.Reset();
    EarthSubsystem.Reset();
    LastSubmittedPointCount = 0;
    bEarthInitialized = false;
}
