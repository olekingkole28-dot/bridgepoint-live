#include "BPProceduralInteriorActor.h"
#include "ProceduralMeshComponent.h"
#include "Components/StaticMeshComponent.h"
#include "Materials/MaterialInterface.h"

ABPProceduralInteriorActor::ABPProceduralInteriorActor()
{
    PrimaryActorTick.bCanEverTick = false;
    SceneRoot = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
    SetRootComponent(SceneRoot);
}

bool ABPProceduralInteriorActor::IsPointInsidePolygon(const FVector2D& P, const TArray<FVector2D>& Polygon)
{
    bool bInside = false;
    const int32 Count = Polygon.Num();
    if (Count < 3) return false;
    for (int32 I = 0, J = Count - 1; I < Count; J = I++)
    {
        const FVector2D A = Polygon[I], B = Polygon[J];
        const bool bCrosses = ((A.Y > P.Y) != (B.Y > P.Y)) &&
            (P.X < (B.X - A.X) * (P.Y - A.Y) / ((B.Y - A.Y) + UE_SMALL_NUMBER) + A.X);
        if (bCrosses) bInside = !bInside;
    }
    return bInside;
}

void ABPProceduralInteriorActor::AddQuad(TArray<FVector>& V, TArray<int32>& T, const FVector& A, const FVector& B,
                                        const FVector& C, const FVector& D)
{
    const int32 Base = V.Num();
    V.Append({A, B, C, D});
    T.Append({Base, Base+1, Base+2, Base, Base+2, Base+3});
}

bool ABPProceduralInteriorActor::IsInteriorSegment(const FVector2D& A, const FVector2D& B) const
{
    for (int32 I = 0; I <= 8; ++I)
    {
        const FVector2D P = FMath::Lerp(A, B, static_cast<double>(I) / 8.0);
        if (!IsPointInsidePolygon(P, BuildingFootprint)) return false;
    }
    return true;
}

void ABPProceduralInteriorActor::ClearInterior()
{
    for (UProceduralMeshComponent* Mesh : GeneratedMeshes) if (Mesh) Mesh->DestroyComponent();
    for (UStaticMeshComponent* Stair : StairModules) if (Stair) Stair->DestroyComponent();
    GeneratedMeshes.Reset();
    StairModules.Reset();
}

bool ABPProceduralInteriorActor::GenerateInterior()
{
    ClearInterior();
    if (BuildingFootprint.Num() < 3 || TotalHeightCm <= 0.0f || TotalFloors < 1) return false;

    FBox2D Bounds(ForceInit);
    for (const FVector2D& P : BuildingFootprint) Bounds += P;
    if (!Bounds.bIsValid) return false;

    const float FloorHeight = TotalHeightCm / TotalFloors;
    const FVector2D Center = Bounds.GetCenter();
    const float HalfShaft = ShaftWidthCm * 0.5f;
    const float HalfCorridor = CorridorWidthCm * 0.5f;

    for (int32 Floor = 0; Floor < TotalFloors; ++Floor)
    {
        const float FloorZ = Floor * FloorHeight;
        UProceduralMeshComponent* Mesh = NewObject<UProceduralMeshComponent>(this, FName(*FString::Printf(TEXT("InteriorFloor_%d"), Floor)));
        Mesh->SetupAttachment(SceneRoot);
        Mesh->bUseAsyncCooking = true;
        Mesh->RegisterComponent();
        GeneratedMeshes.Add(Mesh);

        TArray<FVector> FloorVertices, WallVertices;
        TArray<int32> FloorTriangles, WallTriangles;
        TArray<FVector2D> FloorUVs, WallUVs;
        TArray<FVector> EmptyNormals;
        TArray<FLinearColor> EmptyColors;
        TArray<FProcMeshTangent> EmptyTangents;

        const float Cell = FMath::Max(200.0f, RoomCellSizeCm);
        const int32 NX = FMath::Clamp(FMath::CeilToInt(Bounds.GetSize().X / Cell), 1, 128);
        const int32 NY = FMath::Clamp(FMath::CeilToInt(Bounds.GetSize().Y / Cell), 1, 128);
        const float StepX = Bounds.GetSize().X / NX;
        const float StepY = Bounds.GetSize().Y / NY;

        // Floor plates are clipped by cell containment. The central shaft is deliberately left open on every level.
        for (int32 Y = 0; Y < NY; ++Y)
        {
            for (int32 X = 0; X < NX; ++X)
            {
                const float X0 = Bounds.Min.X + X * StepX, X1 = X0 + StepX;
                const float Y0 = Bounds.Min.Y + Y * StepY, Y1 = Y0 + StepY;
                const FVector2D C((X0+X1)*0.5, (Y0+Y1)*0.5);
                const bool bInShaft = FMath::Abs(C.X-Center.X) < HalfShaft + StepX*0.5f &&
                                      FMath::Abs(C.Y-Center.Y) < HalfShaft + StepY*0.5f;
                if (bInShaft) continue;
                if (!IsPointInsidePolygon(C, BuildingFootprint) ||
                    !IsPointInsidePolygon(FVector2D(X0,Y0), BuildingFootprint) ||
                    !IsPointInsidePolygon(FVector2D(X1,Y0), BuildingFootprint) ||
                    !IsPointInsidePolygon(FVector2D(X1,Y1), BuildingFootprint) ||
                    !IsPointInsidePolygon(FVector2D(X0,Y1), BuildingFootprint)) continue;

                const int32 Base = FloorVertices.Num();
                FloorVertices.Append({
                    FVector(X0,Y0,FloorZ), FVector(X1,Y0,FloorZ),
                    FVector(X1,Y1,FloorZ), FVector(X0,Y1,FloorZ)
                });
                FloorTriangles.Append({Base,Base+1,Base+2,Base,Base+2,Base+3});
                FloorUVs.Append({FVector2D(0,0),FVector2D(1,0),FVector2D(1,1),FVector2D(0,1)});
            }
        }

        // Room walls are internal grid partitions only. No perimeter/outer-wall geometry is generated.
        for (int32 X = 1; X < NX; ++X)
        {
            const float XLine = Bounds.Min.X + X * StepX;
            for (int32 Y = 0; Y < NY; ++Y)
            {
                const float Y0 = Bounds.Min.Y + Y * StepY, Y1 = Y0 + StepY;
                const FVector2D Mid(XLine, (Y0+Y1)*0.5f);
                const bool bCorridor = FMath::Abs(Mid.Y-Center.Y) < HalfCorridor;
                const bool bShaft = FMath::Abs(Mid.X-Center.X) < HalfShaft && FMath::Abs(Mid.Y-Center.Y) < HalfShaft;
                const FVector2D A(XLine,Y0), B(XLine,Y1);
                if (!bCorridor && !bShaft && IsInteriorSegment(A,B))
                    AddQuad(WallVertices, WallTriangles, FVector(XLine,Y0,FloorZ), FVector(XLine,Y1,FloorZ),
                            FVector(XLine,Y1,FloorZ+FloorHeight), FVector(XLine,Y0,FloorZ+FloorHeight));
            }
        }
        for (int32 Y = 1; Y < NY; ++Y)
        {
            const float YLine = Bounds.Min.Y + Y * StepY;
            for (int32 X = 0; X < NX; ++X)
            {
                const float X0 = Bounds.Min.X + X * StepX, X1 = X0 + StepX;
                const FVector2D Mid((X0+X1)*0.5f,YLine);
                const bool bCorridor = FMath::Abs(Mid.Y-Center.Y) < HalfCorridor;
                const bool bShaft = FMath::Abs(Mid.X-Center.X) < HalfShaft && FMath::Abs(Mid.Y-Center.Y) < HalfShaft;
                const FVector2D A(X0,YLine), B(X1,YLine);
                if (!bCorridor && !bShaft && IsInteriorSegment(A,B))
                    AddQuad(WallVertices, WallTriangles, FVector(X0,YLine,FloorZ), FVector(X1,YLine,FloorZ),
                            FVector(X1,YLine,FloorZ+FloorHeight), FVector(X0,YLine,FloorZ+FloorHeight));
            }
        }

        if (!FloorVertices.IsEmpty())
        {
            Mesh->CreateMeshSection_LinearColor(0,FloorVertices,FloorTriangles,EmptyNormals,FloorUVs,EmptyColors,EmptyTangents,true);
            Mesh->SetMaterial(0,InteriorMaterial);
        }
        if (!WallVertices.IsEmpty())
        {
            Mesh->CreateMeshSection_LinearColor(1,WallVertices,WallTriangles,EmptyNormals,WallUVs,EmptyColors,EmptyTangents,true);
            Mesh->SetMaterial(1,InteriorMaterial);
        }

        // One modular stair module per floor-to-floor transition, positioned inside the shared shaft.
        if (ModularStairMesh && Floor < TotalFloors - 1)
        {
            UStaticMeshComponent* Stair = NewObject<UStaticMeshComponent>(this, FName(*FString::Printf(TEXT("StairModule_%d"), Floor)));
            Stair->SetupAttachment(SceneRoot);
            Stair->SetStaticMesh(ModularStairMesh);
            Stair->SetMobility(EComponentMobility::Movable);
            Stair->SetRelativeLocation(FVector(Center.X,Center.Y,FloorZ));
            Stair->RegisterComponent();
            StairModules.Add(Stair);
        }
    }
    return true;
}