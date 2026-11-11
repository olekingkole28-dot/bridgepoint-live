#include "BPGeoTileProxyActor.h"
#include "BridgePointGeoReference.h"
#include "ProceduralMeshComponent.h"
#include "Materials/Material.h"

ABPGeoTileProxyActor::ABPGeoTileProxyActor()
{
    PrimaryActorTick.bCanEverTick = false;
    SceneRoot = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
    SetRootComponent(SceneRoot);
    TerrainMesh = CreateDefaultSubobject<UProceduralMeshComponent>(TEXT("Terrain"));
    TerrainMesh->SetupAttachment(SceneRoot);
    TerrainMesh->bUseAsyncCooking = true;
    TerrainMesh->SetCollisionEnabled(ECollisionEnabled::QueryAndPhysics);
}

void ABPGeoTileProxyActor::InitializeTile(const FBPGeoTileKey& InTile, double OriginLongitude, double OriginLatitude, const TArray<FBPGeoFeature>& InFeatures)
{
    Tile = InTile;
    WorldOriginLongitude = OriginLongitude;
    WorldOriginLatitude = OriginLatitude;
    TileCenterLonLat = FBridgePointGeoReference::CenterForTile(Tile);
    Features = InFeatures;

    const FVector2D TileInWorld = FBridgePointGeoReference::ToLocalMeters(
        TileCenterLonLat.X, TileCenterLonLat.Y, WorldOriginLongitude, WorldOriginLatitude);
    SetActorLocation(FVector(TileInWorld.X * 100.0, TileInWorld.Y * 100.0, 0.0));

    for (UProceduralMeshComponent* Component : LayerMeshes)
    {
        if (Component) Component->DestroyComponent();
    }
    LayerMeshes.Reset();
    LayerMeshTags.Reset();
    BuildVectorGeometry();
}

FVector ABPGeoTileProxyActor::ToTileLocal(const FVector2D& LonLat, double HeightMeters) const
{
    const FVector2D Local = FBridgePointGeoReference::ToLocalMeters(
        LonLat.X, LonLat.Y, TileCenterLonLat.X, TileCenterLonLat.Y);
    return FVector(Local.X * 100.0, Local.Y * 100.0, HeightMeters * 100.0 + RuntimeGeometryZOffsetCm);
}

FName ABPGeoTileProxyActor::NormalizeLayerTag(const FBPGeoFeature& Feature) const
{
    const FString S = Feature.SourceLayer.ToLower();
    const auto Property = [&Feature](const TCHAR* Key) { return Feature.Properties.FindRef(FName(Key)).ToLower(); };
    const FString Class = Property(TEXT("class"));
    const FString Subclass = Property(TEXT("subclass"));
    const FString Kind = Property(TEXT("kind"));
    const FString Detail = Property(TEXT("kind_detail"));
    const FString Railway = Property(TEXT("railway"));
    const FString Highway = Property(TEXT("highway"));
    const FString Bridge = Property(TEXT("bridge"));
    if (S.Contains(TEXT("building")) || S.Contains(TEXT("roof"))) return TEXT("buildings");
    if (S.Contains(TEXT("bridge")) || Bridge == TEXT("yes") || Subclass == TEXT("bridge")) return TEXT("bridges");
    if (S.Contains(TEXT("rail")) || Railway == TEXT("rail") || Railway == TEXT("subway") ||
        Railway == TEXT("tram") || Class == TEXT("rail") || Subclass == TEXT("rail")) return TEXT("rail");
    if (S.Contains(TEXT("street")) || S.Contains(TEXT("footway")) || S.Contains(TEXT("sidewalk")) ||
        Subclass == TEXT("footway") || Subclass == TEXT("pedestrian") || Subclass == TEXT("path") ||
        Subclass == TEXT("steps") || Subclass == TEXT("cycleway") || Highway == TEXT("footway") ||
        Highway == TEXT("pedestrian") || Detail == TEXT("sidewalk")) return TEXT("sidewalks");
    if (S.Contains(TEXT("transportation")) || S.Contains(TEXT("road")) || !Highway.IsEmpty() ||
        Class == TEXT("road") || Class == TEXT("street") || Kind == TEXT("major_road") || Kind == TEXT("minor_road"))
        return TEXT("roads");
    if (S.Contains(TEXT("water")) || S.Contains(TEXT("river")) || S.Contains(TEXT("lake"))) return TEXT("water");
    if (S.Contains(TEXT("park")) || S.Contains(TEXT("landcover")) || S.Contains(TEXT("landuse"))) return TEXT("vegetation");
    return FName(*S);
}

UProceduralMeshComponent* ABPGeoTileProxyActor::FindOrCreateLayerMesh(FName LayerTag)
{
    for (int32 I = 0; I < LayerMeshTags.Num(); ++I)
        if (LayerMeshTags[I] == LayerTag) return LayerMeshes[I];

    UProceduralMeshComponent* Mesh = NewObject<UProceduralMeshComponent>(this, MakeUniqueObjectName(this, UProceduralMeshComponent::StaticClass(), LayerTag));
    Mesh->SetupAttachment(SceneRoot);
    Mesh->bUseAsyncCooking = true;
    Mesh->SetCollisionEnabled(ECollisionEnabled::QueryAndPhysics);
    Mesh->SetCollisionObjectType(ECC_WorldStatic);
    Mesh->SetCollisionResponseToAllChannels(ECR_Block);
    Mesh->RegisterComponent();
    Mesh->SetMaterial(0, UMaterial::GetDefaultMaterial(MD_Surface));
    LayerMeshes.Add(Mesh);
    LayerMeshTags.Add(LayerTag);
    return Mesh;
}

void ABPGeoTileProxyActor::AddQuad(UProceduralMeshComponent* Mesh, TArray<FVector>& Vertices, TArray<int32>& Triangles,
                                  TArray<FVector2D>& UVs, const FVector& A, const FVector& B, const FVector& C, const FVector& D)
{
    const int32 Base = Vertices.Num();
    Vertices.Add(A); Vertices.Add(B); Vertices.Add(C); Vertices.Add(D);
    UVs.Add(FVector2D(0,0)); UVs.Add(FVector2D(1,0)); UVs.Add(FVector2D(1,1)); UVs.Add(FVector2D(0,1));
    Triangles.Append({Base, Base+1, Base+2, Base, Base+2, Base+3});
}

void ABPGeoTileProxyActor::BuildVectorGeometry()
{
    TMap<FName, TArray<FVector>> VerticesByLayer;
    TMap<FName, TArray<int32>> TrianglesByLayer;
    TMap<FName, TArray<FVector2D>> UVsByLayer;

    for (const FBPGeoFeature& Feature : Features)
    {
        const FName Tag = NormalizeLayerTag(Feature);
        if (Tag.IsNone()) continue;
        TArray<FVector>& V = VerticesByLayer.FindOrAdd(Tag);
        TArray<int32>& T = TrianglesByLayer.FindOrAdd(Tag);
        TArray<FVector2D>& UV = UVsByLayer.FindOrAdd(Tag);
        const float HeightM = Feature.HeightMeters > 0.0f ? Feature.HeightMeters : 0.0f;
        const bool bBuilding = Tag == TEXT("buildings");

        for (const TArray<FVector2D>& Path : Feature.Paths)
        {
            if (Path.Num() < 2) continue;
            if (Feature.GeometryType == EBPGeometryType::Point)
            {
                const FVector P = ToTileLocal(Path[0]);
                const float R = 65.0f;
                AddQuad(nullptr, V, T, UV, P + FVector(-R,0,0), P + FVector(R,0,0), P + FVector(R,0,130), P + FVector(-R,0,130));
                continue;
            }

            const int32 EdgeCount = Feature.GeometryType == EBPGeometryType::Polygon ? Path.Num() - 1 : Path.Num() - 1;
            for (int32 I = 0; I < EdgeCount; ++I)
            {
                const FVector A = ToTileLocal(Path[I], HeightM);
                const FVector B = ToTileLocal(Path[I + 1], HeightM);
                FVector Direction = (B - A).GetSafeNormal2D();
                if (Direction.IsNearlyZero()) continue;
                const FVector Side(-Direction.Y, Direction.X, 0.0);
                const float HalfWidth = (Feature.WidthMeters > 0.0f ? Feature.WidthMeters : DefaultRoadWidthMeters) * 50.0f;

                if (Feature.GeometryType == EBPGeometryType::LineString || !bBuilding)
                {
                    AddQuad(nullptr, V, T, UV,
                        A - Side * HalfWidth, A + Side * HalfWidth,
                        B + Side * HalfWidth, B - Side * HalfWidth);
                }
                else if (HeightM > 0.0f)
                {
                    const FVector A0 = ToTileLocal(Path[I], 0.0);
                    const FVector B0 = ToTileLocal(Path[I + 1], 0.0);
                    AddQuad(nullptr, V, T, UV, A0, B0, B, A);
                }
                else
                {
                    AddQuad(nullptr, V, T, UV,
                        A - Side * 20.0, A + Side * 20.0,
                        B + Side * 20.0, B - Side * 20.0);
                }
            }
        }
    }

    for (const TPair<FName, TArray<FVector>>& Pair : VerticesByLayer)
    {
        UProceduralMeshComponent* Mesh = FindOrCreateLayerMesh(Pair.Key);
        const TArray<int32>& Triangles = TrianglesByLayer.FindChecked(Pair.Key);
        const TArray<FVector2D>& UVs = UVsByLayer.FindChecked(Pair.Key);
        TArray<FVector> Normals;
        TArray<FLinearColor> Colors;
        TArray<FProcMeshTangent> Tangents;
        Mesh->CreateMeshSection_LinearColor(0, Pair.Value, Triangles, Normals, UVs, Colors, Tangents, true);
        Mesh->SetMaterial(0, UMaterial::GetDefaultMaterial(MD_Surface));
    }
}

void ABPGeoTileProxyActor::SetTerrainGrid(const TArray<float>& HeightsMeters, int32 Width, int32 Height)
{
    if (Width < 2 || Height < 2 || HeightsMeters.Num() != Width * Height) return;
    TArray<FVector> Vertices;
    TArray<int32> Triangles;
    TArray<FVector2D> UVs;
    TArray<FVector> Normals;
    TArray<FLinearColor> Colors;
    TArray<FProcMeshTangent> Tangents;
    Vertices.Reserve(Width * Height);
    UVs.Reserve(Width * Height);

    const FBPGeoBounds B = FBridgePointGeoReference::BoundsForTile(Tile);
    for (int32 Y = 0; Y < Height; ++Y)
    {
        const double V = static_cast<double>(Y) / (Height - 1);
        const double Lat = FMath::Lerp(B.North, B.South, V);
        for (int32 X = 0; X < Width; ++X)
        {
            const double U = static_cast<double>(X) / (Width - 1);
            const double Lon = FMath::Lerp(B.West, B.East, U);
            Vertices.Add(ToTileLocal(FVector2D(Lon, Lat), HeightsMeters[Y * Width + X]));
            UVs.Add(FVector2D(U, V));
        }
    }
    for (int32 Y = 0; Y < Height - 1; ++Y)
    {
        for (int32 X = 0; X < Width - 1; ++X)
        {
            const int32 A = Y * Width + X, B0 = A + 1, C = A + Width, D = C + 1;
            Triangles.Append({A, C, B0, B0, C, D});
        }
    }
    TerrainMesh->ClearAllMeshSections();
    TerrainMesh->CreateMeshSection_LinearColor(0, Vertices, Triangles, Normals, UVs, Colors, Tangents, true);
    TerrainMesh->SetMaterial(0, UMaterial::GetDefaultMaterial(MD_Surface));
}

void ABPGeoTileProxyActor::SetLayerEnabled(FName LayerTag, bool bEnabled)
{
    for (int32 I = 0; I < LayerMeshTags.Num(); ++I)
    {
        if (LayerMeshTags[I] == LayerTag && LayerMeshes.IsValidIndex(I) && LayerMeshes[I])
            LayerMeshes[I]->SetVisibility(bEnabled, true);
    }
}

void ABPGeoTileProxyActor::NotifyTileImpact(const FHitResult& Hit)
{
    OnTileImpact.Broadcast(this, Hit);
}