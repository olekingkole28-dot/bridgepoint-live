#pragma once

#include "CoreMinimal.h"
#include "Subsystems/GameInstanceSubsystem.h"
#include "HorizonArenaDirectorSubsystem.generated.h"

USTRUCT(BlueprintType)
struct FHorizonArenaCandidate
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    FString ArenaId;

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    FString DisplayName;

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    FString RegionCode;

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    double Latitude = 0.0;

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    double Longitude = 0.0;

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    float DensityScore = 0.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    float ElevationScore = 0.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    float VerticalityScore = 0.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    float RooftopScore = 0.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    float WaterfrontScore = 0.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    float BridgeScore = 0.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    float InteriorScore = 0.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    float CoverScore = 0.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    float StreamReadiness = 1.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    bool bAllowedForTDM = true;
};

UCLASS()
class BRIDGEPOINTHORIZON_API UHorizonArenaDirectorSubsystem : public UGameInstanceSubsystem
{
    GENERATED_BODY()

public:
    virtual void Initialize(FSubsystemCollectionBase& Collection) override;

    UFUNCTION(BlueprintCallable, Category="Horizon|Arena")
    void SetCandidates(const TArray<FHorizonArenaCandidate>& InCandidates);

    UFUNCTION(BlueprintCallable, Category="Horizon|Arena")
    FHorizonArenaCandidate SelectNextArena(int32 Seed = 0);

    UFUNCTION(BlueprintPure, Category="Horizon|Arena")
    float ScoreArena(const FHorizonArenaCandidate& Candidate) const;

    UFUNCTION(BlueprintPure, Category="Horizon|Arena")
    TArray<FHorizonArenaCandidate> GetRankedArenas(int32 MaxCount = 12) const;

    UFUNCTION(BlueprintPure, Category="Horizon|Arena")
    const TArray<FHorizonArenaCandidate>& GetCandidates() const { return Candidates; }

private:
    UPROPERTY()
    TArray<FHorizonArenaCandidate> Candidates;

    UPROPERTY()
    FString LastArenaId;

    int32 RotationCounter = 0;

    void SeedFallbackArenas();
};
