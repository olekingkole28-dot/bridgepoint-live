#include "BPWorldPartitionAnchor.h"
#include "Components/WorldPartitionStreamingSourceComponent.h"
#include "Components/SceneComponent.h"

ABPWorldPartitionAnchor::ABPWorldPartitionAnchor()
{
    PrimaryActorTick.bCanEverTick = true;
    StreamingSource = CreateDefaultSubobject<UWorldPartitionStreamingSourceComponent>(TEXT("WorldPartitionSource"));
    SetRootComponent(CreateDefaultSubobject<USceneComponent>(TEXT("Root")));
    StreamingSource->SetupAttachment(GetRootComponent());
    StreamingSource->EnableStreamingSource();
}

void ABPWorldPartitionAnchor::Tick(float DeltaSeconds)
{
    Super::Tick(DeltaSeconds);
    if (AActor* Target=FollowTarget.Get())
        SetActorLocation(Target->GetActorLocation());
}

void ABPWorldPartitionAnchor::FollowActor(AActor* Target)
{
    FollowTarget=Target;
    if (Target) SetActorLocation(Target->GetActorLocation());
}

void ABPWorldPartitionAnchor::SetStreamingEnabled(bool bEnabled)
{
    if (!StreamingSource) return;
    if (bEnabled) StreamingSource->EnableStreamingSource();
    else StreamingSource->DisableStreamingSource();
}