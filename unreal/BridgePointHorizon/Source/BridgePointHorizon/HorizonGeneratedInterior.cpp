#include "HorizonGeneratedInterior.h"

#include "Components/SceneComponent.h"
#include "Components/StaticMeshComponent.h"
#include "Engine/StaticMesh.h"
#include "UObject/ConstructorHelpers.h"

AHorizonGeneratedInterior::AHorizonGeneratedInterior()
{
    PrimaryActorTick.bCanEverTick = true;

    SceneRoot = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
    SetRootComponent(SceneRoot);

    static ConstructorHelpers::FObjectFinder<UStaticMesh> CubeFinder(TEXT("/Engine/BasicShapes/Cube.Cube"));
    if (CubeFinder.Succeeded())
    {
        CubeMesh = CubeFinder.Object;
    }
}

void AHorizonGeneratedInterior::BeginPlay()
{
    Super::BeginPlay();

    if (GeneratedMeshes.IsEmpty())
    {
        GenerateInterior(1337);
    }
}

void AHorizonGeneratedInterior::Tick(float DeltaSeconds)
{
    Super::Tick(DeltaSeconds);

    for (FDoorRuntime& Door : Doors)
    {
        USceneComponent* Pivot = Door.Pivot.Get();
        if (!Pivot)
        {
            continue;
        }

        FRotator Rotation = Pivot->GetRelativeRotation();
        const float NewYaw = FMath::FInterpTo(Rotation.Yaw, Door.TargetYaw, DeltaSeconds, 7.5f);
        Rotation.Yaw = NewYaw;
        Pivot->SetRelativeRotation(Rotation);
    }
}

UStaticMeshComponent* AHorizonGeneratedInterior::AddBox(
    const FString& Label,
    const FVector& RelativeCenter,
    const FVector& SizeCm,
    bool bMovable,
    USceneComponent* Parent)
{
    if (!CubeMesh)
    {
        return nullptr;
    }

    UStaticMeshComponent* Mesh = NewObject<UStaticMeshComponent>(this, *Label);
    Mesh->SetStaticMesh(CubeMesh);
    Mesh->SetupAttachment(Parent ? Parent : SceneRoot);
    Mesh->SetMobility(bMovable ? EComponentMobility::Movable : EComponentMobility::Static);
    Mesh->SetCollisionEnabled(ECollisionEnabled::QueryAndPhysics);
    Mesh->SetCollisionResponseToAllChannels(ECR_Block);
    Mesh->SetRelativeLocation(RelativeCenter);
    Mesh->SetRelativeScale3D(SizeCm / 100.0f);
    Mesh->SetCastShadow(true);
    Mesh->RegisterComponent();

    GeneratedMeshes.Add(Mesh);
    return Mesh;
}

void AHorizonGeneratedInterior::ClearInterior()
{
    Doors.Reset();
    GeneratedDressingPieceCount = 0;

    for (UStaticMeshComponent* Mesh : GeneratedMeshes)
    {
        if (IsValid(Mesh))
        {
            Mesh->DestroyComponent();
        }
    }
    GeneratedMeshes.Reset();

    for (USceneComponent* Component : GeneratedSceneComponents)
    {
        if (IsValid(Component))
        {
            Component->DestroyComponent();
        }
    }
    GeneratedSceneComponents.Reset();
}

void AHorizonGeneratedInterior::GenerateInterior(int32 Seed)
{
    ClearInterior();

    FRandomStream Random(Seed);
    FloorCount = FMath::Clamp(FloorCount, 1, 40);
    RoomsPerSide = FMath::Clamp(RoomsPerSide, 2, 8);
    BuildingWidthCm = FMath::Max(BuildingWidthCm, 900.0f);
    BuildingDepthCm = FMath::Max(BuildingDepthCm, 800.0f);
    MaxDressingPieces = FMath::Clamp(MaxDressingPieces, 0, 160);

    // Tiny deterministic variation prevents every generated building from feeling identical.
    const float WidthVariation = Random.FRandRange(-0.035f, 0.035f);
    const float DepthVariation = Random.FRandRange(-0.035f, 0.035f);
    BuildingWidthCm *= (1.0f + WidthVariation);
    BuildingDepthCm *= (1.0f + DepthVariation);

    for (int32 Floor = 0; Floor < FloorCount; ++Floor)
    {
        AddFloorPlate(Floor);
        AddOuterShell(Floor);
        AddRoomPartitions(Floor);

        if (bGenerateFictionalDressing)
        {
            // Fictional dressing uses only the gameplay seed and generated room dimensions.
            // It never consumes source-backed exterior records or real interior plans.
            AddFictionalDressing(Floor, Random);
        }

        if (Floor < FloorCount - 1)
        {
            AddStairRun(Floor);
        }
    }

    if (bGenerateRoofAccess)
    {
        // Build the roof as four collision slabs around a real stairwell opening.
        // The final stair flight reaches the roof instead of terminating beneath a solid cap.
        AddFloorPlate(FloorCount);
        AddStairRun(FloorCount - 1);
        AddRoofAccess();
    }
    else
    {
        const float RoofZ = FloorCount * FloorHeightCm + 10.0f;
        AddBox(TEXT("Roof"), FVector(0.0f, 0.0f, RoofZ), FVector(BuildingWidthCm, BuildingDepthCm, 20.0f));
    }
}

void AHorizonGeneratedInterior::AddFloorPlate(int32 FloorIndex)
{
    const float SlabThickness = 20.0f;
    const float Z = FloorIndex * FloorHeightCm - SlabThickness * 0.5f;

    if (FloorIndex == 0)
    {
        AddBox(
            FString::Printf(TEXT("Floor_%d"), FloorIndex),
            FVector(0.0f, 0.0f, Z),
            FVector(BuildingWidthCm, BuildingDepthCm, SlabThickness));
        return;
    }

    // Real hole through every elevated floor for the walkable stairwell.
    const float HoleLength = FMath::Min(620.0f, BuildingWidthCm * 0.32f);
    const float HoleWidth = FMath::Min(240.0f, BuildingDepthCm * 0.22f);
    const float HoleCenterX = -BuildingWidthCm * 0.5f + HoleLength * 0.5f + 80.0f;
    const float LeftEdge = -BuildingWidthCm * 0.5f;
    const float RightEdge = BuildingWidthCm * 0.5f;
    const float HoleMinX = HoleCenterX - HoleLength * 0.5f;
    const float HoleMaxX = HoleCenterX + HoleLength * 0.5f;

    const float LeftWidth = HoleMinX - LeftEdge;
    const float RightWidth = RightEdge - HoleMaxX;

    if (LeftWidth > 1.0f)
    {
        AddBox(FString::Printf(TEXT("FloorLeft_%d"), FloorIndex),
            FVector(LeftEdge + LeftWidth * 0.5f, 0.0f, Z),
            FVector(LeftWidth, BuildingDepthCm, SlabThickness));
    }

    if (RightWidth > 1.0f)
    {
        AddBox(FString::Printf(TEXT("FloorRight_%d"), FloorIndex),
            FVector(HoleMaxX + RightWidth * 0.5f, 0.0f, Z),
            FVector(RightWidth, BuildingDepthCm, SlabThickness));
    }

    const float SideDepth = (BuildingDepthCm - HoleWidth) * 0.5f;
    AddBox(FString::Printf(TEXT("FloorNorth_%d"), FloorIndex),
        FVector(HoleCenterX, HoleWidth * 0.5f + SideDepth * 0.5f, Z),
        FVector(HoleLength, SideDepth, SlabThickness));
    AddBox(FString::Printf(TEXT("FloorSouth_%d"), FloorIndex),
        FVector(HoleCenterX, -HoleWidth * 0.5f - SideDepth * 0.5f, Z),
        FVector(HoleLength, SideDepth, SlabThickness));
}

void AHorizonGeneratedInterior::AddWindowBayX(
    float XMin,
    float XMax,
    float Y,
    float FloorZ,
    const FString& Prefix)
{
    const float Thickness = 18.0f;
    const float WindowBottom = 95.0f;
    const float WindowHeight = 135.0f;
    const float TopHeight = FloorHeightCm - WindowBottom - WindowHeight;
    const float Width = XMax - XMin;
    const float X = (XMin + XMax) * 0.5f;

    AddBox(Prefix + TEXT("_Sill"),
        FVector(X, Y, FloorZ + WindowBottom * 0.5f),
        FVector(Width, Thickness, WindowBottom));

    if (TopHeight > 1.0f)
    {
        AddBox(Prefix + TEXT("_Header"),
            FVector(X, Y, FloorZ + WindowBottom + WindowHeight + TopHeight * 0.5f),
            FVector(Width, Thickness, TopHeight));
    }

    // No glass mesh when bOpenWindows is true: this is an actual line-of-sight/projectile hole.
    if (!bOpenWindows)
    {
        // Keep a thin collision-free placeholder plane-sized box for later transparent-glass material assignment.
        UStaticMeshComponent* Pane = AddBox(
            Prefix + TEXT("_Pane"),
            FVector(X, Y, FloorZ + WindowBottom + WindowHeight * 0.5f),
            FVector(Width * 0.72f, 2.0f, WindowHeight * 0.82f));
        if (Pane)
        {
            Pane->SetCollisionEnabled(ECollisionEnabled::NoCollision);
        }
    }
}

void AHorizonGeneratedInterior::AddOuterShell(int32 FloorIndex)
{
    const float FloorZ = FloorIndex * FloorHeightCm;
    const float WallThickness = 18.0f;
    const float HalfW = BuildingWidthCm * 0.5f;
    const float HalfD = BuildingDepthCm * 0.5f;
    const float BayWidth = BuildingWidthCm / RoomsPerSide;

    // North wall: every room gets a genuine open/transparent window opening.
    for (int32 Bay = 0; Bay < RoomsPerSide; ++Bay)
    {
        const float X0 = -HalfW + Bay * BayWidth + 18.0f;
        const float X1 = -HalfW + (Bay + 1) * BayWidth - 18.0f;
        AddWindowBayX(X0, X1, HalfD, FloorZ, FString::Printf(TEXT("NorthWindow_%d_%d"), FloorIndex, Bay));
    }

    // South wall has windows except the ground-floor main entrance.
    if (FloorIndex == 0)
    {
        const float DoorWidth = 150.0f;
        const float SegmentWidth = HalfW - DoorWidth * 0.5f;
        AddBox(TEXT("SouthEntranceLeft"),
            FVector(-DoorWidth * 0.5f - SegmentWidth * 0.5f, -HalfD, FloorZ + FloorHeightCm * 0.5f),
            FVector(SegmentWidth, WallThickness, FloorHeightCm));
        AddBox(TEXT("SouthEntranceRight"),
            FVector(DoorWidth * 0.5f + SegmentWidth * 0.5f, -HalfD, FloorZ + FloorHeightCm * 0.5f),
            FVector(SegmentWidth, WallThickness, FloorHeightCm));

        AddDoor(0.0f, -HalfD, FloorZ, true, Doors.Num());
    }
    else
    {
        for (int32 Bay = 0; Bay < RoomsPerSide; ++Bay)
        {
            const float X0 = -HalfW + Bay * BayWidth + 18.0f;
            const float X1 = -HalfW + (Bay + 1) * BayWidth - 18.0f;
            AddWindowBayX(X0, X1, -HalfD, FloorZ, FString::Printf(TEXT("SouthWindow_%d_%d"), FloorIndex, Bay));
        }
    }

    // Side walls include repeated full-height openings between structural columns.
    const float SideBay = BuildingDepthCm / 4.0f;
    for (int32 Side = -1; Side <= 1; Side += 2)
    {
        const float X = Side * HalfW;
        for (int32 Bay = 0; Bay < 4; ++Bay)
        {
            const float YCenter = -HalfD + (Bay + 0.5f) * SideBay;
            const float ColumnWidth = 44.0f;
            AddBox(FString::Printf(TEXT("SideColA_%d_%d_%d"), Side, FloorIndex, Bay),
                FVector(X, YCenter - SideBay * 0.5f + ColumnWidth * 0.5f, FloorZ + FloorHeightCm * 0.5f),
                FVector(WallThickness, ColumnWidth, FloorHeightCm));
            AddBox(FString::Printf(TEXT("SideColB_%d_%d_%d"), Side, FloorIndex, Bay),
                FVector(X, YCenter + SideBay * 0.5f - ColumnWidth * 0.5f, FloorZ + FloorHeightCm * 0.5f),
                FVector(WallThickness, ColumnWidth, FloorHeightCm));

            AddBox(FString::Printf(TEXT("SideSill_%d_%d_%d"), Side, FloorIndex, Bay),
                FVector(X, YCenter, FloorZ + 47.5f),
                FVector(WallThickness, SideBay - ColumnWidth * 2.0f, 95.0f));
            AddBox(FString::Printf(TEXT("SideHeader_%d_%d_%d"), Side, FloorIndex, Bay),
                FVector(X, YCenter, FloorZ + FloorHeightCm - 45.0f),
                FVector(WallThickness, SideBay - ColumnWidth * 2.0f, 90.0f));
        }
    }
}

void AHorizonGeneratedInterior::AddRoomPartitions(int32 FloorIndex)
{
    const float FloorZ = FloorIndex * FloorHeightCm;
    const float HalfW = BuildingWidthCm * 0.5f;
    const float HalfD = BuildingDepthCm * 0.5f;
    const float CorridorWidth = 270.0f;
    const float PartitionThickness = 14.0f;
    const float RoomBayWidth = BuildingWidthCm / RoomsPerSide;
    const float DoorWidth = 100.0f;
    const float DoorHeight = 220.0f;

    for (int32 Side = -1; Side <= 1; Side += 2)
    {
        const float CorridorY = Side * CorridorWidth * 0.5f;

        for (int32 Room = 0; Room < RoomsPerSide; ++Room)
        {
            const float X0 = -HalfW + Room * RoomBayWidth;
            const float X1 = X0 + RoomBayWidth;
            const float DoorCenterX = (X0 + X1) * 0.5f;
            const float LeftLength = DoorCenterX - DoorWidth * 0.5f - X0;
            const float RightLength = X1 - (DoorCenterX + DoorWidth * 0.5f);

            if (LeftLength > 1.0f)
            {
                AddBox(FString::Printf(TEXT("RoomWallL_%d_%d_%d"), FloorIndex, Side, Room),
                    FVector(X0 + LeftLength * 0.5f, CorridorY, FloorZ + FloorHeightCm * 0.5f),
                    FVector(LeftLength, PartitionThickness, FloorHeightCm));
            }
            if (RightLength > 1.0f)
            {
                AddBox(FString::Printf(TEXT("RoomWallR_%d_%d_%d"), FloorIndex, Side, Room),
                    FVector(DoorCenterX + DoorWidth * 0.5f + RightLength * 0.5f, CorridorY, FloorZ + FloorHeightCm * 0.5f),
                    FVector(RightLength, PartitionThickness, FloorHeightCm));
            }

            const float HeaderHeight = FloorHeightCm - DoorHeight;
            if (HeaderHeight > 1.0f)
            {
                AddBox(FString::Printf(TEXT("DoorHeader_%d_%d_%d"), FloorIndex, Side, Room),
                    FVector(DoorCenterX, CorridorY, FloorZ + DoorHeight + HeaderHeight * 0.5f),
                    FVector(DoorWidth, PartitionThickness, HeaderHeight));
            }

            AddDoor(DoorCenterX, CorridorY, FloorZ, Side > 0, Doors.Num());

            if (Room > 0)
            {
                const float PartitionX = X0;
                const float RoomDepth = HalfD - CorridorWidth * 0.5f;
                const float Y = Side * (CorridorWidth * 0.5f + RoomDepth * 0.5f);
                AddBox(FString::Printf(TEXT("RoomDivider_%d_%d_%d"), FloorIndex, Side, Room),
                    FVector(PartitionX, Y, FloorZ + FloorHeightCm * 0.5f),
                    FVector(PartitionThickness, RoomDepth, FloorHeightCm));
            }
        }
    }
}

UStaticMeshComponent* AHorizonGeneratedInterior::AddFictionalDressingBox(
    const FString& Label,
    const FVector& RelativeCenter,
    const FVector& SizeCm,
    bool bBlocksMovement)
{
    if (GeneratedDressingPieceCount >= MaxDressingPieces)
    {
        return nullptr;
    }

    UStaticMeshComponent* Mesh = AddBox(Label, RelativeCenter, SizeCm);
    if (!Mesh)
    {
        return nullptr;
    }

    Mesh->ComponentTags.AddUnique(FName(TEXT("HorizonFictionalDressing")));
    if (!bBlocksMovement)
    {
        // Small debris remains visible and shadow-casting without creating traversal snags.
        Mesh->SetCollisionEnabled(ECollisionEnabled::NoCollision);
    }

    ++GeneratedDressingPieceCount;
    return Mesh;
}

void AHorizonGeneratedInterior::AddFictionalDressing(int32 FloorIndex, FRandomStream& Random)
{
    if (MaxDressingPieces <= 0 || GeneratedDressingPieceCount >= MaxDressingPieces)
    {
        return;
    }

    const float HalfW = BuildingWidthCm * 0.5f;
    const float HalfD = BuildingDepthCm * 0.5f;
    const float RoomBayWidth = BuildingWidthCm / RoomsPerSide;
    const float FloorZ = FloorIndex * FloorHeightCm;
    const int32 ClusterCount = FMath::Clamp(RoomsPerSide / 2, 1, 3);

    for (int32 Cluster = 0;
         Cluster < ClusterCount && GeneratedDressingPieceCount < MaxDressingPieces;
         ++Cluster)
    {
        const int32 RoomIndex = (FloorIndex * 3 + Cluster * 2) % RoomsPerSide;
        const float Side = ((FloorIndex + Cluster) % 2 == 0) ? 1.0f : -1.0f;
        const float RoomCenterX = -HalfW + (RoomIndex + 0.5f) * RoomBayWidth;
        const float WallSideY = Side * (HalfD - 115.0f);
        const float JitterX = Random.FRandRange(-RoomBayWidth * 0.18f, RoomBayWidth * 0.18f);
        const float JitterY = Random.FRandRange(-45.0f, 45.0f);
        const float Yaw = Random.FRandRange(-32.0f, 32.0f);

        // Collision-bearing supply crate sits against the exterior wall, outside the central
        // corridor, door swing zones, stairwell, and roof-access path.
        UStaticMeshComponent* Crate = AddFictionalDressingBox(
            FString::Printf(TEXT("FictionalCrate_%d_%d"), FloorIndex, Cluster),
            FVector(RoomCenterX + JitterX, WallSideY, FloorZ + 34.0f),
            FVector(72.0f, 62.0f, 68.0f),
            true);
        if (Crate)
        {
            Crate->SetRelativeRotation(FRotator(0.0f, Yaw, 0.0f));
        }

        // Two lightweight debris planks build visual density but cannot snag player movement.
        for (int32 PlankIndex = 0;
             PlankIndex < 2 && GeneratedDressingPieceCount < MaxDressingPieces;
             ++PlankIndex)
        {
            const float PlankYaw = Yaw + (PlankIndex == 0 ? -24.0f : 31.0f);
            UStaticMeshComponent* Plank = AddFictionalDressingBox(
                FString::Printf(TEXT("FictionalDebris_%d_%d_%d"), FloorIndex, Cluster, PlankIndex),
                FVector(
                    RoomCenterX + JitterX + (PlankIndex == 0 ? -58.0f : 52.0f),
                    WallSideY - Side * (72.0f + JitterY),
                    FloorZ + 5.0f + PlankIndex * 5.0f),
                FVector(128.0f, 18.0f, 10.0f),
                false);
            if (Plank)
            {
                Plank->SetRelativeRotation(FRotator(0.0f, PlankYaw, 0.0f));
            }
        }
    }
}

void AHorizonGeneratedInterior::AddDoor(
    float X,
    float Y,
    float FloorZ,
    bool bNorthSide,
    int32 DoorIndex)
{
    const float DoorWidth = 96.0f;
    const float DoorHeight = 216.0f;
    const float DoorThickness = 7.0f;

    USceneComponent* Pivot = NewObject<USceneComponent>(this, *FString::Printf(TEXT("DoorPivot_%d"), DoorIndex));
    Pivot->SetupAttachment(SceneRoot);
    Pivot->SetRelativeLocation(FVector(X - DoorWidth * 0.5f, Y, FloorZ));
    Pivot->RegisterComponent();
    GeneratedSceneComponents.Add(Pivot);

    UStaticMeshComponent* Door = AddBox(
        FString::Printf(TEXT("DoorLeaf_%d"), DoorIndex),
        FVector(DoorWidth * 0.5f, 0.0f, DoorHeight * 0.5f),
        FVector(DoorWidth, DoorThickness, DoorHeight),
        true,
        Pivot);

    if (Door)
    {
        Door->SetMobility(EComponentMobility::Movable);
    }

    FDoorRuntime Runtime;
    Runtime.Pivot = Pivot;
    Runtime.ClosedYaw = 0.0f;
    Runtime.OpenYaw = bNorthSide ? 95.0f : -95.0f;
    Runtime.TargetYaw = 0.0f;
    Runtime.bOpen = false;
    Doors.Add(Runtime);
}

void AHorizonGeneratedInterior::AddStairRun(int32 FromFloorIndex)
{
    const int32 Steps = 16;
    const float HoleLength = FMath::Min(620.0f, BuildingWidthCm * 0.32f);
    const float HoleCenterX = -BuildingWidthCm * 0.5f + HoleLength * 0.5f + 80.0f;
    const float Run = HoleLength - 70.0f;
    const float Tread = Run / Steps;
    const float Rise = FloorHeightCm / Steps;
    const float Width = FMath::Min(180.0f, BuildingDepthCm * 0.18f);
    const float StartX = HoleCenterX - Run * 0.5f;
    const float BaseZ = FromFloorIndex * FloorHeightCm;

    for (int32 Step = 0; Step < Steps; ++Step)
    {
        const float StepHeight = Rise * (Step + 1);
        const float X = StartX + Tread * (Step + 0.5f);

        AddBox(
            FString::Printf(TEXT("Stair_%d_%d"), FromFloorIndex, Step),
            FVector(X, 0.0f, BaseZ + StepHeight * 0.5f),
            FVector(Tread + 2.0f, Width, StepHeight));
    }

    // Landing at the upper edge of the stairwell.
    AddBox(
        FString::Printf(TEXT("Landing_%d"), FromFloorIndex),
        FVector(HoleCenterX + Run * 0.5f - 45.0f, 0.0f, BaseZ + FloorHeightCm - 9.0f),
        FVector(90.0f, Width + 40.0f, 18.0f));
}

void AHorizonGeneratedInterior::AddRoofAccess()
{
    const float RoofZ = FloorCount * FloorHeightCm;
    const float WallThickness = 18.0f;
    const float BulkheadHeight = 260.0f;
    const float DoorWidth = 110.0f;
    const float DoorHeight = 220.0f;
    const float HoleLength = FMath::Min(620.0f, BuildingWidthCm * 0.32f);
    const float HoleWidth = FMath::Min(240.0f, BuildingDepthCm * 0.22f);
    const float HoleCenterX = -BuildingWidthCm * 0.5f + HoleLength * 0.5f + 80.0f;
    const float BulkheadMinX = HoleCenterX - HoleLength * 0.5f - 45.0f;
    const float BulkheadMaxX = HoleCenterX + HoleLength * 0.5f + 120.0f;
    const float BulkheadWidth = BulkheadMaxX - BulkheadMinX;
    const float BulkheadCenterX = (BulkheadMinX + BulkheadMaxX) * 0.5f;
    const float BulkheadHalfDepth = HoleWidth * 0.5f + 75.0f;
    const float WallCenterZ = RoofZ + BulkheadHeight * 0.5f;

    AddBox(TEXT("RoofBulkheadWest"),
        FVector(BulkheadMinX, 0.0f, WallCenterZ),
        FVector(WallThickness, BulkheadHalfDepth * 2.0f, BulkheadHeight));
    AddBox(TEXT("RoofBulkheadEast"),
        FVector(BulkheadMaxX, 0.0f, WallCenterZ),
        FVector(WallThickness, BulkheadHalfDepth * 2.0f, BulkheadHeight));
    AddBox(TEXT("RoofBulkheadSouth"),
        FVector(BulkheadCenterX, -BulkheadHalfDepth, WallCenterZ),
        FVector(BulkheadWidth, WallThickness, BulkheadHeight));

    // Split the north wall around a physical doorway and add a working hinged leaf.
    const float LeftWidth = HoleCenterX - DoorWidth * 0.5f - BulkheadMinX;
    const float RightWidth = BulkheadMaxX - (HoleCenterX + DoorWidth * 0.5f);
    AddBox(TEXT("RoofDoorWallLeft"),
        FVector(BulkheadMinX + LeftWidth * 0.5f, BulkheadHalfDepth, WallCenterZ),
        FVector(LeftWidth, WallThickness, BulkheadHeight));
    AddBox(TEXT("RoofDoorWallRight"),
        FVector(HoleCenterX + DoorWidth * 0.5f + RightWidth * 0.5f, BulkheadHalfDepth, WallCenterZ),
        FVector(RightWidth, WallThickness, BulkheadHeight));

    const float HeaderHeight = BulkheadHeight - DoorHeight;
    AddBox(TEXT("RoofDoorHeader"),
        FVector(HoleCenterX, BulkheadHalfDepth, RoofZ + DoorHeight + HeaderHeight * 0.5f),
        FVector(DoorWidth, WallThickness, HeaderHeight));
    AddDoor(HoleCenterX, BulkheadHalfDepth, RoofZ, true, Doors.Num());

    // A low physical parapet keeps the roof traversable while preserving open sightlines.
    const float HalfW = BuildingWidthCm * 0.5f;
    const float HalfD = BuildingDepthCm * 0.5f;
    const float ParapetHeight = 110.0f;
    const float ParapetZ = RoofZ + ParapetHeight * 0.5f;
    AddBox(TEXT("RoofParapetNorth"), FVector(0.0f, HalfD, ParapetZ),
        FVector(BuildingWidthCm, WallThickness, ParapetHeight));
    AddBox(TEXT("RoofParapetSouth"), FVector(0.0f, -HalfD, ParapetZ),
        FVector(BuildingWidthCm, WallThickness, ParapetHeight));
    AddBox(TEXT("RoofParapetWest"), FVector(-HalfW, 0.0f, ParapetZ),
        FVector(WallThickness, BuildingDepthCm, ParapetHeight));
    AddBox(TEXT("RoofParapetEast"), FVector(HalfW, 0.0f, ParapetZ),
        FVector(WallThickness, BuildingDepthCm, ParapetHeight));
}

bool AHorizonGeneratedInterior::ToggleNearestDoor(FVector WorldLocation, float RadiusCm)
{
    const FVector LocalLocation = GetActorTransform().InverseTransformPosition(WorldLocation);

    int32 BestIndex = INDEX_NONE;
    float BestDistanceSq = FMath::Square(FMath::Max(1.0f, RadiusCm));

    for (int32 Index = 0; Index < Doors.Num(); ++Index)
    {
        USceneComponent* Pivot = Doors[Index].Pivot.Get();
        if (!Pivot)
        {
            continue;
        }

        const float DistanceSq = FVector::DistSquared(LocalLocation, Pivot->GetRelativeLocation());
        if (DistanceSq < BestDistanceSq)
        {
            BestDistanceSq = DistanceSq;
            BestIndex = Index;
        }
    }

    if (BestIndex == INDEX_NONE)
    {
        return false;
    }

    FDoorRuntime& Door = Doors[BestIndex];
    Door.bOpen = !Door.bOpen;
    Door.TargetYaw = Door.bOpen ? Door.OpenYaw : Door.ClosedYaw;
    return true;
}
