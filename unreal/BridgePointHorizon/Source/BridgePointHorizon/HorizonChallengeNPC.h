#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "HorizonChallengeDirectorSubsystem.h"
#include "HorizonChallengeNPC.generated.h"

class USceneComponent;
class USphereComponent;

UCLASS(BlueprintType)
class BRIDGEPOINTHORIZON_API AHorizonChallengeNPC : public AActor
{
    GENERATED_BODY()

public:
    AHorizonChallengeNPC();

    virtual void BeginPlay() override;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category="Horizon|NPC")
    TObjectPtr<USceneComponent> SceneRoot;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category="Horizon|NPC")
    TObjectPtr<USphereComponent> InteractionSphere;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Horizon|NPC")
    FString NPCSiteId;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Horizon|NPC")
    EHorizonChallengeNPCRole Role = EHorizonChallengeNPCRole::FieldMedic;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Horizon|NPC", meta=(ClampMin="100.0", ClampMax="800.0"))
    float InteractionRadiusCm = 240.0f;

    UFUNCTION(BlueprintPure, Category="Horizon|NPC")
    bool CanInteract(const AActor* Interactor) const;

    UFUNCTION(BlueprintCallable, Category="Horizon|NPC")
    bool OfferChallenge(FHorizonChallengeRuntimeState& OutChallenge);

    UFUNCTION(BlueprintCallable, Category="Horizon|NPC")
    bool ReportChallengeProgress(int32 Amount, FHorizonChallengeRuntimeState& OutChallenge);

    UFUNCTION(BlueprintCallable, Category="Horizon|NPC")
    bool ClaimChallengeReward(FHorizonChallengeReward& OutReward);

private:
    class UHorizonChallengeDirectorSubsystem* GetChallengeDirector() const;
};
