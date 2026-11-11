#include "BPPCGBridgeComponent.h"
#include "BridgePointGeoReference.h"
#include "Data/PCGPointData.h"
#include "PCGPoint.h"
#include "PCGData.h"

namespace
{
    static FVector2D FeatureCentroid(const FBPGeoFeature& Feature)
    {
        FVector2D Sum(0, 0);
        int32 Count = 0;
        for (const TArray<FVector2D>& Path : Feature.Paths)
            for (const FVector2D& P : Path)
                if (FMath::IsFinite(P.X) && FMath::IsFinite(P.Y)) { Sum += P; ++Count; }
        return Count ? Sum / static_cast<double>(Count) : FVector2D::ZeroVector;
    }

    static float ClearanceForLayer(const FString& Layer)
    {
        const FString S = Layer.ToLower();
        if (S.Contains(TEXT("road")) || S.Contains(TEXT("transportation"))) return 6.0f;
        if (S.Contains(TEXT("sidewalk")) || S.Contains(TEXT("footway"))) return 1.5f;
        if (S.Contains(TEXT("power")) || S.Contains(TEXT("line"))) return 5.0f;
        if (S.Contains(TEXT("tower")) || S.Contains(TEXT("mast"))) return 8.0f;
        if (S.Contains(TEXT("well"))) return 3.0f;
        if (S.Contains(TEXT("bridge"))) return 8.0f;
        return 0.0f;
    }

    static void AppendPoint(TMap<FName, TArray<FPCGPoint>>& Target, FName LayerTag,
                            const FVector2D& LocalMeters, float YawDegrees, int32 Seed,
                            const FVector& ExtentsCm)
    {
        FPCGPoint Point;
        Point.Transform = FTransform(FRotator(0.0f, YawDegrees, 0.0f),
                                     FVector(LocalMeters.X * 100.0, LocalMeters.Y * 100.0, 0.0));
        Point.Density = 1.0f;
        Point.Seed = Seed;
        Point.SetExtents(ExtentsCm);
        Target.FindOrAdd(LayerTag).Add(MoveTemp(Point));
    }
}

UBPPCGBridgeComponent::UBPPCGBridgeComponent()
{
    PrimaryComponentTick.bCanEverTick = false;
}

void UBPPCGBridgeComponent::SetSourceFeatures(const TArray<FBPGeoFeature>& Features)
{
    SourceFeatures = Features;
}

FPCGDataCollection UBPPCGBridgeComponent::BuildStructuralCollection()
{
    FPCGDataCollection Collection;
    TMap<FName, TArray<FPCGPoint>> FeaturePoints;
    TMap<FName, TArray<FPCGPoint>> ClearancePoints;
    const double SpacingM = FMath::Max(1.0f, ClearanceSampleSpacingMeters);

    for (const FBPGeoFeature& Feature : SourceFeatures)
    {
        if (Feature.Paths.IsEmpty()) continue;
        const FName LayerTag = FName(*Feature.SourceLayer.ToLower());
        const float ClearanceM = ClearanceForLayer(Feature.SourceLayer);
        const int32 Seed = static_cast<int32>(GetTypeHash(Feature.SourceId) & 0x7fffffff);

        if (Feature.GeometryType != EBPGeometryType::LineString)
        {
            const FVector2D Center = FeatureCentroid(Feature);
            const FVector2D Local = FBridgePointGeoReference::ToLocalMeters(Center.X, Center.Y, OriginLongitude, OriginLatitude);
            AppendPoint(FeaturePoints, LayerTag, Local, 0.0f, Seed, FVector(50.0, 50.0, 50.0));
        }

        for (const TArray<FVector2D>& Path : Feature.Paths)
        {
            if (Path.Num() == 1)
            {
                const FVector2D Local = FBridgePointGeoReference::ToLocalMeters(Path[0].X, Path[0].Y, OriginLongitude, OriginLatitude);
                if (Feature.GeometryType == EBPGeometryType::Point)
                    AppendPoint(FeaturePoints, LayerTag, Local, 0.0f, Seed, FVector(50.0, 50.0, 50.0));
                if (ClearanceM > 0.0f)
                    AppendPoint(ClearancePoints, LayerTag, Local, 0.0f, Seed, FVector(ClearanceM*100.0, ClearanceM*100.0, 300.0));
                continue;
            }

            if (Path.Num() < 2) continue;
            for (int32 I = 0; I + 1 < Path.Num(); ++I)
            {
                const FVector2D ALocal = FBridgePointGeoReference::ToLocalMeters(Path[I].X, Path[I].Y, OriginLongitude, OriginLatitude);
                const FVector2D BLocal = FBridgePointGeoReference::ToLocalMeters(Path[I+1].X, Path[I+1].Y, OriginLongitude, OriginLatitude);
                const FVector2D Delta = BLocal - ALocal;
                const double SegmentLength = Delta.Size();
                if (SegmentLength <= UE_SMALL_NUMBER) continue;
                const float Yaw = FMath::RadiansToDegrees(FMath::Atan2(Delta.Y, Delta.X));
                const int32 Samples = FMath::Clamp(FMath::CeilToInt(SegmentLength / SpacingM), 1, 512);

                // Preserve the source line as an oriented sequence of PCG points, not
                // a single centroid, so bridge/road/line placement follows its geometry.
                if (Feature.GeometryType == EBPGeometryType::LineString)
                {
                    for (int32 Sample = 0; Sample <= Samples; ++Sample)
                    {
                        const FVector2D Local = FMath::Lerp(ALocal, BLocal, static_cast<double>(Sample)/Samples);
                        AppendPoint(FeaturePoints, LayerTag, Local, Yaw, Seed,
                                    FVector(SpacingM*50.0, FMath::Max(50.0f, Feature.WidthMeters*50.0f), 50.0));
                    }
                }

                if (ClearanceM <= 0.0f) continue;
                for (int32 Sample = 0; Sample <= Samples; ++Sample)
                {
                    const FVector2D Local = FMath::Lerp(ALocal, BLocal, static_cast<double>(Sample)/Samples);
                    AppendPoint(ClearancePoints, LayerTag, Local, Yaw, Seed,
                                FVector(ClearanceM*100.0, ClearanceM*100.0, 300.0));
                }
            }
        }
    }

    // One tagged point-data object per source layer keeps feature categories independently
    // addressable in the PCG graph. NoScatter clearance data is intentionally a separate pin.
    for (TPair<FName, TArray<FPCGPoint>>& Pair : FeaturePoints)
    {
        UPCGPointData* Data = NewObject<UPCGPointData>(this);
        Data->SetPoints(Pair.Value);
        TArray<FString> Tags{TEXT("BridgePoint"), Pair.Key.ToString()};
        UPCGDataFunctionLibrary::AddToCollection(Collection, Data, TEXT("WorldFeatures"), Tags);
    }

    for (TPair<FName, TArray<FPCGPoint>>& Pair : ClearancePoints)
    {
        UPCGPointData* Data = NewObject<UPCGPointData>(this);
        Data->SetPoints(Pair.Value);
        TArray<FString> Tags{TEXT("BridgePoint"), Pair.Key.ToString(), TEXT("NoScatter")};
        UPCGDataFunctionLibrary::AddToCollection(Collection, Data, TEXT("ClearanceZones"), Tags);
    }

    Collection.ComputeCrcs(false);
    return Collection;
}