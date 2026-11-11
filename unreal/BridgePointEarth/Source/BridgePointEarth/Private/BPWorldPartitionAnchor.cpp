#include "BPWorldPartitionAnchor.h"
#include "Components/WorldPartitionStreamingSourceComponent.h"

ABPWorldPartitionAnchor::ABPWorldPartitionAnchor()
{
    PrimaryActorTick.bCanEverTick = false;
    StreamingSource = CreateDefaultSubobject<UWorldPartitionStreamingSourceComponent>(TEXT("WorldPartitionSource"));
    SetRootComponent(CreateDefaultSubobject<USceneComponent>(TEXT("Root")));
    StreamingSource->SetupAttachment(GetRootComponent());
    StreamingSource->EnableStreamingSource();
}

void ABPWorldPartitionAnchor::FollowActor(AActor* Target)
{
    if (Target) SetActorLocation(Target->GetActorLocation());
}

void ABPWorldPartitionAnchor::SetStreamingEnabled(bool bEnabled)
{
    if (!StreamingSource) return;
    if (bEnabled) StreamingSource->EnableStreamingSource();
    else StreamingSource->DisableStreamingSource();
}