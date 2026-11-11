#include "BPPCGBridgeComponent.h"
#include "BridgePointGeoReference.h"
#include "Data/PCGPointData.h"
#include "PCGPoint.h"

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

    for (const FBPGeoFeature& Feature : SourceFeatures)
    {
        if (Feature.Paths.IsEmpty()) continue;
        const FName LayerTag = FName(*Feature.SourceLayer.ToLower());
        const float ClearanceM = ClearanceForLayer(Feature.SourceLayer);
        const FVector2D Center = FeatureCentroid(Feature);
        const FVector2D Local = FBridgePointGeoReference::ToLocalMeters(Center.X, Center.Y, OriginLongitude, OriginLatitude);

        FPCGPoint Point;
        Point.Transform = FTransform(FRotator::ZeroRotator, FVector(Local.X * 100.0, Local.Y * 100.0, 0.0));
        Point.Density = 1.0f;
        Point.Seed = static_cast<int32>(GetTypeHash(Feature.SourceId) & 0x7fffffff);
        Point.SetExtents(FVector(50.0, 50.0, 50.0));
        FeaturePoints.FindOrAdd(LayerTag).Add(Point);

        if (ClearanceM <= 0.0f) continue;
        for (const TArray<FVector2D>& Path : Feature.Paths)
        {
            if (Path.Num() == 1)
            {
                const FVector2D P = FBridgePointGeoReference::ToLocalMeters(Path[0].X, Path[0].Y, OriginLongitude, OriginLatitude);
                FPCGPoint Clearance;
                Clearance.Transform = FTransform(FRotator::ZeroRotator, FVector(P.X * 100.0, P.Y * 100.0, 0.0));
                Clearance.Density = 1.0f;
                Clearance.Seed = Point.Seed;
                Clearance.SetExtents(FVector(ClearanceM * 100.0, ClearanceM * 100.0, 300.0));
                ClearancePoints.FindOrAdd(LayerTag).Add(Clearance);
                continue;
            }

            for (int32 I = 0; I + 1 < Path.Num(); ++I)
            {
                const FVector2D A = Path[I], B = Path[I + 1];
                const FVector2D ALocal = FBridgePointGeoReference::ToLocalMeters(A.X, A.Y, OriginLongitude, OriginLatitude);
                const FVector2D BLocal = FBridgePointGeoReference::ToLocalMeters(B.X, B.Y, OriginLongitude, OriginLatitude);
                const double SegmentLength = FVector2D::Distance(ALocal, BLocal);
                const int32 Samples = FMath::Clamp(FMath::CeilToInt(SegmentLength / FMath::Max(1.0f, ClearanceSampleSpacingMeters)), 1, 512);
                for (int32 Sample = 0; Sample <= Samples; ++Sample)
                {
                    const double Alpha = static_cast<double>(Sample) / Samples;
                    const FVector2D P = FMath::Lerp(ALocal, BLocal, Alpha);
                    FPCGPoint Clearance;
                    Clearance.Transform = FTransform(FRotator::ZeroRotator, FVector(P.X * 100.0, P.Y * 100.0, 0.0));
                    Clearance.Density = 1.0f;
                    Clearance.Seed = Point.Seed;
                    Clearance.SetExtents(FVector(ClearanceM * 100.0, ClearanceM * 100.0, 300.0));
                    ClearancePoints.FindOrAdd(LayerTag).Add(Clearance);
                }
            }
        }
    }

    for (TPair<FName, TArray<FPCGPoint>>& Pair : FeaturePoints)
    {
        UPCGPointData* Data = NewObject<UPCGPointData>(this);
        Data->SetPoints(Pair.Value);
        FPCGTaggedData Tagged;
        Tagged.Data = Data;
        Tagged.Pin = TEXT("WorldFeatures");
        Tagged.Tags.Add(TEXT("BridgePoint"));
        Tagged.Tags.Add(Pair.Key.ToString());
        Collection.TaggedData.Add(MoveTemp(Tagged));
    }

    for (TPair<FName, TArray<FPCGPoint>>& Pair : ClearancePoints)
    {
        UPCGPointData* Data = NewObject<UPCGPointData>(this);
        Data->SetPoints(Pair.Value);
        FPCGTaggedData Tagged;
        Tagged.Data = Data;
        Tagged.Pin = TEXT("ClearanceZones");
        Tagged.Tags.Add(TEXT("BridgePoint"));
        Tagged.Tags.Add(Pair.Key.ToString());
        Tagged.Tags.Add(TEXT("NoScatter"));
        Collection.TaggedData.Add(MoveTemp(Tagged));
    }

    Collection.ComputeCrcs(false);
    return Collection;
}