#include "BridgePointEarthLightningSubsystem.h"

#include "Dom/JsonObject.h"
#include "HAL/PlatformMisc.h"
#include "Misc/DateTime.h"
#include "Misc/FileHelper.h"
#include "Misc/Paths.h"
#include "Serialization/JsonReader.h"
#include "Serialization/JsonSerializer.h"

namespace BridgePointEarthLightning
{
    const TCHAR* Schema = TEXT("bridgepoint-earth-lightning-flashes-v1");
    const TCHAR* DefaultRelativeDirectory =
        TEXT("ExternalAssets/BridgePointEarth/Lightning");
}

void UBridgePointEarthLightningSubsystem::Initialize(FSubsystemCollectionBase& Collection)
{
    Super::Initialize(Collection);
    ReloadLocalLightning();
}

void UBridgePointEarthLightningSubsystem::Deinitialize()
{
    Flashes.Reset();
    Sources.Reset();
    ManifestGeneratedAtUtc = FDateTime();
    Super::Deinitialize();
}

FString UBridgePointEarthLightningSubsystem::GetLightningSourceDirectory() const
{
    FString Configured = FPlatformMisc::GetEnvironmentVariable(
        TEXT("BRIDGEPOINT_EARTH_LIGHTNING_PATH"));
    Configured.TrimStartAndEndInline();

    const FString Candidate = Configured.IsEmpty()
        ? FPaths::Combine(FPaths::ProjectDir(), BridgePointEarthLightning::DefaultRelativeDirectory)
        : Configured;
    return FPaths::ConvertRelativePathToFull(Candidate);
}

bool UBridgePointEarthLightningSubsystem::ParseIsoUtc(
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

bool UBridgePointEarthLightningSubsystem::IsValidRelativeFilePath(
    const FString& RootDirectory,
    const FString& RelativeFile,
    FString& OutFullPath)
{
    OutFullPath.Reset();
    if (RelativeFile.IsEmpty() ||
        !FPaths::IsRelative(RelativeFile) ||
        RelativeFile.Contains(TEXT("..")) ||
        RelativeFile.Contains(TEXT(":")))
    {
        return false;
    }

    FString NormalizedRoot = FPaths::ConvertRelativePathToFull(RootDirectory);
    FPaths::NormalizeDirectoryName(NormalizedRoot);
    const FString Prefix = NormalizedRoot + TEXT("/");
    OutFullPath = FPaths::ConvertRelativePathToFull(
        FPaths::Combine(NormalizedRoot, RelativeFile));
    FPaths::NormalizeFilename(OutFullPath);
    return OutFullPath.StartsWith(Prefix, ESearchCase::IgnoreCase);
}

bool UBridgePointEarthLightningSubsystem::IsFlashStructurallyValid(
    const FBridgePointEarthLightningFlash& Flash)
{
    return Flash.Centroid.IsValid() &&
        Flash.FirstEventUtc.GetTicks() > 0 &&
        Flash.LastEventUtc >= Flash.FirstEventUtc &&
        FMath::IsFinite(Flash.RadiantEnergyJoules) &&
        Flash.RadiantEnergyJoules >= 0.0 &&
        Flash.RadiantEnergyJoules <= 1.0e12 &&
        FMath::IsFinite(Flash.FootprintAreaSquareMeters) &&
        Flash.FootprintAreaSquareMeters >= 0.0 &&
        Flash.FootprintAreaSquareMeters <= 1.0e12 &&
        Flash.QualityFlag == 0 &&
        !Flash.Satellite.IsEmpty() &&
        Flash.DetectionKind == TEXT("GLM_optical_flash");
}

bool UBridgePointEarthLightningSubsystem::IsSourceFreshAt(
    const FBridgePointEarthLightningSource& Source,
    FDateTime NowUtc,
    int32 MaximumAgeSeconds)
{
    if (NowUtc.GetTicks() <= 0 ||
        Source.LatestEventUtc.GetTicks() <= 0 ||
        MaximumAgeSeconds < 0)
    {
        return false;
    }

    const double AgeSeconds =
        (NowUtc - Source.LatestEventUtc).GetTotalSeconds();
    return AgeSeconds >= 0.0 &&
        AgeSeconds <= static_cast<double>(MaximumAgeSeconds);
}

int32 UBridgePointEarthLightningSubsystem::ReloadLocalLightning()
{
    Flashes.Reset();
    Sources.Reset();
    ManifestGeneratedAtUtc = FDateTime();
    LastLoadMessage.Reset();

    const FString RootDirectory = GetLightningSourceDirectory();
    const FString ManifestPath = FPaths::Combine(RootDirectory, TEXT("manifest.json"));

    if (!FPaths::FileExists(ManifestPath))
    {
        LastLoadMessage = FString::Printf(
            TEXT("No local observed lightning manifest found at %s."),
            *ManifestPath);
        OnLightningFieldUpdated.Broadcast(0, LastLoadMessage);
        return 0;
    }

    if (!LoadManifest(ManifestPath))
    {
        OnLightningFieldUpdated.Broadcast(0, LastLoadMessage);
        return 0;
    }

    LastLoadMessage = FString::Printf(
        TEXT("Loaded %d observed GLM flashes from %d satellite source(s)."),
        Flashes.Num(),
        Sources.Num());
    OnLightningFieldUpdated.Broadcast(Flashes.Num(), LastLoadMessage);
    return Flashes.Num();
}

bool UBridgePointEarthLightningSubsystem::LoadManifest(const FString& ManifestPath)
{
    FString Json;
    if (!FFileHelper::LoadFileToString(Json, *ManifestPath))
    {
        LastLoadMessage = TEXT("Lightning manifest could not be read.");
        return false;
    }

    TSharedPtr<FJsonObject> Manifest;
    const TSharedRef<TJsonReader<>> Reader = TJsonReaderFactory<>::Create(Json);
    if (!FJsonSerializer::Deserialize(Reader, Manifest) || !Manifest.IsValid())
    {
        LastLoadMessage = TEXT("Lightning manifest is not valid JSON.");
        return false;
    }

    FString Schema;
    FString GeneratedAt;
    if (!Manifest->TryGetStringField(TEXT("schema"), Schema) ||
        Schema != BridgePointEarthLightning::Schema ||
        !Manifest->TryGetStringField(TEXT("generated_at_utc"), GeneratedAt) ||
        !ParseIsoUtc(GeneratedAt, ManifestGeneratedAtUtc))
    {
        LastLoadMessage = TEXT("Lightning manifest schema or generation timestamp is invalid.");
        return false;
    }

    const TArray<TSharedPtr<FJsonValue>>* Entries = nullptr;
    if (!Manifest->TryGetArrayField(TEXT("sources"), Entries) || !Entries)
    {
        LastLoadMessage = TEXT("Lightning manifest has no sources array.");
        return false;
    }

    const FString RootDirectory = FPaths::GetPath(ManifestPath);
    int32 SkippedSources = 0;
    for (const TSharedPtr<FJsonValue>& EntryValue : *Entries)
    {
        if (Sources.Num() >= MaximumSources ||
            Flashes.Num() >= MaximumTotalFlashes)
        {
            break;
        }
        if (!EntryValue.IsValid() || EntryValue->Type != EJson::Object)
        {
            ++SkippedSources;
            continue;
        }

        FString RelativeFile;
        if (!EntryValue->AsObject()->TryGetStringField(TEXT("file"), RelativeFile))
        {
            ++SkippedSources;
            continue;
        }

        FBridgePointEarthLightningSource Source;
        TArray<FBridgePointEarthLightningFlash> LoadedFlashes;
        FString Error;
        const int32 SourceIndex = Sources.Num();

        if (!LoadLightningFile(
            RootDirectory, RelativeFile, SourceIndex,
            Source, LoadedFlashes, Error))
        {
            ++SkippedSources;
            continue;
        }

        const int32 Remaining = MaximumTotalFlashes - Flashes.Num();
        if (LoadedFlashes.Num() > Remaining)
        {
            LoadedFlashes.SetNum(Remaining, EAllowShrinking::No);
        }

        Source.FlashCount = LoadedFlashes.Num();
        Source.GeneratedAtUtc = ManifestGeneratedAtUtc;
        Source.bFresh = IsSourceFreshAt(
            Source,
            FDateTime::UtcNow(),
            MaximumSourceAgeSeconds);
        Sources.Add(Source);
        Flashes.Append(LoadedFlashes);
    }

    if (Sources.IsEmpty())
    {
        LastLoadMessage = FString::Printf(
            TEXT("No valid NOAA GLM flash files were loaded (%d source entries skipped)."),
            SkippedSources);
        return false;
    }
    return true;
}

bool UBridgePointEarthLightningSubsystem::LoadLightningFile(
    const FString& RootDirectory,
    const FString& RelativeFile,
    int32 SourceIndex,
    FBridgePointEarthLightningSource& OutSource,
    TArray<FBridgePointEarthLightningFlash>& OutFlashes,
    FString& OutError) const
{
    FString FullPath;
    if (!IsValidRelativeFilePath(RootDirectory, RelativeFile, FullPath) ||
        !FPaths::FileExists(FullPath))
    {
        OutError = TEXT("Lightning file path is invalid or missing.");
        return false;
    }

    FString Json;
    if (!FFileHelper::LoadFileToString(Json, *FullPath))
    {
        OutError = TEXT("Lightning JSON file could not be read.");
        return false;
    }

    TSharedPtr<FJsonObject> Root;
    const TSharedRef<TJsonReader<>> Reader = TJsonReaderFactory<>::Create(Json);
    if (!FJsonSerializer::Deserialize(Reader, Root) || !Root.IsValid() ||
        !Root->HasTypedField<EJson::Object>(TEXT("source")))
    {
        OutError = TEXT("Lightning file schema/source is invalid.");
        return false;
    }

    FString Schema;
    if (!Root->TryGetStringField(TEXT("schema"), Schema) ||
        Schema != BridgePointEarthLightning::Schema)
    {
        OutError = TEXT("Lightning field schema is unsupported.");
        return false;
    }

    const TSharedPtr<FJsonObject> Source = Root->GetObjectField(TEXT("source"));
    FString EvidenceKind;
    FString DetectionKind;
    FString Classification;

    Source->TryGetStringField(TEXT("evidence_kind"), EvidenceKind);
    Source->TryGetStringField(TEXT("detection_type"), DetectionKind);
    Source->TryGetStringField(TEXT("cloud_to_ground_vs_intracloud_classification"), Classification);
    if (EvidenceKind != TEXT("Observed") ||
        DetectionKind != TEXT("optical_lightning_flashes") ||
        Classification != TEXT("not_provided_by_this_product"))
    {
        OutError = TEXT("Lightning source evidence or detection semantics are invalid.");
        return false;
    }

    bool bGroundStrikeGuaranteed = true;
    if (!Source->TryGetBoolField(TEXT("ground_strike_location_guaranteed"), bGroundStrikeGuaranteed) ||
        bGroundStrikeGuaranteed)
    {
        OutError = TEXT("GLM flash centroids must explicitly remain unclassified as ground-strike points.");
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
        OutSource.Satellite.IsEmpty() ||
        OutSource.SourceName.IsEmpty() ||
        OutSource.LicenseId.IsEmpty() ||
        OutSource.Attribution.IsEmpty() ||
        OutSource.bCommerciallyCleared)
    {
        OutError = TEXT("Lightning source provenance is incomplete or unexpectedly commercially cleared.");
        return false;
    }

    const TArray<TSharedPtr<FJsonValue>>* FlashArray = nullptr;
    if (!Root->TryGetArrayField(TEXT("flashes"), FlashArray) || !FlashArray)
    {
        OutError = TEXT("Lightning field has no flash array.");
        return false;
    }

    OutFlashes.Reset();
    OutFlashes.Reserve(FMath::Min(FlashArray->Num(), MaximumFlashesPerSource));

    for (const TSharedPtr<FJsonValue>& FlashValue : *FlashArray)
    {
        if (OutFlashes.Num() >= MaximumFlashesPerSource)
        {
            break;
        }
        if (!FlashValue.IsValid() || FlashValue->Type != EJson::Object)
        {
            continue;
        }

        const TSharedPtr<FJsonObject> FlashObject = FlashValue->AsObject();
        FBridgePointEarthLightningFlash Flash;
        double Latitude = 0.0;
        double Longitude = 0.0;

        double FlashId = 0.0;
        FlashObject->TryGetNumberField(TEXT("flash_id"), FlashId);
        Flash.FlashId = FMath::IsFinite(FlashId)
            ? static_cast<int64>(FlashId)
            : INDEX_NONE;

        double Energy = 0.0;
        double Area = 0.0;
        double Quality = 255.0;
        FString FirstEvent;
        FString LastEvent;
        if (!FlashObject->TryGetNumberField(TEXT("lat"), Latitude) ||
            !FlashObject->TryGetNumberField(TEXT("lon"), Longitude) ||
            !FlashObject->TryGetNumberField(TEXT("energy_j"), Energy) ||
            !FlashObject->TryGetNumberField(TEXT("area_m2"), Area) ||
            !FlashObject->TryGetNumberField(TEXT("quality_flag"), Quality) ||
            !FlashObject->TryGetStringField(TEXT("first_event_utc"), FirstEvent) ||
            !FlashObject->TryGetStringField(TEXT("last_event_utc"), LastEvent))
        {
            continue;
        }

        Flash.Centroid.LatitudeDegrees = Latitude;
        Flash.Centroid.LongitudeDegrees = Longitude;
        Flash.Centroid.EllipsoidHeightMeters = 0.0;
        if (!ParseIsoUtc(FirstEvent, Flash.FirstEventUtc) ||
            !ParseIsoUtc(LastEvent, Flash.LastEventUtc))
        {
            continue;
        }

        Flash.RadiantEnergyJoules = Energy;
        Flash.FootprintAreaSquareMeters = Area;
        Flash.QualityFlag = FMath::RoundToInt(Quality);
        Flash.Satellite = OutSource.Satellite;
        Flash.SourceIndex = SourceIndex;

        if (IsFlashStructurallyValid(Flash))
        {
            if (OutSource.LatestEventUtc.GetTicks() <= 0 ||
                Flash.LastEventUtc > OutSource.LatestEventUtc)
            {
                OutSource.LatestEventUtc = Flash.LastEventUtc;
            }
            OutFlashes.Add(Flash);
        }
    }

    if (OutFlashes.IsEmpty())
    {
        OutError = TEXT("Lightning field contains no valid, quality-screened flashes.");
        return false;
    }
    return true;
}

bool UBridgePointEarthLightningSubsystem::HasFreshObservedLightningData() const
{
    return Sources.ContainsByPredicate(
        [](const FBridgePointEarthLightningSource& Source)
        {
            return Source.bFresh;
        });
}

int32 UBridgePointEarthLightningSubsystem::GetFreshFlashCount() const
{
    int32 Count = 0;
    for (const FBridgePointEarthLightningFlash& Flash : Flashes)
    {
        if (Sources.IsValidIndex(Flash.SourceIndex) &&
            Sources[Flash.SourceIndex].bFresh)
        {
            ++Count;
        }
    }
    return Count;
}

