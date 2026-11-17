#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "Engine/StreamableManager.h"
#include "BPModularCharacterComponent.generated.h"

class USkeletalMesh;
class USkeletalMeshComponent;
class UMaterialInterface;

USTRUCT(BlueprintType)
struct FBPCharacterPartDefinition
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadWrite) FName Slot = NAME_None;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) TSoftObjectPtr<USkeletalMesh> Mesh;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) TArray<TSoftObjectPtr<UMaterialInterface>> Materials;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) FName AttachSocket = NAME_None;
};

UCLASS(ClassGroup=(BridgePoint), meta=(BlueprintSpawnableComponent))
class BRIDGEPOINTEARTH_API UBPModularCharacterComponent : public UActorComponent
{
    GENERATED_BODY()

public:
    UBPModularCharacterComponent();

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="BridgePoint|Character")
    TObjectPtr<USkeletalMeshComponent> MasterPoseMesh;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="BridgePoint|Character")
    TArray<FBPCharacterPartDefinition> CharacterParts;

    UFUNCTION(BlueprintCallable, Category="BridgePoint|Character")
    bool ApplyCharacterParts();

    UFUNCTION(BlueprintCallable, Category="BridgePoint|Character")
    bool LoadCharacterPartsFromJson(const FString& JsonArray);

    UFUNCTION(BlueprintCallable, Category="BridgePoint|Character")
    void ClearCharacterParts();

    UFUNCTION(BlueprintPure, Category="BridgePoint|Character")
    USkeletalMeshComponent* GetPart(FName Slot) const;

private:
    UPROPERTY(Transient)
    TMap<FName, TObjectPtr<USkeletalMeshComponent>> ActiveParts;

    USkeletalMeshComponent* ResolveMasterMesh() const;
};