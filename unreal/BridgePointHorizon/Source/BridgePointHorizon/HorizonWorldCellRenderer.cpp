#include "HorizonWorldCellRenderer.h"

#include "Algo/Reverse.h"

#include "Components/SceneComponent.h"
#include "Dom/JsonObject.h"
#include "ProceduralMeshComponent.h"
#include "Serialization/JsonReader.h"
#include "Serialization/JsonSerializer.h"

namespace HorizonCellRender
{
    static bool ReadNumber(const TSharedPtr<FJsonObject>& Object, const TCHAR* Field, double& Out)
    {
        return Object.IsValid() && Object->TryGetNumberField(Field, Out);
    }

    static float SignedArea(const TArray<FVector2D>& Polygon)
    {
        double Area = 0.0;
        for (int32 Index = 0; Index < Polygon.Num(); ++Index)
        {
            const FVector2D& A = Polygon[Index];
            const FVector2D& B = Polygon[(Index + 1) % Polygon.Num()];
            Area += static_cast<double>(A.X) * B.Y - static_cast<double>(B.X) * A.Y;
        }
        return static_cast<float>(Area * 0.5);
    }

    static float Cross2D(const FVector2D& A, const FVector2D& B, const FVector2D& C)
    {
        const FVector2D AB = B - A;
        const FVector2D AC = C - A;
        return AB.X * AC.Y - AB.Y * AC.X;
    }

    static bool PointInTriangle(
        const FVector2D& P,
        const FVector2D& A,
        const FVector2D& B,
        const FVector2D& C)
    {
        const float C1 = Cross2D(A, B, P);
        const float C2 = Cross2D(B, C, P);
        const float C3 = Cross2D(C, A, P);

        const bool bHasNegative = C1 < -KINDA_SMALL_NUMBER || C2 < -KINDA_SMALL_NUMBER || C3 < -KINDA_SMALL_NUMBER;
        const bool bHasPositive = C1 > KINDA_SMALL_NUMBER || C2 > KINDA_SMALL_NUMBER || C3 > KINDA_SMALL_NUMBER;
        return !(bHasNegative && bHasPositive);
    }

    static TArray<int32> TriangulateSimplePolygon(TArray<FVector2D> Polygon)
    {
        TArray<int32> Result;
        if (Polygon.Num() < 3)
        {
            return Result;
        }

        if (SignedArea(Polygon) < 0.0f)
        {
            Algo::Reverse(Polygon);
        }

        TArray<int32> Remaining;
        Remaining.Reserve(Polygon.Num());
        for (int32 Index = 0; Index < Polygon.Num(); ++Index)
        {
            Remaining.Add(Index);
        }

        int32 Guard = 0;
        while (Remaining.Num() > 3 && Guard++ < 4096)
        {
            bool bCutEar = false;

            for (int32 LocalIndex = 0; LocalIndex < Remaining.Num(); ++LocalIndex)
            {
                const int32 Prev = Remaining[(LocalIndex - 1 + Remaining.Num()) % Remaining.Num()];
                const int32 Curr = Remaining[LocalIndex];
                const int32 Next = Remaining[(LocalIndex + 1) % Remaining.Num()];

                const FVector2D& A = Polygon[Prev];
                const FVector2D& B = Polygon[Curr];
                const FVector2D& C = Polygon[Next];

                if (Cross2D(A, B, C) <= KINDA_SMALL_NUMBER)
                {
                    continue;
                }

                bool bContainsPoint = false;
                for (int32 Other : Remaining)
                {
                    if (Other == Prev || Other == Curr || Other == Next)
                    {
                        continue;
                    }

                    if (PointInTriangle(Polygon[Other], A, B, C))
                    {
                        bContainsPoint = true;
                        break;
                    }
                }

                if (bContainsPoint)
                {
                    continue;
                }

                Result.Add(Prev);
                Result.Add(Curr);
                Result.Add(Next);
                Remaining.RemoveAt(LocalIndex);
                bCutEar = true;
                break;
            }

            if (!bCutEar)
            {
                break;
            }
        }

        if (Remaining.Num() == 3)
        {
            Result.Append(Remaining);
        }

        // Conservative fallback for malformed or unusual source rings.
        if (Result.IsEmpty() && Polygon.Num() >= 3)
        {
            for (int32 Index = 1; Index < Polygon.Num() - 1; ++Index)
            {
                Result.Add(0);
                Result.Add(Index);
                Result.Add(Index + 1);
            }
        }

        return Result;
    }

    static void ComputeNormals(
        const TArray<FVector>& Vertices,
        const TArray<int32>& Triangles,
        TArray<FVector>& OutNormals)
    {
        OutNormals.Init(FVector::ZeroVector, Vertices.Num());

        for (int32 Tri = 0; Tri + 2 < Triangles.Num(); Tri += 3)
        {
            const int32 IA = Triangles[Tri];
            const int32 IB = Triangles[Tri + 1];
            const int32 IC = Triangles[Tri + 2];

            if (!Vertices.IsValidIndex(IA) || !Vertices.IsValidIndex(IB) || !Vertices.IsValidIndex(IC))
            {
                continue;
            }

            const FVector Normal = FVector::CrossProduct(
                Vertices[IB] - Vertices[IA],
                Vertices[IC] - Vertices[IA]).GetSafeNormal();

            OutNormals[IA] += Normal;
            OutNormals[IB] += Normal;
            OutNormals[IC] += Normal;
        }

        for (FVector& Normal : OutNormals)
        {
            Normal.Normalize();
            if (Normal.IsNearlyZero())
            {
                Normal = FVector::UpVector;
            }
        }
    }

    static bool JsonPoint(const TSharedPtr<FJsonValue>& Value, FVector2D& OutLonLat)
    {
        if (!Value.IsValid() || Value->Type != EJson::Array)
        {
            return false;
        }

        const TArray<TSharedPtr<FJsonValue>>& Pair = Value->AsArray();
        if (Pair.Num() < 2)
        {
            return false;
        }

        OutLonLat.X = Pair[0]->AsNumber();
        OutLonLat.Y = Pair[1]->AsNumber();
        return true;
    }

    static bool ExtractExteriorRing(
        const TSharedPtr<FJsonObject>& Geometry,
        TArray<FVector2D>& OutRing)
    {
        OutRing.Reset();
        if (!Geometry.IsValid())
        {
            return false;
        }

        FString Type;
        if (!Geometry->TryGetStringField(TEXT("type"), Type))
        {
            return false;
        }

        const TArray<TSharedPtr<FJsonValue>>* Coordinates = nullptr;
        if (!Geometry->TryGetArrayField(TEXT("coordinates"), Coordinates) || !Coordinates || Coordinates->IsEmpty())
        {
            return false;
        }

        const TArray<TSharedPtr<FJsonValue>>* RingValues = nullptr;

        if (Type.Equals(TEXT("Polygon"), ESearchCase::IgnoreCase))
        {
            if ((*Coordinates)[0]->Type != EJson::Array)
            {
                return false;
            }
            RingValues = &(*Coordinates)[0]->AsArray();
        }
        else if (Type.Equals(TEXT("MultiPolygon"), ESearchCase::IgnoreCase))
        {
            if ((*Coordinates)[0]->Type != EJson::Array)
            {
                return false;
            }

            const TArray<TSharedPtr<FJsonValue>>& FirstPolygon = (*Coordinates)[0]->AsArray();
            if (FirstPolygon.IsEmpty() || FirstPolygon[0]->Type != EJson::Array)
            {
                return false;
            }
            RingValues = &FirstPolygon[0]->AsArray();
        }
        else
        {
            return false;
        }

        for (const TSharedPtr<FJsonValue>& Value : *RingValues)
        {
            FVector2D Point;
            if (JsonPoint(Value, Point))
            {
                OutRing.Add(Point);
            }
        }

        if (OutRing.Num() >= 2 && OutRing[0].Equals(OutRing.Last(), KINDA_SMALL_NUMBER))
        {
            OutRing.Pop();
        }

        return OutRing.Num() >= 3;
    }

    static void ExtractLineStrings(
        const TSharedPtr<FJsonObject>& Geometry,
        TArray<TArray<FVector2D>>& OutPaths)
    {
        OutPaths.Reset();
        if (!Geometry.IsValid())
        {
            return;
        }

        FString Type;
        const TArray<TSharedPtr<FJsonValue>>* Coordinates = nullptr;
        if (!Geometry->TryGetStringField(TEXT("type"), Type) ||
            !Geometry->TryGetArrayField(TEXT("coordinates"), Coordinates) ||
            !Coordinates)
        {
            return;
        }

        if (Type.Equals(TEXT("LineString"), ESearchCase::IgnoreCase))
        {
            TArray<FVector2D> Path;
            for (const TSharedPtr<FJsonValue>& Value : *Coordinates)
            {
                FVector2D Point;
                if (JsonPoint(Value, Point))
                {
                    Path.Add(Point);
                }
            }
            if (Path.Num() >= 2)
            {
                OutPaths.Add(MoveTemp(Path));
            }
        }
        else if (Type.Equals(TEXT("MultiLineString"), ESearchCase::IgnoreCase))
        {
            for (const TSharedPtr<FJsonValue>& LineValue : *Coordinates)
            {
                if (!LineValue.IsValid() || LineValue->Type != EJson::Array)
                {
                    continue;
                }

                TArray<FVector2D> Path;
                for (const TSharedPtr<FJsonValue>& Value : LineValue->AsArray())
                {
                    FVector2D Point;
                    if (JsonPoint(Value, Point))
                    {
                        Path.Add(Point);
                    }
                }

                if (Path.Num() >= 2)
                {
                    OutPaths.Add(MoveTemp(Path));
                }
            }
        }
    }
}

AHorizonWorldCellRenderer::AHorizonWorldCellRenderer()
{
    PrimaryActorTick.bCanEverTick = false;

    SceneRoot = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
    SetRootComponent(SceneRoot);

    TerrainMesh = CreateDefaultSubobject<UProceduralMeshComponent>(TEXT("TerrainMesh"));
    TerrainMesh->SetupAttachment(SceneRoot);
    TerrainMesh->bUseComplexAsSimpleCollision = true;
    TerrainMesh->SetCollisionEnabled(ECollisionEnabled::QueryAndPhysics);
    TerrainMesh->SetCollisionResponseToAllChannels(ECR_Block);

    RoadMesh = CreateDefaultSubobject<UProceduralMeshComponent>(TEXT("RoadMesh"));
    RoadMesh->SetupAttachment(SceneRoot);
    RoadMesh->SetCollisionEnabled(ECollisionEnabled::NoCollision);

    BuildingMesh = CreateDefaultSubobject<UProceduralMeshComponent>(TEXT("BuildingMesh"));
    BuildingMesh->SetupAttachment(SceneRoot);
    BuildingMesh->bUseComplexAsSimpleCollision = true;

    FarBuildingMesh = CreateDefaultSubobject<UProceduralMeshComponent>(TEXT("FarBuildingMesh"));
    FarBuildingMesh->SetupAttachment(SceneRoot);
    FarBuildingMesh->SetCollisionEnabled(ECollisionEnabled::NoCollision);

    WaterMesh = CreateDefaultSubobject<UProceduralMeshComponent>(TEXT("WaterMesh"));
    WaterMesh->SetupAttachment(SceneRoot);
    WaterMesh->SetCollisionEnabled(ECollisionEnabled::NoCollision);
}

void AHorizonWorldCellRenderer::ClearCell()
{
    TerrainMesh->ClearAllMeshSections();
    RoadMesh->ClearAllMeshSections();
    BuildingMesh->ClearAllMeshSections();
    FarBuildingMesh->ClearAllMeshSections();
    WaterMesh->ClearAllMeshSections();

    TerrainHeightsMeters.Reset();
    TerrainWidth = 0;
    TerrainHeight = 0;
    BaseElevationMeters = 0.0;
    RenderedBuildingCount = 0;
    RenderedBuildingPartCount = 0;
    RenderedRoadSegmentCount = 0;
    RenderedWaterFeatureCount = 0;
    RenderedProfiledRoofCount = 0;
}

FIntPoint AHorizonWorldCellRenderer::ResolveBuildingLodCounts(
    int32 AvailableBuildings,
    int32 VisualLimit,
    int32 CollisionLimit)
{
    const int32 VisibleCount = FMath::Min(
        FMath::Max(0, AvailableBuildings),
        FMath::Max(0, VisualLimit));
    const int32 CollidableCount = FMath::Min(
        VisibleCount,
        FMath::Max(0, CollisionLimit));
    return FIntPoint(CollidableCount, VisibleCount - CollidableCount);
}

double AHorizonWorldCellRenderer::ResolveSourceRoofHeightMeters(
    const FString& RoofShape,
    double RequestedRoofHeightMeters,
    double TotalBuildingHeightMeters)
{
    FString NormalizedShape = RoofShape;
    NormalizedShape.TrimStartAndEndInline();
    NormalizedShape.ToLowerInline();

    const bool bApexProfile =
        NormalizedShape == TEXT("pyramidal") ||
        NormalizedShape == TEXT("pyramid") ||
        NormalizedShape == TEXT("conical") ||
        NormalizedShape == TEXT("cone");

    if (!bApexProfile ||
        !FMath::IsFinite(RequestedRoofHeightMeters) ||
        !FMath::IsFinite(TotalBuildingHeightMeters) ||
        RequestedRoofHeightMeters <= 0.05 ||
        TotalBuildingHeightMeters <= 0.5)
    {
        return 0.0;
    }

    const double MaximumRoofHeight = FMath::Min(12.0, TotalBuildingHeightMeters * 0.45);
    return FMath::Clamp(RequestedRoofHeightMeters, 0.0, MaximumRoofHeight);
}

bool AHorizonWorldCellRenderer::RenderCellJson(const FString& CellJson)
{
    ClearCell();

    TSharedPtr<FJsonObject> Root;
    const TSharedRef<TJsonReader<>> Reader = TJsonReaderFactory<>::Create(CellJson);
    if (!FJsonSerializer::Deserialize(Reader, Root) || !Root.IsValid())
    {
        return false;
    }

    bool bComplete = false;
    Root->TryGetBoolField(TEXT("complete"), bComplete);
    if (!bComplete || !ParseCellHeader(Root))
    {
        return false;
    }

    BuildTerrain(Root);
    BuildTransport(Root);
    BuildWater(Root);
    BuildBuildings(Root);
    return true;
}

bool AHorizonWorldCellRenderer::ParseCellHeader(const TSharedPtr<FJsonObject>& Root)
{
    if (!Root->HasTypedField<EJson::Object>(TEXT("center")) ||
        !Root->HasTypedField<EJson::Object>(TEXT("bbox")))
    {
        return false;
    }

    const TSharedPtr<FJsonObject> Center = Root->GetObjectField(TEXT("center"));
    const TSharedPtr<FJsonObject> Bounds = Root->GetObjectField(TEXT("bbox"));

    return
        HorizonCellRender::ReadNumber(Center, TEXT("lat"), CenterLatitude) &&
        HorizonCellRender::ReadNumber(Center, TEXT("lon"), CenterLongitude) &&
        HorizonCellRender::ReadNumber(Bounds, TEXT("west"), West) &&
        HorizonCellRender::ReadNumber(Bounds, TEXT("south"), South) &&
        HorizonCellRender::ReadNumber(Bounds, TEXT("east"), East) &&
        HorizonCellRender::ReadNumber(Bounds, TEXT("north"), North);
}

FVector AHorizonWorldCellRenderer::ProjectCoordinate(
    double Longitude,
    double Latitude,
    double HeightMeters) const
{
    const double CosLatitude = FMath::Max(0.12, FMath::Cos(FMath::DegreesToRadians(CenterLatitude)));
    const double MetersPerLongitudeDegree = 111320.0 * CosLatitude;
    const double MetersPerLatitudeDegree = 110540.0;

    const double Xcm = (Longitude - CenterLongitude) * MetersPerLongitudeDegree * 100.0;
    const double Ycm = (Latitude - CenterLatitude) * MetersPerLatitudeDegree * 100.0;
    const double Zcm = (HeightMeters - BaseElevationMeters) * 100.0 * VerticalExaggeration;
    return FVector(Xcm, Ycm, Zcm);
}

double AHorizonWorldCellRenderer::SampleTerrainMeters(double Longitude, double Latitude) const
{
    if (TerrainWidth < 2 || TerrainHeight < 2 || TerrainHeightsMeters.Num() != TerrainWidth * TerrainHeight)
    {
        return BaseElevationMeters;
    }

    const double U = FMath::Clamp((Longitude - West) / FMath::Max(1e-12, East - West), 0.0, 1.0);
    const double VNorthToSouth = FMath::Clamp((North - Latitude) / FMath::Max(1e-12, North - South), 0.0, 1.0);

    const double X = U * (TerrainWidth - 1);
    const double Y = VNorthToSouth * (TerrainHeight - 1);

    const int32 X0 = FMath::Clamp(FMath::FloorToInt(X), 0, TerrainWidth - 1);
    const int32 Y0 = FMath::Clamp(FMath::FloorToInt(Y), 0, TerrainHeight - 1);
    const int32 X1 = FMath::Min(X0 + 1, TerrainWidth - 1);
    const int32 Y1 = FMath::Min(Y0 + 1, TerrainHeight - 1);

    const double Tx = X - X0;
    const double Ty = Y - Y0;

    const auto H = [this](int32 PX, int32 PY)
    {
        return TerrainHeightsMeters[PY * TerrainWidth + PX];
    };

    const double A = FMath::Lerp(H(X0, Y0), H(X1, Y0), Tx);
    const double B = FMath::Lerp(H(X0, Y1), H(X1, Y1), Tx);
    return FMath::Lerp(A, B, Ty);
}

bool AHorizonWorldCellRenderer::BuildTerrain(const TSharedPtr<FJsonObject>& Root)
{
    if (!Root->HasTypedField<EJson::Object>(TEXT("terrain")))
    {
        BaseElevationMeters = 0.0;
        return false;
    }

    const TSharedPtr<FJsonObject> Terrain = Root->GetObjectField(TEXT("terrain"));
    double WidthValue = 0.0;
    double HeightValue = 0.0;
    if (!Terrain->TryGetNumberField(TEXT("width"), WidthValue) ||
        !Terrain->TryGetNumberField(TEXT("height"), HeightValue))
    {
        return false;
    }

    TerrainWidth = FMath::Max(0, FMath::RoundToInt(WidthValue));
    TerrainHeight = FMath::Max(0, FMath::RoundToInt(HeightValue));

    const TArray<TSharedPtr<FJsonValue>>* Heights = nullptr;
    if (TerrainWidth < 2 ||
        TerrainHeight < 2 ||
        !Terrain->TryGetArrayField(TEXT("heights_m"), Heights) ||
        !Heights ||
        Heights->Num() != TerrainWidth * TerrainHeight)
    {
        TerrainWidth = 0;
        TerrainHeight = 0;
        return false;
    }

    TerrainHeightsMeters.Reserve(Heights->Num());
    for (const TSharedPtr<FJsonValue>& Height : *Heights)
    {
        TerrainHeightsMeters.Add(Height.IsValid() ? Height->AsNumber() : 0.0);
    }

    BaseElevationMeters = TerrainHeightsMeters[(TerrainHeight / 2) * TerrainWidth + (TerrainWidth / 2)];

    TArray<FVector> Vertices;
    TArray<int32> Triangles;
    TArray<FVector2D> UV0;
    TArray<FLinearColor> Colors;
    TArray<FProcMeshTangent> Tangents;

    Vertices.Reserve(TerrainWidth * TerrainHeight);
    UV0.Reserve(TerrainWidth * TerrainHeight);

    for (int32 Y = 0; Y < TerrainHeight; ++Y)
    {
        const double V = TerrainHeight <= 1 ? 0.0 : static_cast<double>(Y) / (TerrainHeight - 1);
        const double Latitude = FMath::Lerp(North, South, V);

        for (int32 X = 0; X < TerrainWidth; ++X)
        {
            const double U = TerrainWidth <= 1 ? 0.0 : static_cast<double>(X) / (TerrainWidth - 1);
            const double Longitude = FMath::Lerp(West, East, U);
            const double HeightMeters = TerrainHeightsMeters[Y * TerrainWidth + X];

            Vertices.Add(ProjectCoordinate(Longitude, Latitude, HeightMeters));
            UV0.Add(FVector2D(U * 8.0, V * 8.0));
        }
    }

    for (int32 Y = 0; Y < TerrainHeight - 1; ++Y)
    {
        for (int32 X = 0; X < TerrainWidth - 1; ++X)
        {
            const int32 A = Y * TerrainWidth + X;
            const int32 B = A + 1;
            const int32 C = (Y + 1) * TerrainWidth + X;
            const int32 D = C + 1;

            Triangles.Add(A);
            Triangles.Add(C);
            Triangles.Add(B);

            Triangles.Add(B);
            Triangles.Add(C);
            Triangles.Add(D);
        }
    }

    TArray<FVector> Normals;
    HorizonCellRender::ComputeNormals(Vertices, Triangles, Normals);

    TerrainMesh->CreateMeshSection_LinearColor(
        0,
        Vertices,
        Triangles,
        Normals,
        UV0,
        Colors,
        Tangents,
        bCreateTerrainCollision);
    if (TerrainMaterial)
    {
        TerrainMesh->SetMaterial(0, TerrainMaterial);
    }

    return true;
}

void AHorizonWorldCellRenderer::BuildTransport(const TSharedPtr<FJsonObject>& Root)
{
    const TArray<TSharedPtr<FJsonValue>>* Transport = nullptr;
    if (!Root->TryGetArrayField(TEXT("transport"), Transport) || !Transport)
    {
        return;
    }

    TArray<FVector> Vertices;
    TArray<int32> Triangles;
    TArray<FVector2D> UV0;
    TArray<FLinearColor> Colors;
    TArray<FProcMeshTangent> Tangents;

    for (const TSharedPtr<FJsonValue>& FeatureValue : *Transport)
    {
        const TSharedPtr<FJsonObject> Feature = FeatureValue.IsValid() ? FeatureValue->AsObject() : nullptr;
        if (!Feature.IsValid() || !Feature->HasTypedField<EJson::Object>(TEXT("geometry")))
        {
            continue;
        }

        FString Kind;
        Feature->TryGetStringField(TEXT("kind"), Kind);

        float WidthCm = 450.0f;
        if (Kind == TEXT("ROAD_PRIMARY")) WidthCm = 900.0f;
        else if (Kind == TEXT("ROAD_SECONDARY")) WidthCm = 650.0f;
        else if (Kind == TEXT("ROAD_LOCAL")) WidthCm = 430.0f;
        else if (Kind == TEXT("RAIL")) WidthCm = 320.0f;

        TArray<TArray<FVector2D>> Paths;
        HorizonCellRender::ExtractLineStrings(Feature->GetObjectField(TEXT("geometry")), Paths);

        for (const TArray<FVector2D>& Path : Paths)
        {
            for (int32 Index = 0; Index < Path.Num() - 1; ++Index)
            {
                const FVector2D& AGeo = Path[Index];
                const FVector2D& BGeo = Path[Index + 1];

                FVector A = ProjectCoordinate(AGeo.X, AGeo.Y, SampleTerrainMeters(AGeo.X, AGeo.Y));
                FVector B = ProjectCoordinate(BGeo.X, BGeo.Y, SampleTerrainMeters(BGeo.X, BGeo.Y));
                A.Z += 6.0f;
                B.Z += 6.0f;

                FVector Direction = B - A;
                Direction.Z = 0.0f;
                if (!Direction.Normalize())
                {
                    continue;
                }

                const FVector Right(-Direction.Y, Direction.X, 0.0f);
                const FVector Offset = Right * (WidthCm * 0.5f);

                const int32 Base = Vertices.Num();
                Vertices.Add(A - Offset);
                Vertices.Add(A + Offset);
                Vertices.Add(B - Offset);
                Vertices.Add(B + Offset);

                UV0.Add(FVector2D(0.0f, 0.0f));
                UV0.Add(FVector2D(1.0f, 0.0f));
                UV0.Add(FVector2D(0.0f, 1.0f));
                UV0.Add(FVector2D(1.0f, 1.0f));

                Triangles.Add(Base + 0);
                Triangles.Add(Base + 2);
                Triangles.Add(Base + 1);
                Triangles.Add(Base + 1);
                Triangles.Add(Base + 2);
                Triangles.Add(Base + 3);

                ++RenderedRoadSegmentCount;
            }
        }
    }

    if (!Vertices.IsEmpty())
    {
        TArray<FVector> Normals;
        HorizonCellRender::ComputeNormals(Vertices, Triangles, Normals);

        RoadMesh->CreateMeshSection_LinearColor(
            0,
            Vertices,
            Triangles,
            Normals,
            UV0,
            Colors,
            Tangents,
            false);
        if (RoadMaterial)
        {
            RoadMesh->SetMaterial(0, RoadMaterial);
        }
    }
}


void AHorizonWorldCellRenderer::BuildWater(const TSharedPtr<FJsonObject>& Root)
{
    const TArray<TSharedPtr<FJsonValue>>* Water = nullptr;
    if (!Root->TryGetArrayField(TEXT("water"), Water) || !Water)
    {
        return;
    }

    TArray<FVector> Vertices;
    TArray<int32> Triangles;
    TArray<FVector2D> UV0;
    TArray<FLinearColor> Colors;
    TArray<FProcMeshTangent> Tangents;

    for (const TSharedPtr<FJsonValue>& FeatureValue : *Water)
    {
        const TSharedPtr<FJsonObject> Feature = FeatureValue.IsValid() ? FeatureValue->AsObject() : nullptr;
        if (!Feature.IsValid() || !Feature->HasTypedField<EJson::Object>(TEXT("geometry")))
        {
            continue;
        }

        FString Kind;
        Feature->TryGetStringField(TEXT("kind"), Kind);
        const TSharedPtr<FJsonObject> Geometry = Feature->GetObjectField(TEXT("geometry"));

        TArray<FVector2D> Ring;
        if (Kind == TEXT("WATER_AREA") && HorizonCellRender::ExtractExteriorRing(Geometry, Ring))
        {
            if (HorizonCellRender::SignedArea(Ring) < 0.0f)
            {
                Algo::Reverse(Ring);
            }
            double AverageLongitude = 0.0;
            double AverageLatitude = 0.0;
            for (const FVector2D& Point : Ring)
            {
                AverageLongitude += Point.X;
                AverageLatitude += Point.Y;
            }
            AverageLongitude /= Ring.Num();
            AverageLatitude /= Ring.Num();

            const double SurfaceMeters = SampleTerrainMeters(AverageLongitude, AverageLatitude) + 0.04;
            TArray<FVector2D> LocalPolygon;
            LocalPolygon.Reserve(Ring.Num());
            const int32 Base = Vertices.Num();

            for (const FVector2D& Point : Ring)
            {
                const FVector Position = ProjectCoordinate(Point.X, Point.Y, SurfaceMeters);
                Vertices.Add(Position);
                LocalPolygon.Add(FVector2D(Position.X, Position.Y));
                UV0.Add(FVector2D(Position.X * 0.00035f, Position.Y * 0.00035f));
            }

            const TArray<int32> PolygonTriangles = HorizonCellRender::TriangulateSimplePolygon(LocalPolygon);
            for (const int32 Index : PolygonTriangles)
            {
                Triangles.Add(Base + Index);
            }

            ++RenderedWaterFeatureCount;
            continue;
        }

        TArray<TArray<FVector2D>> Paths;
        HorizonCellRender::ExtractLineStrings(Geometry, Paths);
        for (const TArray<FVector2D>& Path : Paths)
        {
            for (int32 Index = 0; Index < Path.Num() - 1; ++Index)
            {
                const FVector2D& AGeo = Path[Index];
                const FVector2D& BGeo = Path[Index + 1];

                FVector A = ProjectCoordinate(AGeo.X, AGeo.Y, SampleTerrainMeters(AGeo.X, AGeo.Y) + 0.03);
                FVector B = ProjectCoordinate(BGeo.X, BGeo.Y, SampleTerrainMeters(BGeo.X, BGeo.Y) + 0.03);

                FVector Direction = B - A;
                Direction.Z = 0.0f;
                if (!Direction.Normalize())
                {
                    continue;
                }

                const float WidthCm = 260.0f;
                const FVector Right(-Direction.Y, Direction.X, 0.0f);
                const FVector Offset = Right * (WidthCm * 0.5f);

                const int32 Base = Vertices.Num();
                Vertices.Add(A - Offset);
                Vertices.Add(A + Offset);
                Vertices.Add(B - Offset);
                Vertices.Add(B + Offset);

                UV0.Add(FVector2D(0.0f, 0.0f));
                UV0.Add(FVector2D(1.0f, 0.0f));
                UV0.Add(FVector2D(0.0f, 1.0f));
                UV0.Add(FVector2D(1.0f, 1.0f));

                Triangles.Add(Base + 0);
                Triangles.Add(Base + 2);
                Triangles.Add(Base + 1);
                Triangles.Add(Base + 1);
                Triangles.Add(Base + 2);
                Triangles.Add(Base + 3);
            }

            ++RenderedWaterFeatureCount;
        }
    }

    if (!Vertices.IsEmpty())
    {
        TArray<FVector> Normals;
        HorizonCellRender::ComputeNormals(Vertices, Triangles, Normals);

        WaterMesh->CreateMeshSection_LinearColor(
            0,
            Vertices,
            Triangles,
            Normals,
            UV0,
            Colors,
            Tangents,
            false);
        if (WaterMaterial)
        {
            WaterMesh->SetMaterial(0, WaterMaterial);
        }
    }
}

void AHorizonWorldCellRenderer::BuildBuildings(const TSharedPtr<FJsonObject>& Root)
{
    const TArray<TSharedPtr<FJsonValue>>* Buildings = nullptr;
    const TArray<TSharedPtr<FJsonValue>>* BuildingParts = nullptr;
    Root->TryGetArrayField(TEXT("buildings"), Buildings);
    Root->TryGetArrayField(TEXT("building_parts"), BuildingParts);

    if ((!Buildings || Buildings->IsEmpty()) && (!BuildingParts || BuildingParts->IsEmpty()))
    {
        return;
    }

    TArray<FVector> BuildingVertices;
    TArray<int32> BuildingTriangles;
    TArray<FVector2D> BuildingUV0;

    TArray<FVector> FarBuildingVertices;
    TArray<int32> FarBuildingTriangles;
    TArray<FVector2D> FarBuildingUV0;

    TArray<FVector> PartVertices;
    TArray<int32> PartTriangles;
    TArray<FVector2D> PartUV0;

    auto AppendFeatures = [this](
        const TArray<TSharedPtr<FJsonValue>>* Features,
        int32 StartIndex,
        int32 Count,
        bool bBuildingPart,
        TArray<FVector>& Vertices,
        TArray<int32>& Triangles,
        TArray<FVector2D>& UV0)
    {
        if (!Features)
        {
            return;
        }

        const int32 SafeStart = FMath::Clamp(StartIndex, 0, Features->Num());
        const int32 SafeEnd = FMath::Min(
            Features->Num(),
            SafeStart + FMath::Max(0, Count));

        for (int32 FeatureIndex = SafeStart; FeatureIndex < SafeEnd; ++FeatureIndex)
        {
            const TSharedPtr<FJsonObject> Feature = (*Features)[FeatureIndex].IsValid()
                ? (*Features)[FeatureIndex]->AsObject()
                : nullptr;

            if (!Feature.IsValid() || !Feature->HasTypedField<EJson::Object>(TEXT("geometry")))
            {
                continue;
            }

            TArray<FVector2D> Ring;
            if (!HorizonCellRender::ExtractExteriorRing(Feature->GetObjectField(TEXT("geometry")), Ring))
            {
                continue;
            }

            if (HorizonCellRender::SignedArea(Ring) < 0.0f)
            {
                Algo::Reverse(Ring);
            }

            double HeightMeters = DefaultBuildingHeightMeters;
            if (!Feature->TryGetNumberField(TEXT("height_m"), HeightMeters) || HeightMeters <= 0.1)
            {
                double Floors = 0.0;
                if (Feature->TryGetNumberField(TEXT("floors"), Floors) && Floors > 0.0)
                {
                    HeightMeters = Floors * 3.1;
                }
                else
                {
                    HeightMeters = bBuildingPart ? 3.2 : DefaultBuildingHeightMeters;
                }
            }

            double MinHeightMeters = 0.0;
            Feature->TryGetNumberField(TEXT("min_height_m"), MinHeightMeters);

            FString RoofShape;
            Feature->TryGetStringField(TEXT("roof_shape"), RoofShape);
            double RequestedRoofHeightMeters = 0.0;
            Feature->TryGetNumberField(TEXT("roof_height_m"), RequestedRoofHeightMeters);
            const double ProfileRoofHeightMeters = ResolveSourceRoofHeightMeters(
                RoofShape,
                RequestedRoofHeightMeters,
                HeightMeters);

            double AverageLongitude = 0.0;
            double AverageLatitude = 0.0;
            for (const FVector2D& Point : Ring)
            {
                AverageLongitude += Point.X;
                AverageLatitude += Point.Y;
            }
            AverageLongitude /= Ring.Num();
            AverageLatitude /= Ring.Num();

            const double TerrainBaseMeters = SampleTerrainMeters(AverageLongitude, AverageLatitude);
            const double BottomMeters = TerrainBaseMeters + FMath::Max(0.0, MinHeightMeters);
            const double TopMeters = TerrainBaseMeters + FMath::Max(MinHeightMeters + 0.5, HeightMeters);
            const double WallTopMeters = FMath::Max(
                BottomMeters + 0.5,
                TopMeters - ProfileRoofHeightMeters);

            TArray<FVector2D> LocalPolygon;
            LocalPolygon.Reserve(Ring.Num());
            TArray<FVector> Bottom;
            TArray<FVector> Top;
            Bottom.Reserve(Ring.Num());
            Top.Reserve(Ring.Num());

            for (const FVector2D& Point : Ring)
            {
                const FVector BottomPoint = ProjectCoordinate(Point.X, Point.Y, BottomMeters);
                const FVector TopPoint = ProjectCoordinate(Point.X, Point.Y, WallTopMeters);
                Bottom.Add(BottomPoint);
                Top.Add(TopPoint);
                LocalPolygon.Add(FVector2D(BottomPoint.X, BottomPoint.Y));
            }

            for (int32 Index = 0; Index < Ring.Num(); ++Index)
            {
                const int32 Next = (Index + 1) % Ring.Num();
                const int32 Base = Vertices.Num();

                Vertices.Add(Bottom[Index]);
                Vertices.Add(Bottom[Next]);
                Vertices.Add(Top[Index]);
                Vertices.Add(Top[Next]);

                UV0.Add(FVector2D(0.0f, 0.0f));
                UV0.Add(FVector2D(1.0f, 0.0f));
                UV0.Add(FVector2D(0.0f, 1.0f));
                UV0.Add(FVector2D(1.0f, 1.0f));

                Triangles.Add(Base + 0);
                Triangles.Add(Base + 1);
                Triangles.Add(Base + 2);
                Triangles.Add(Base + 2);
                Triangles.Add(Base + 1);
                Triangles.Add(Base + 3);
            }

            const int32 RoofBase = Vertices.Num();
            for (const FVector& Point : Top)
            {
                Vertices.Add(Point);
                UV0.Add(FVector2D(Point.X * 0.001f, Point.Y * 0.001f));
            }

            if (ProfileRoofHeightMeters > 0.0)
            {
                const FVector Apex = ProjectCoordinate(
                    AverageLongitude,
                    AverageLatitude,
                    TopMeters);
                const int32 ApexIndex = Vertices.Add(Apex);
                UV0.Add(FVector2D(Apex.X * 0.001f, Apex.Y * 0.001f));

                for (int32 Index = 0; Index < Top.Num(); ++Index)
                {
                    const int32 Next = (Index + 1) % Top.Num();
                    Triangles.Add(RoofBase + Index);
                    Triangles.Add(RoofBase + Next);
                    Triangles.Add(ApexIndex);
                }
                ++RenderedProfiledRoofCount;
            }
            else
            {
                const TArray<int32> RoofIndices =
                    HorizonCellRender::TriangulateSimplePolygon(LocalPolygon);
                for (const int32 Index : RoofIndices)
                {
                    Triangles.Add(RoofBase + Index);
                }
            }

            if (bBuildingPart)
            {
                ++RenderedBuildingPartCount;
            }
            else
            {
                ++RenderedBuildingCount;
            }
        }
    };

    const FIntPoint BuildingLodCounts = ResolveBuildingLodCounts(
        Buildings ? Buildings->Num() : 0,
        MaxBuildingsPerCell,
        MaxCollidableBuildingsPerCell);

    AppendFeatures(
        Buildings,
        0,
        BuildingLodCounts.X,
        false,
        BuildingVertices,
        BuildingTriangles,
        BuildingUV0);

    AppendFeatures(
        Buildings,
        BuildingLodCounts.X,
        BuildingLodCounts.Y,
        false,
        FarBuildingVertices,
        FarBuildingTriangles,
        FarBuildingUV0);

    AppendFeatures(
        BuildingParts,
        0,
        MaxBuildingPartsPerCell,
        true,
        PartVertices,
        PartTriangles,
        PartUV0);

    TArray<FLinearColor> Colors;
    TArray<FProcMeshTangent> Tangents;

    if (!BuildingVertices.IsEmpty())
    {
        TArray<FVector> Normals;
        HorizonCellRender::ComputeNormals(BuildingVertices, BuildingTriangles, Normals);

        BuildingMesh->CreateMeshSection_LinearColor(
            0,
            BuildingVertices,
            BuildingTriangles,
            Normals,
            BuildingUV0,
            Colors,
            Tangents,
            bCreateBuildingCollision);
        if (BuildingMaterial)
        {
            BuildingMesh->SetMaterial(0, BuildingMaterial);
        }
    }

    if (!PartVertices.IsEmpty())
    {
        TArray<FVector> PartNormals;
        HorizonCellRender::ComputeNormals(PartVertices, PartTriangles, PartNormals);

        // Detailed Overture building parts are visual-only. Whole-building geometry
        // owns collision so rooftop equipment/parts do not explode physics cost.
        BuildingMesh->CreateMeshSection_LinearColor(
            1,
            PartVertices,
            PartTriangles,
            PartNormals,
            PartUV0,
            Colors,
            Tangents,
            false);
        if (BuildingPartMaterial)
        {
            BuildingMesh->SetMaterial(1, BuildingPartMaterial);
        }
    }

    if (!FarBuildingVertices.IsEmpty())
    {
        TArray<FVector> FarNormals;
        HorizonCellRender::ComputeNormals(
            FarBuildingVertices,
            FarBuildingTriangles,
            FarNormals);

        // Far buildings preserve real exterior footprints, heights, roofs and color,
        // but remain visual-only so city-scale density does not multiply physics cost.
        FarBuildingMesh->CreateMeshSection_LinearColor(
            0,
            FarBuildingVertices,
            FarBuildingTriangles,
            FarNormals,
            FarBuildingUV0,
            Colors,
            Tangents,
            false);
        if (BuildingMaterial)
        {
            FarBuildingMesh->SetMaterial(0, BuildingMaterial);
        }
    }
}
