#include "BridgePointEarthCloudSubsystem.h"

#include "Dom/JsonObject.h"
#include "HAL/PlatformMisc.h"
#include "Misc/DateTime.h"
#include "Misc/FileHelper.h"
#include "Misc/Paths.h"
#include "Serialization/JsonReader.h"
#include "Serialization/JsonSerializer.h"

namespace BridgePointEarthCloud
{
    const TCHAR* Schema = TEXT("bridgepoint-earth-cloud-field-v1");
    const TCHAR* DefaultRelativeDirectory =
        TEXT("ExternalAssets/BridgePointEarth/Clouds");
}

void UBridgePointEarthCloudSubsystem::Initialize(FSubsystemCollectionBase& Collection)
{
    Super::Initialize(Collection);
    ReloadLocalCloudFields();
}

void UBridgePointEarthCloudSubsystem::Deinitialize()
{
    CloudPoints.Reset();
    CloudSources.Reset();
    ManifestGeneratedAtUtc = FDateTime();
    Super::Deinitialize();
}

FString UBridgePointEarthCloudSubsystem::GetCloudSourceDirectory() const
{
    FString Configured = FPlatformMisc::GetEnvironmentVariable(
        TEXT("BRIDGEPOINT_EARTH_CLOUDS_PATH"));
    Configured.TrimStartAndEndInline();

    const FString Candidate = Configured.IsEmpty()
        ? FPaths::Combine(FPaths::ProjectDir(), BridgePointEarthCloud::DefaultRelativeDirectory)
        : Configured;

    return FPaths::ConvertRelativePathToFull(Candidate);
}

bool UBridgePointEarthCloudSubsystem::ParseIsoUtc(
    const FString& Value,
    FDateTime& OutDateTime)
{
    FString Normalized = Value;
    Normalized.TrimStartAndEndInline();

    if (Normalized.EndsWith(TEXT("Z"), ESearchCase::IgnoreCase))
    {
        Normalized.LeftChopInline(1);
        Normalized += TEXT("+00:00");
    }

    return FDateTime::ParseIso8601(*Normalized, OutDateTime);
}

bool UBridgePointEarthCloudSubsystem::IsValidRelativeFilePath(
    const FString& RootDirectory,
    const FString& RelativeFile,
    FString& OutFullPath)
{
    OutFullPath.Reset();

    if (RelativeFile.IsEmpty() ||
        FPaths::IsRelative(RelativeFile) == false ||
        RelativeFile.Contains(TEXT("..")) ||
        RelativeFile.Contains(TEXT(":")))
    {
        return false;
    }

    FString NormalizedRoot = FPaths::ConvertRelativePathToFull(RootDirectory);
    FPaths::NormalizeDirectoryName(NormalizedRoot);
    const FString RootPrefix = NormalizedRoot + TEXT("/");

    OutFullPath = FPaths::ConvertRelativePathToFull(
        FPaths::Combine(NormalizedRoot, RelativeFile));
    FPaths::NormalizeFilename(OutFullPath);

    return OutFullPath.StartsWith(RootPrefix, ESearchCase::IgnoreCase);
}

int32 UBridgePointEarthCloudSubsystem::ReloadLocalCloudFields()
{
    CloudPoints.Reset();
    CloudSources.Reset();
    ManifestGeneratedAtUtc = FDateTime();
    LastLoadMessage.Reset();

    const FString RootDirectory = GetCloudSourceDirectory();
    const FString ManifestPath = FPaths::Combine(RootDirectory, TEXT("manifest.json"));

    if (!FPaths::FileExists(ManifestPath))
    {
        LastLoadMessage = FString::Printf(
            TEXT("No local observed cloud manifest found at %s. No clouds were synthesized."),
            *ManifestPath);
        OnCloudFieldUpdated.Broadcast(0, LastLoadMessage);
        return 0;
    }

    if (!LoadManifest(ManifestPath))
    {
        OnCloudFieldUpdated.Broadcast(0, LastLoadMessage);
        return 0;
    }

    LastLoadMessage = FString::Printf(
        TEXT("Loaded %d observed cloud points from %d satellite source(s)."),
        CloudPoints.Num(),
        CloudSources.Num());
    OnCloudFieldUpdated.Broadcast(CloudPoints.Num(), LastLoadMessage);
    return CloudPoints.Num();
}

bool UBridgePointEarthCloudSubsystem::LoadManifest(const FString& ManifestPath)
{
    FString ManifestJson;
    if (!FFileHelper::LoadFileToString(ManifestJson, *ManifestPath))
    {
        LastLoadMessage = TEXT("Cloud manifest could not be read.");
        return false;
    }

    TSharedPtr<FJsonObject> Manifest;
    const TSharedRef<TJsonReader<>> Reader = TJsonReaderFactory<>::Create(ManifestJson);
    if (!FJsonSerializer::Deserialize(Reader, Manifest) || !Manifest.IsValid())
    {
        LastLoadMessage = TEXT("Cloud manifest is not valid JSON.");
        return false;
    }

    FString Schema;
    if (!Manifest->TryGetStringField(TEXT("schema"), Schema) ||
        Schema != BridgePointEarthCloud::Schema)
    {
        LastLoadMessage = TEXT("Cloud manifest schema is not supported.");
        return false;
    }

    FString GeneratedAt;
    if (!Manifest->TryGetStringField(TEXT("generated_at_utc"), GeneratedAt) ||
        !ParseIsoUtc(GeneratedAt, ManifestGeneratedAtUtc))
    {
        LastLoadMessage = TEXT("Cloud manifest has no valid UTC generation time.");
        return false;
    }

    const TArray<TSharedPtr<FJsonValue>>* Sources = nullptr;
    if (!Manifest->TryGetArrayField(TEXT("sources"), Sources) || !Sources)
    {
        LastLoadMessage = TEXT("Cloud manifest has no source array.");
        return false;
    }

    const FString RootDirectory = FPaths::GetPath(ManifestPath);
    const FDateTime NowUtc = FDateTime::UtcNow();
    int32 SkippedSources = 0;

    for (const TSharedPtr<FJsonValue>& SourceValue : *Sources)
    {
        if (CloudSources.Num() >= MaximumSources ||
            CloudPoints.Num() >= MaximumTotalPoints)
        {
            break;
        }

        if (!SourceValue.IsValid() || SourceValue->Type != EJson::Object)
        {
            ++SkippedSources;
            continue;
        }

        const TSharedPtr<FJsonObject> SourceManifest = SourceValue->AsObject();
        FString RelativeFile;
        if (!SourceManifest->TryGetStringField(TEXT("file"), RelativeFile))
        {
            ++SkippedSources;
            continue;
        }

        const int32 SourceIndex = CloudSources.Num();
        FBridgePointEarthCloudSource LoadedSource;
        TArray<FBridgePointEarthCloudPoint> LoadedPoints;
        FString Error;

        if (!LoadCloudFieldFile(
            RootDirectory,
            RelativeFile,
            SourceIndex,
            LoadedSource,
            LoadedPoints,
            Error))
        {
            ++SkippedSources;
            continue;
        }

        LoadedSource.PointCount = LoadedPoints.Num();
        LoadedSource.bFresh =
            (NowUtc - LoadedSource.ObservedAtUtc).GetTotalSeconds() <=
            static_cast<double>(MaximumSourceAgeSeconds);

        const int32 RemainingCapacity = MaximumTotalPoints - CloudPoints.Num();
        if (LoadedPoints.Num() > RemainingCapacity)
        {
            LoadedPoints.SetNum(RemainingCapacity, EAllowShrinking::No);
            LoadedSource.PointCount = LoadedPoints.Num();
        }

        CloudSources.Add(LoadedSource);
        CloudPoints.Append(LoadedPoints);
    }

    if (CloudSources.IsEmpty())
    {
        LastLoadMessage = FString::Printf(
            TEXT("No valid NOAA cloud source files were loaded (%d source entries skipped)."),
            SkippedSources);
        return false;
    }

    return true;
}

bool UBridgePointEarthCloudSubsystem::LoadCloudFieldFile(
    const FString& RootDirectory,
    const FString& RelativeFile,
    int32 SourceIndex,
    FBridgePointEarthCloudSource& OutSource,
    TArray<FBridgePointEarthCloudPoint>& OutPoints,
    FString& OutError) const
{
    FString FullPath;
    if (!IsValidRelativeFilePath(RootDirectory, RelativeFile, FullPath) ||
        !FPaths::FileExists(FullPath))
    {
        OutError = TEXT("Cloud field file path is invalid or missing.");
        return false;
    }

    FString Json;
    if (!FFileHelper::LoadFileToString(Json, *FullPath))
    {
        OutError = TEXT("Cloud field JSON could not be read.");
        return false;
    }

    TSharedPtr<FJsonObject> Root;
    const TSharedRef<TJsonReader<>> Reader = TJsonReaderFactory<>::Create(Json);
    if (!FJsonSerializer::Deserialize(Reader, Root) || !Root.IsValid())
    {
        OutError = TEXT("Cloud field file is not valid JSON.");
        return false;
    }

    FString Schema;
    if (!Root->TryGetStringField(TEXT("schema"), Schema) ||
        Schema != BridgePointEarthCloud::Schema ||
        !Root->HasTypedField<EJson::Object>(TEXT("source")))
    {
        OutError = TEXT("Cloud field file schema/source is invalid.");
        return false;
    }

    const TSharedPtr<FJsonObject> Source = Root->GetObjectField(TEXT("source"));
    FString EvidenceKind;
    FString ObservedAt;
    Source->TryGetStringField(TEXT("evidence_kind"), EvidenceKind);
    Source->TryGetStringField(TEXT("mask_scan_start_utc"), ObservedAt);

    if (EvidenceKind != TEXT("Observed") ||
        !ParseIsoUtc(ObservedAt, OutSource.ObservedAtUtc))
    {
        OutError = TEXT("Cloud field must have an observed evidence type and valid scan time.");
        return false;
    }

    Source->TryGetStringField(TEXT("source_id"), OutSource.SourceId);
    Source->TryGetStringField(TEXT("satellite"), OutSource.Satellite);
    Source->TryGetStringField(TEXT("source_name"), OutSource.SourceName);
    Source->TryGetStringField(TEXT("source_version"), OutSource.SourceVersion);
    Source->TryGetStringField(TEXT("license_id"), OutSource.LicenseId);
    Source->TryGetStringField(TEXT("attribution"), OutSource.Attribution);
    Source->TryGetBoolField(TEXT("commercially_cleared"), OutSource.bCommerciallyCleared);

    if (OutSource.SourceId.IsEmpty() ||
        OutSource.SourceName.IsEmpty() ||
        OutSource.LicenseId.IsEmpty() ||
        OutSource.Attribution.IsEmpty() ||
        OutSource.bCommerciallyCleared)
    {
        OutError = TEXT("Cloud source provenance is incomplete or has unexpected commercial clearance.");
        return false;
    }

    const TArray<TSharedPtr<FJsonValue>>* Points = nullptr;
    if (!Root->TryGetArrayField(TEXT("points"), Points) || !Points)
    {
        OutError = TEXT("Cloud field contains no point array.");
        return false;
    }

    OutPoints.Reset();
    OutPoints.Reserve(FMath::Min(Points->Num(), MaximumPointsPerSource));

    for (const TSharedPtr<FJsonValue>& PointValue : *Points)
    {
        if (OutPoints.Num() >= MaximumPointsPerSource)
        {
            break;
        }
        if (!PointValue.IsValid() || PointValue->Type != EJson::Object)
        {
            continue;
        }

        const TSharedPtr<FJsonObject> PointObject = PointValue->AsObject();
        double Latitude = 0.0;
        double Longitude = 0.0;
        double CloudTop = 0.0;
        double Probability = 0.0;
        double OpacityHint = 0.0;
        double MaskClass = 0.0;

        if (!PointObject->TryGetNumberField(TEXT("lat"), Latitude) ||
            !PointObject->TryGetNumberField(TEXT("lon"), Longitude) ||
            !PointObject->TryGetNumberField(TEXT("cloud_top_m"), CloudTop) ||
            !PointObject->TryGetNumberField(TEXT("mask_class"), MaskClass) ||
            !PointObject->TryGetNumberField(TEXT("probability"), Probability) ||
            !PointObject->TryGetNumberField(TEXT("opacity_hint"), OpacityHint))
        {
            continue;
        }

        if (!FMath::IsFinite(Latitude) ||
            !FMath::IsFinite(Longitude) ||
            !FMath::IsFinite(CloudTop) ||
            !FMath::IsFinite(Probability) ||
            !FMath::IsFinite(OpacityHint) ||
            Latitude < -90.0 || Latitude > 90.0 ||
            Longitude < -180.0 || Longitude > 180.0 ||
            CloudTop < 0.0 || CloudTop > 25000.0 ||
            MaskClass < 1.0 || MaskClass > 3.0 ||
            Probability < 0.0 || Probability > 1.0 ||
            OpacityHint < 0.0 || OpacityHint > 1.0)
        {
            continue;
        }

        FBridgePointEarthCloudPoint CloudPoint;
        CloudPoint.Location.LatitudeDegrees = Latitude;
        CloudPoint.Location.LongitudeDegrees = Longitude;
        CloudPoint.Location.EllipsoidHeightMeters = CloudTop;
        CloudPoint.CloudTopHeightMeters = static_cast<float>(CloudTop);
        CloudPoint.MaskClass = FMath::RoundToInt(MaskClass);
        CloudPoint.Probability = static_cast<float>(Probability);
        CloudPoint.OpacityHint = static_cast<float>(OpacityHint);
        CloudPoint.SourceIndex = SourceIndex;
        OutPoints.Add(CloudPoint);
    }

    if (OutPoints.IsEmpty())
    {
        OutError = TEXT("Cloud field contains no valid source-derived cloud points.");
        return false;
    }

    return true;
}

bool UBridgePointEarthCloudSubsystem::HasFreshObservedCloudData() const
{
    return CloudSources.ContainsByPredicate(
        [](const FBridgePointEarthCloudSource& Source)
        {
            return Source.bFresh;
        });
}

int32 UBridgePointEarthCloudSubsystem::GetFreshCloudPointCount() const
{
    int32 Count = 0;
    for (const FBridgePointEarthCloudPoint& Point : CloudPoints)
    {
        if (CloudSources.IsValidIndex(Point.SourceIndex) &&
            CloudSources[Point.SourceIndex].bFresh)
        {
            ++Count;
        }
    }
    return Count;
}
