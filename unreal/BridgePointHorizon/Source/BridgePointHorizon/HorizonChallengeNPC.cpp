#include "HorizonChallengeNPC.h"

#include "Components/SceneComponent.h"
#include "Components/SphereComponent.h"
#include "Engine/GameInstance.h"
#include "Engine/World.h"

AHorizonChallengeNPC::AHorizonChallengeNPC()
{
    PrimaryActorTick.bCanEverTick = false;

    SceneRoot = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
    SetRootComponent(SceneRoot);

    InteractionSphere = CreateDefaultSubobject<USphereComponent>(TEXT("InteractionSphere"));
    InteractionSphere->SetupAttachment(SceneRoot);
    InteractionSphere->SetSphereRadius(InteractionRadiusCm);
    InteractionSphere->SetCollisionEnabled(ECollisionEnabled::QueryOnly);
    InteractionSphere->SetCollisionResponseToAllChannels(ECR_Ignore);
    InteractionSphere->SetCollisionResponseToChannel(ECC_Pawn, ECR_Overlap);
    InteractionSphere->SetGenerateOverlapEvents(true);
}

void AHorizonChallengeNPC::BeginPlay()
{
    Super::BeginPlay();

    InteractionSphere->SetSphereRadius(
        FMath::Clamp(InteractionRadiusCm, 100.0f, 800.0f));

    if (NPCSiteId.IsEmpty())
    {
        // Stable enough for placed actors; production placement can supply a source-backed site id.
        NPCSiteId = GetName();
    }
}

UHorizonChallengeDirectorSubsystem* AHorizonChallengeNPC::GetChallengeDirector() const
{
    if (const UWorld* World = GetWorld())
    {
        if (UGameInstance* GameInstance = World->GetGameInstance())
        {
            return GameInstance->GetSubsystem<UHorizonChallengeDirectorSubsystem>();
        }
    }

    return nullptr;
}

bool AHorizonChallengeNPC::CanInteract(const AActor* Interactor) const
{
    if (!Interactor)
    {
        return false;
    }

    const float Radius = FMath::Clamp(InteractionRadiusCm, 100.0f, 800.0f);
    return FVector::DistSquared(
        Interactor->GetActorLocation(),
        GetActorLocation()) <= FMath::Square(Radius);
}

bool AHorizonChallengeNPC::OfferChallenge(FHorizonChallengeRuntimeState& OutChallenge)
{
    UHorizonChallengeDirectorSubsystem* Director = GetChallengeDirector();
    return Director &&
        Director->OfferChallenge(NPCSiteId, Role, OutChallenge);
}

bool AHorizonChallengeNPC::ReportChallengeProgress(
    int32 Amount,
    FHorizonChallengeRuntimeState& OutChallenge)
{
    UHorizonChallengeDirectorSubsystem* Director = GetChallengeDirector();
    if (!Director || Amount <= 0)
    {
        return false;
    }

    FHorizonChallengeRuntimeState Current;
    if (!Director->OfferChallenge(NPCSiteId, Role, Current))
    {
        return false;
    }

    return Director->AddChallengeProgress(
        Current.ChallengeId,
        Amount,
        OutChallenge);
}

bool AHorizonChallengeNPC::ClaimChallengeReward(FHorizonChallengeReward& OutReward)
{
    UHorizonChallengeDirectorSubsystem* Director = GetChallengeDirector();
    if (!Director)
    {
        return false;
    }

    FHorizonChallengeRuntimeState Current;
    if (!Director->OfferChallenge(NPCSiteId, Role, Current))
    {
        return false;
    }

    return Director->ClaimChallengeReward(
        Current.ChallengeId,
        OutReward);
}
