#include "HorizonBaseBuildingSubsystem.h"

#include "HorizonSurvivalSubsystem.h"
#include "Engine/GameInstance.h"
#include "Kismet/GameplayStatics.h"

const TCHAR* UHorizonBaseBuildingSubsystem::SaveSlot = TEXT("BridgePointHorizonBaseBuilding");

void UHorizonBaseBuildingSubsystem::Initialize(FSubsystemCollectionBase& Collection)
{
    Super::Initialize(Collection);

    if (USaveGame* Loaded = UGameplayStatics::LoadGameFromSlot(SaveSlot, 0))
    {
        State = Cast<UHorizonBaseBuildingSaveGame>(Loaded);
    }

    if (!State)
    {
        State = Cast<UHorizonBaseBuildingSaveGame>(
            UGameplayStatics::CreateSaveGameObject(UHorizonBaseBuildingSaveGame::StaticClass()));
        SaveState();
    }
}

TArray<FHorizonBasePieceState> UHorizonBaseBuildingSubsystem::GetPieces() const
{
    return State ? State->Pieces : TArray<FHorizonBasePieceState>();
}

bool UHorizonBaseBuildingSubsystem::GetPiece(
    const FString& PieceId,
    FHorizonBasePieceState& OutPiece) const
{
    const int32 Index = FindPieceIndex(PieceId);
    if (!State || Index == INDEX_NONE)
    {
        return false;
    }

    OutPiece = State->Pieces[Index];
    return true;
}

TArray<FHorizonBaseMaterialCost> UHorizonBaseBuildingSubsystem::GetPieceCost(
    EHorizonBasePieceType PieceType)
{
    TArray<FHorizonBaseMaterialCost> Cost;
    auto AddCost = [&Cost](FName ItemKey, int32 Quantity)
    {
        FHorizonBaseMaterialCost Entry;
        Entry.ItemKey = ItemKey;
        Entry.Quantity = Quantity;
        Cost.Add(Entry);
    };

    switch (PieceType)
    {
        case EHorizonBasePieceType::Foundation:
            AddCost(TEXT("wood"), 4);
            AddCost(TEXT("stone"), 2);
            break;
        case EHorizonBasePieceType::Wall:
            AddCost(TEXT("wood"), 3);
            break;
        case EHorizonBasePieceType::DoorFrame:
            AddCost(TEXT("wood"), 2);
            AddCost(TEXT("scrap_metal"), 1);
            break;
        case EHorizonBasePieceType::Stair:
            AddCost(TEXT("wood"), 4);
            break;
        case EHorizonBasePieceType::Roof:
            AddCost(TEXT("wood"), 3);
            AddCost(TEXT("cloth"), 1);
            break;
        default:
            break;
    }
    return Cost;
}

bool UHorizonBaseBuildingSubsystem::CanPlacePiece(
    const TArray<FHorizonBasePieceState>& ExistingPieces,
    EHorizonBasePieceType PieceType,
    const FTransform& WorldTransform,
    int32 PieceLimit,
    float AttachmentRange,
    float MinimumSeparation)
{
    if (PieceLimit <= 0 || ExistingPieces.Num() >= PieceLimit || WorldTransform.ContainsNaN())
    {
        return false;
    }

    const FVector Scale = WorldTransform.GetScale3D();
    if (Scale.GetAbsMin() < 0.25f || Scale.GetAbsMax() > 4.0f)
    {
        return false;
    }

    if (ExistingPieces.IsEmpty())
    {
        return PieceType == EHorizonBasePieceType::Foundation;
    }

    const FVector CandidateLocation = WorldTransform.GetLocation();
    const float MinimumSeparationSq = FMath::Square(FMath::Max(1.0f, MinimumSeparation));
    const float AttachmentRangeSq = FMath::Square(FMath::Max(MinimumSeparation, AttachmentRange));
    bool bAttached = false;

    for (const FHorizonBasePieceState& Existing : ExistingPieces)
    {
        const float DistanceSq = FVector::DistSquared(CandidateLocation, Existing.WorldTransform.GetLocation());
        if (DistanceSq < MinimumSeparationSq)
        {
            return false;
        }
        bAttached |= DistanceSq <= AttachmentRangeSq;
    }

    return bAttached;
}

bool UHorizonBaseBuildingSubsystem::TryBuildPiece(
    EHorizonBasePieceType PieceType,
    const FTransform& WorldTransform,
    FHorizonBasePieceState& OutPiece)
{
    OutPiece = FHorizonBasePieceState();

    if (!State || !CanPlacePiece(
            State->Pieces,
            PieceType,
            WorldTransform,
            MaxBasePieces,
            AttachmentRangeCm,
            MinimumPieceSeparationCm))
    {
        return false;
    }

    UHorizonSurvivalSubsystem* Survival = GetGameInstance()
        ? GetGameInstance()->GetSubsystem<UHorizonSurvivalSubsystem>()
        : nullptr;
    if (!Survival)
    {
        return false;
    }

    const TArray<FHorizonBaseMaterialCost> Cost = GetPieceCost(PieceType);
    if (Cost.IsEmpty())
    {
        return false;
    }

    TArray<FHorizonCraftingIngredient> MaterialDebit;
    MaterialDebit.Reserve(Cost.Num());
    for (const FHorizonBaseMaterialCost& Entry : Cost)
    {
        FHorizonCraftingIngredient Ingredient;
        Ingredient.ItemKey = Entry.ItemKey;
        Ingredient.Quantity = Entry.Quantity;
        MaterialDebit.Add(Ingredient);
    }

    if (!Survival->TryConsumeItemsAtomically(MaterialDebit))
    {
        return false;
    }

    OutPiece.PieceId = FGuid::NewGuid().ToString(EGuidFormats::DigitsWithHyphensLower);
    OutPiece.PieceType = PieceType;
    OutPiece.WorldTransform = WorldTransform;
    OutPiece.Durability01 = 1.0f;
    OutPiece.bFictionalGameplayConstruction = true;
    State->Pieces.Add(OutPiece);
    SaveState();
    BroadcastChanged();
    return true;
}

float UHorizonBaseBuildingSubsystem::ComputeDamagedDurability(
    float CurrentDurability01,
    float Damage01)
{
    if (!FMath::IsFinite(CurrentDurability01) || !FMath::IsFinite(Damage01) || Damage01 <= 0.0f)
    {
        return FMath::Clamp(CurrentDurability01, 0.0f, 1.0f);
    }
    return FMath::Clamp(CurrentDurability01 - Damage01, 0.0f, 1.0f);
}

float UHorizonBaseBuildingSubsystem::ComputeRepairedDurability(
    float CurrentDurability01,
    float RepairAmount01)
{
    if (!FMath::IsFinite(CurrentDurability01) || !FMath::IsFinite(RepairAmount01) || RepairAmount01 <= 0.0f)
    {
        return FMath::Clamp(CurrentDurability01, 0.0f, 1.0f);
    }
    return FMath::Clamp(CurrentDurability01 + RepairAmount01, 0.0f, 1.0f);
}

bool UHorizonBaseBuildingSubsystem::ApplyPieceDamage(
    const FString& PieceId,
    float Damage01,
    bool& bDestroyed)
{
    bDestroyed = false;
    const int32 Index = FindPieceIndex(PieceId);
    if (!State || Index == INDEX_NONE || !FMath::IsFinite(Damage01) || Damage01 <= 0.0f)
    {
        return false;
    }

    FHorizonBasePieceState& Piece = State->Pieces[Index];
    Piece.Durability01 = ComputeDamagedDurability(Piece.Durability01, Damage01);
    if (Piece.Durability01 <= 0.0f)
    {
        State->Pieces.RemoveAt(Index);
        bDestroyed = true;
    }

    SaveState();
    BroadcastChanged();
    return true;
}

bool UHorizonBaseBuildingSubsystem::TryRepairPiece(
    const FString& PieceId,
    float RepairAmount01)
{
    const int32 Index = FindPieceIndex(PieceId);
    if (!State || Index == INDEX_NONE ||
        !FMath::IsFinite(RepairAmount01) || RepairAmount01 <= 0.0f ||
        State->Pieces[Index].Durability01 >= 1.0f)
    {
        return false;
    }

    UHorizonSurvivalSubsystem* Survival = GetGameInstance()
        ? GetGameInstance()->GetSubsystem<UHorizonSurvivalSubsystem>()
        : nullptr;
    if (!Survival || Survival->GetItemQuantity(TEXT("repair_kit")) < 1 ||
        !Survival->TryRemoveItem(TEXT("repair_kit"), 1))
    {
        return false;
    }

    State->Pieces[Index].Durability01 = ComputeRepairedDurability(
        State->Pieces[Index].Durability01,
        RepairAmount01);
    SaveState();
    BroadcastChanged();
    return true;
}

int32 UHorizonBaseBuildingSubsystem::FindPieceIndex(const FString& PieceId) const
{
    if (!State || PieceId.IsEmpty())
    {
        return INDEX_NONE;
    }

    return State->Pieces.IndexOfByPredicate(
        [&PieceId](const FHorizonBasePieceState& Piece)
        {
            return Piece.PieceId == PieceId;
        });
}

void UHorizonBaseBuildingSubsystem::SaveState()
{
    if (State)
    {
        UGameplayStatics::SaveGameToSlot(State, SaveSlot, 0);
    }
}

void UHorizonBaseBuildingSubsystem::BroadcastChanged()
{
    OnBaseBuildingChanged.Broadcast();
}
