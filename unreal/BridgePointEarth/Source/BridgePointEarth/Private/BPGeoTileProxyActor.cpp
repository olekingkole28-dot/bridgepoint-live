#include "BPGeoTileProxyActor.h"
#include "BridgePointGeoReference.h"
#include "ProceduralMeshComponent.h"
#include "Components/SceneComponent.h"

#include "Materials/Material.h"

namespace
{
    static double BPOrient2D(const FVector& A,const FVector& B,const FVector& C)
    {
        return (B.X-A.X)*(C.Y-A.Y)-(B.Y-A.Y)*(C.X-A.X);
    }

    static bool BPPointInTriangle(const FVector& P,const FVector& A,const FVector& B,const FVector& C,double Orientation)
    {
        const double Epsilon=1.0e-6;
        const double AB=BPOrient2D(A,B,P)*Orientation;
        const double BC=BPOrient2D(B,C,P)*Orientation;
        const double CA=BPOrient2D(C,A,P)*Orientation;
        return AB>=-Epsilon && BC>=-Epsilon && CA>=-Epsilon;
    }

    // Ear-clips a simple, non-self-intersecting polygon ring. Interior MVT rings
    // are deliberately not triangulated as roofs here, avoiding accidental caps
    // across courtyards; those can be handled by a full polygon-with-holes solver.
    static bool BPTriangulateRoof(const TArray<FVector>& Vertices,TArray<int32>& OutTriangles)
    {
        OutTriangles.Reset();
        if (Vertices.Num()<3) return false;
        double Area=0.0;
        for (int32 I=0;I<Vertices.Num();++I)
        {
            const FVector& A=Vertices[I];
            const FVector& B=Vertices[(I+1)%Vertices.Num()];
            Area+=A.X*B.Y-B.X*A.Y;
        }
        const double Orientation=Area>=0.0?1.0:-1.0;
        TArray<int32> Remaining;
        Remaining.Reserve(Vertices.Num());
        for(int32 I=0;I<Vertices.Num();++I)Remaining.Add(I);

        int32 Guard=0;
        while(Remaining.Num()>3 && Guard++<Vertices.Num()*Vertices.Num())
        {
            bool bClipped=false;
            for(int32 I=0;I<Remaining.Num();++I)
            {
                const int32 Prev=Remaining[(I+Remaining.Num()-1)%Remaining.Num()];
                const int32 Curr=Remaining[I];
                const int32 Next=Remaining[(I+1)%Remaining.Num()];
                const double Turn=BPOrient2D(Vertices[Prev],Vertices[Curr],Vertices[Next])*Orientation;
                if(Turn<=1.0e-7)continue;

                bool bContainsVertex=false;
                for(const int32 Candidate:Remaining)
                {
                    if(Candidate==Prev||Candidate==Curr||Candidate==Next)continue;
                    if(BPPointInTriangle(Vertices[Candidate],Vertices[Prev],Vertices[Curr],Vertices[Next],Orientation))
                    {
                        bContainsVertex=true;break;
                    }
                }
                if(bContainsVertex)continue;

                if(Orientation>0.0)OutTriangles.Append({Prev,Curr,Next});
                else OutTriangles.Append({Prev,Next,Curr});
                Remaining.RemoveAt(I);
                bClipped=true;
                break;
            }
            if(!bClipped){OutTriangles.Reset();return false;}
        }
        if(Remaining.Num()==3)
        {
            if(Orientation>0.0)OutTriangles.Append({Remaining[0],Remaining[1],Remaining[2]});
            else OutTriangles.Append({Remaining[0],Remaining[2],Remaining[1]});
        }
        return !OutTriangles.IsEmpty();
    }
}

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

void ABPGeoTileProxyActor::InitializeTile(const FBPGeoTileKey& InTile, double OriginLongitude, double OriginLatitude, double OriginElevationMeters, const TArray<FBPGeoFeature>& InFeatures)
{
    Tile = InTile;
    WorldOriginLongitude = OriginLongitude;
    WorldOriginLatitude = OriginLatitude;
    WorldOriginElevationMeters = OriginElevationMeters;
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
}

void ABPGeoTileProxyActor::RebuildVectorGeometry()
{
    for (UProceduralMeshComponent* Component : LayerMeshes)
        if (Component) Component->DestroyComponent();
    LayerMeshes.Reset();
    LayerMeshTags.Reset();
    BuildVectorGeometry();
}

float ABPGeoTileProxyActor::SampleTerrainElevation(const FVector2D& LonLat) const
{
    if (TerrainGridWidth < 2 || TerrainGridHeight < 2 ||
        TerrainHeightMeters.Num() != TerrainGridWidth * TerrainGridHeight) return 0.0f;
    const FBPGeoBounds Bounds=FBridgePointGeoReference::BoundsForTile(Tile);
    const double U=FMath::Clamp((LonLat.X-Bounds.West)/FMath::Max(1.0e-12,Bounds.East-Bounds.West),0.0,1.0);
    const double V=FMath::Clamp((Bounds.North-LonLat.Y)/FMath::Max(1.0e-12,Bounds.North-Bounds.South),0.0,1.0);
    const double X=U*(TerrainGridWidth-1), Y=V*(TerrainGridHeight-1);
    const int32 X0=FMath::Clamp(FMath::FloorToInt(X),0,TerrainGridWidth-1);
    const int32 Y0=FMath::Clamp(FMath::FloorToInt(Y),0,TerrainGridHeight-1);
    const int32 X1=FMath::Min(X0+1,TerrainGridWidth-1);
    const int32 Y1=FMath::Min(Y0+1,TerrainGridHeight-1);
    const double AX=X-X0, AY=Y-Y0;
    const float H00=TerrainHeightMeters[Y0*TerrainGridWidth+X0];
    const float H10=TerrainHeightMeters[Y0*TerrainGridWidth+X1];
    const float H01=TerrainHeightMeters[Y1*TerrainGridWidth+X0];
    const float H11=TerrainHeightMeters[Y1*TerrainGridWidth+X1];
    return FMath::Lerp(FMath::Lerp(H00,H10,AX),FMath::Lerp(H01,H11,AX),AY)-WorldOriginElevationMeters;
}

FVector ABPGeoTileProxyActor::ToTileLocal(const FVector2D& LonLat, double HeightMeters, bool bUseTerrain) const
{
    const FVector2D Local = FBridgePointGeoReference::ToLocalMeters(
        LonLat.X, LonLat.Y, TileCenterLonLat.X, TileCenterLonLat.Y);
    const double GroundHeight=bUseTerrain ? SampleTerrainElevation(LonLat) : 0.0;
    return FVector(Local.X * 100.0, Local.Y * 100.0,
                   (GroundHeight+HeightMeters) * 100.0 + RuntimeGeometryZOffsetCm);
}

FName ABPGeoTileProxyActor::NormalizeLayerTag(const FBPGeoFeature& Feature) const
{
    const FString S = Feature.SourceLayer.ToLower();
    if (S.Contains(TEXT("parcel"))) return TEXT("parcels");
    const auto Property = [&Feature](const TCHAR* Key) { return Feature.Properties.FindRef(FName(Key)).ToLower(); };
    const FString Class = Property(TEXT("class"));
    const FString Subclass = Property(TEXT("subclass"));
    const FString Kind = Property(TEXT("kind"));
    const FString Detail = Property(TEXT("kind_detail"));
    const FString Railway = Property(TEXT("railway"));
    const FString Highway = Property(TEXT("highway"));
    const FString Bridge = Property(TEXT("bridge"));
    if (S.Contains(TEXT("roof"))) return TEXT("roofs");
    if (S.Contains(TEXT("building"))) return TEXT("buildings");
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
        const float BaseHeightM = FMath::Max(0.0f,Feature.BaseHeightMeters);
        const bool bBuilding = Tag == TEXT("buildings");
        const bool bRoof = Tag == TEXT("roofs");

        // Generate a top cap for a single-ring building/roof footprint. BridgePoint
        // roof features carry an explicit roof_base_m / roof_top_m pair.
        if ((bBuilding || bRoof) && Feature.GeometryType==EBPGeometryType::Polygon &&
            HeightM>0.0f && Feature.Paths.Num()==1)
        {
            const TArray<FVector2D>& Outer=Feature.Paths[0].Points;
            int32 RingCount=Outer.Num();
            if(RingCount>1 && Outer[0].Equals(Outer.Last(),KINDA_SMALL_NUMBER))--RingCount;
            if(RingCount>=3)
            {
                TArray<FVector> RoofVertices;
                RoofVertices.Reserve(RingCount);
                const float CapHeightM=BaseHeightM+HeightM+(bBuilding?Feature.RoofHeightMeters:0.0f);
                for(int32 I=0;I<RingCount;++I)
                    RoofVertices.Add(ToTileLocal(Outer[I],CapHeightM));
                TArray<int32> RoofTriangles;
                if(BPTriangulateRoof(RoofVertices,RoofTriangles))
                {
                    const int32 BaseIndex=V.Num();
                    FVector2D Min( DBL_MAX, DBL_MAX), Max(-DBL_MAX,-DBL_MAX);
                    for(const FVector& P:RoofVertices){Min.X=FMath::Min(Min.X,P.X);Min.Y=FMath::Min(Min.Y,P.Y);Max.X=FMath::Max(Max.X,P.X);Max.Y=FMath::Max(Max.Y,P.Y);}
                    const FVector2D Extent=Max-Min;
                    for(const FVector& P:RoofVertices)
                    {
                        V.Add(P);
                        UV.Add(FVector2D((P.X-Min.X)/FMath::Max(1.0,Extent.X),(P.Y-Min.Y)/FMath::Max(1.0,Extent.Y)));
                    }
                    for(int32 I=0;I<RoofTriangles.Num();I+=3)
                        T.Append({BaseIndex+RoofTriangles[I],BaseIndex+RoofTriangles[I+1],BaseIndex+RoofTriangles[I+2]});
                }
            }
        }

        for (const FBPGeoPath& WrappedPath : Feature.Paths)
        {
            const TArray<FVector2D>& Path=WrappedPath.Points;
            if (Feature.GeometryType == EBPGeometryType::Point)
            {
                if (Path.IsEmpty()) continue;
                const FVector P = ToTileLocal(Path[0]);
                const float R = 65.0f;
                AddQuad(nullptr, V, T, UV, P + FVector(-R,0,0), P + FVector(R,0,0), P + FVector(R,0,130), P + FVector(-R,0,130));
                continue;
            }
            if (Path.Num() < 2) continue;

            const int32 EdgeCount = Feature.GeometryType == EBPGeometryType::Polygon ? Path.Num() - 1 : Path.Num() - 1;
            for (int32 I = 0; I < EdgeCount; ++I)
            {
                const FVector A = ToTileLocal(Path[I], BaseHeightM+HeightM);
                const FVector B = ToTileLocal(Path[I + 1], BaseHeightM+HeightM);
                if (bBuilding && Feature.RoofHeightMeters>0.0f)
                {
                    const FVector ACap=ToTileLocal(Path[I],BaseHeightM+HeightM+Feature.RoofHeightMeters);
                    const FVector BCap=ToTileLocal(Path[I+1],BaseHeightM+HeightM+Feature.RoofHeightMeters);
                    AddQuad(nullptr,V,T,UV,A,B,BCap,ACap);
                }
                FVector Direction = (B - A).GetSafeNormal2D();
                if (Direction.IsNearlyZero()) continue;
                const FVector Side(-Direction.Y, Direction.X, 0.0);
                const float DefaultWidth = Tag == TEXT("parcels") ? 0.25f :
                    (Tag == TEXT("sidewalks") ? 1.5f : DefaultRoadWidthMeters);
                const float HalfWidth = (Feature.WidthMeters > 0.0f ? Feature.WidthMeters : DefaultWidth) * 50.0f;

                if (Feature.GeometryType == EBPGeometryType::LineString || (!bBuilding && !bRoof))
                {
                    AddQuad(nullptr, V, T, UV,
                        A - Side * HalfWidth, A + Side * HalfWidth,
                        B + Side * HalfWidth, B - Side * HalfWidth);
                }
                else if (HeightM > 0.0f)
                {
                    const FVector A0 = ToTileLocal(Path[I], BaseHeightM);
                    const FVector B0 = ToTileLocal(Path[I + 1], BaseHeightM);
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
            Vertices.Add(ToTileLocal(FVector2D(Lon, Lat), HeightsMeters[Y * Width + X]-WorldOriginElevationMeters, false));
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

    TerrainHeightMeters=HeightsMeters;
    TerrainGridWidth=Width;
    TerrainGridHeight=Height;
    RebuildVectorGeometry();
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