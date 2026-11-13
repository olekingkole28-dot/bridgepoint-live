#include "BPModularCharacterComponent.h"
#include "Components/SkeletalMeshComponent.h"
#include "GameFramework/Character.h"
#include "Engine/SkeletalMesh.h"
#include "Materials/MaterialInterface.h"
#include "Dom/JsonObject.h"
#include "Serialization/JsonReader.h"
#include "Serialization/JsonSerializer.h"

UBPModularCharacterComponent::UBPModularCharacterComponent()
{
    PrimaryComponentTick.bCanEverTick = false;
}

USkeletalMeshComponent* UBPModularCharacterComponent::ResolveMasterMesh() const
{
    if (MasterPoseMesh) return MasterPoseMesh;
    if (const ACharacter* Character=Cast<ACharacter>(GetOwner())) return Character->GetMesh();
    return GetOwner() ? GetOwner()->FindComponentByClass<USkeletalMeshComponent>() : nullptr;
}

void UBPModularCharacterComponent::ClearCharacterParts()
{
    for (TPair<FName,TObjectPtr<USkeletalMeshComponent>>& Pair:ActiveParts)
        if (Pair.Value) Pair.Value->DestroyComponent();
    ActiveParts.Reset();
}

USkeletalMeshComponent* UBPModularCharacterComponent::GetPart(FName Slot) const
{
    const TObjectPtr<USkeletalMeshComponent>* Found=ActiveParts.Find(Slot);
    return Found ? Found->Get() : nullptr;
}

bool UBPModularCharacterComponent::ApplyCharacterParts()
{
    USkeletalMeshComponent* Master=ResolveMasterMesh();
    if (!Master || !Master->GetSkeletalMesh()) return false;
    ClearCharacterParts();

    for (const FBPCharacterPartDefinition& Definition:CharacterParts)
    {
        if (Definition.Slot.IsNone() || Definition.Mesh.IsNull()) continue;
        USkeletalMesh* Mesh=Definition.Mesh.LoadSynchronous();
        if (!Mesh) continue;

        USkeletalMeshComponent* Part=NewObject<USkeletalMeshComponent>(GetOwner(),
            MakeUniqueObjectName(GetOwner(),USkeletalMeshComponent::StaticClass(),Definition.Slot));
        if (!Part) continue;
        Part->SetSkeletalMesh(Mesh);
        Part->SetCollisionEnabled(ECollisionEnabled::NoCollision);
        Part->SetGenerateOverlapEvents(false);
        Part->SetupAttachment(Master,Definition.AttachSocket);
        Part->SetLeaderPoseComponent(Master,true);
        for (int32 I=0;I<Definition.Materials.Num();++I)
            if (UMaterialInterface* Material=Definition.Materials[I].LoadSynchronous())
                Part->SetMaterial(I,Material);
        Part->RegisterComponent();
        ActiveParts.Add(Definition.Slot,Part);
    }
    return ActiveParts.Num()>0;
}

bool UBPModularCharacterComponent::LoadCharacterPartsFromJson(const FString& JsonArray)
{
    TSharedPtr<FJsonValue> Root;
    TSharedRef<TJsonReader<>> Reader=TJsonReaderFactory<>::Create(JsonArray);
    if (!FJsonSerializer::Deserialize(Reader,Root) || !Root.IsValid() || Root->Type!=EJson::Array) return false;

    TArray<FBPCharacterPartDefinition> Parsed;
    for (const TSharedPtr<FJsonValue>& Value:Root->AsArray())
    {
        if (!Value.IsValid() || Value->Type!=EJson::Object) continue;
        const TSharedPtr<FJsonObject> Object=Value->AsObject();
        if (!Object.IsValid()) continue;
        FBPCharacterPartDefinition Definition;
        FString Slot,MeshPath,Socket;
        Object->TryGetStringField(TEXT("slot"),Slot);
        Object->TryGetStringField(TEXT("mesh"),MeshPath);
        Definition.Slot=FName(*Slot);
        if (MeshPath.IsEmpty()) continue;
        Definition.Mesh=TSoftObjectPtr<USkeletalMesh>(FSoftObjectPath(MeshPath));
        Object->TryGetStringField(TEXT("socket"),Socket);
        Definition.AttachSocket=FName(*Socket);

        const TArray<TSharedPtr<FJsonValue>>* MaterialArray=nullptr;
        if (Object->TryGetArrayField(TEXT("materials"),MaterialArray) && MaterialArray)
        {
            for (const TSharedPtr<FJsonValue>& MaterialValue:*MaterialArray)
            {
                if (MaterialValue.IsValid() && MaterialValue->Type==EJson::String)
                    Definition.Materials.Add(TSoftObjectPtr<UMaterialInterface>(FSoftObjectPath(MaterialValue->AsString())));
            }
        }
        Parsed.Add(MoveTemp(Definition));
    }
    if (Parsed.IsEmpty()) return false;
    CharacterParts=MoveTemp(Parsed);
    return ApplyCharacterParts();
}