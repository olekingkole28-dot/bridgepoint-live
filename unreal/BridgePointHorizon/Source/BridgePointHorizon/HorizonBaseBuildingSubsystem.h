#pragma once

#include "CoreMinimal.h"
#include "GameFramework/SaveGame.h"
#include "Subsystems/GameInstanceSubsystem.h"
#include "HorizonBaseBuildingSubsystem.generated.h"

UENUM(BlueprintType)
enum class EHorizonBasePieceType : uint8
{
    Foundation,
    Wall,
    DoorFrame,
    Stair,
    Roof
};

USTRUCT(BlueprintType)
struct FHorizonBaseMaterialCost
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    FName ItemKey = NAME_None;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, meta=(ClampMin="1"))
    int32 Quantity = 1;
};

USTRUCT(BlueprintType)
struct FHorizonBasePieceState
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadOnly)
    FString PieceId;

    UPROPERTY(BlueprintReadOnly)
    EHorizonBasePieceType PieceType = EHorizonBasePieceType::Foundation;

    UPROPERTY(BlueprintReadOnly)
    FTransform WorldTransform = FTransform::Identity;

    UPROPERTY(BlueprintReadOnly)
    float Durability01 = 1.0f;

    UPROPERTY(BlueprintReadOnly)
    bool bFictionalGameplayConstruction = true;
};

UCLASS()
class BRIDGEPOINTHORIZON_API UHorizonBaseBuildingSaveGame : public USaveGame
{
    GENERATED_BODY()

public:
    UPROPERTY()
    TArray<FHorizonBasePieceState> Pieces;
};

DECLARE_DYNAMIC_MULTICAST_DELEGATE(FHorizonBaseBuildingChanged);

UCLASS()
class BRIDGEPOINTHORIZON_API UHorizonBaseBuildingSubsystem : public UGameInstanceSubsystem
{
    GENERATED_BODY()

public:
    virtual void Initialize(FSubsystemCollectionBase& Collection) override;

    UPROPERTY(BlueprintAssignable)
    FHorizonBaseBuildingChanged OnBaseBuildingChanged;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Horizon|Base", meta=(ClampMin="1", ClampMax="512"))
    int32 MaxBasePieces = 512;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Horizon|Base", meta=(ClampMin="100.0", ClampMax="1200.0"))
    float AttachmentRangeCm = 650.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Horizon|Base", meta=(ClampMin="10.0", ClampMax="200.0"))
    float MinimumPieceSeparationCm = 50.0f;

    UFUNCTION(BlueprintPure, Category="Horizon|Base")
    TArray<FHorizonBasePieceState> GetPieces() const;

    UFUNCTION(BlueprintPure, Category="Horizon|Base")
    bool GetPiece(const FString& PieceId, FHorizonBasePieceState& OutPiece) const;

    UFUNCTION(BlueprintCallable, Category="Horizon|Base")
    bool TryBuildPiece(
        EHorizonBasePieceType PieceType,
        const FTransform& WorldTransform,
        FHorizonBasePieceState& OutPiece);

    UFUNCTION(BlueprintCallable, Category="Horizon|Base")
    bool ApplyPieceDamage(const FString& PieceId, float Damage01, bool& bDestroyed);

    UFUNCTION(BlueprintCallable, Category="Horizon|Base")
    bool TryRepairPiece(const FString& PieceId, float RepairAmount01 = 0.35f);

    UFUNCTION(BlueprintPure, Category="Horizon|Base")
    static TArray<FHorizonBaseMaterialCost> GetPieceCost(EHorizonBasePieceType PieceType);

    static bool CanPlacePiece(
        const TArray<FHorizonBasePieceState>& ExistingPieces,
        EHorizonBasePieceType PieceType,
        const FTransform& WorldTransform,
        int32 PieceLimit = 512,
        float AttachmentRange = 650.0f,
        float MinimumSeparation = 50.0f);

    static float ComputeDamagedDurability(float CurrentDurability01, float Damage01);
    static float ComputeRepairedDurability(float CurrentDurability01, float RepairAmount01);

private:
    static const TCHAR* SaveSlot;

    UPROPERTY()
    TObjectPtr<UHorizonBaseBuildingSaveGame> State;

    int32 FindPieceIndex(const FString& PieceId) const;
    void SaveState();
    void BroadcastChanged();
};
