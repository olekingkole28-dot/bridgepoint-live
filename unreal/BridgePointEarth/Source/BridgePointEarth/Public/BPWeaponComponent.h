#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "PhysicalMaterials/PhysicalMaterial.h"
#include "BPWeaponComponent.generated.h"

class UCameraComponent;
class UAudioComponent;
class USoundBase;
class UTextureRenderTarget2D;

USTRUCT(BlueprintType)
struct FBPWeaponHitData
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadOnly) FHitResult Hit;
    UPROPERTY(BlueprintReadOnly) TObjectPtr<AActor> HitActor = nullptr;
    UPROPERTY(BlueprintReadOnly) FName SurfaceName = NAME_None;
    UPROPERTY(BlueprintReadOnly) TEnumAsByte<EPhysicalSurface> SurfaceType = SurfaceType_Default;
    UPROPERTY(BlueprintReadOnly) FVector ImpactPoint = FVector::ZeroVector;
    UPROPERTY(BlueprintReadOnly) FVector ImpactNormal = FVector::UpVector;
};

DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FBPWeaponHitEvent, const FBPWeaponHitData&, HitData);

UCLASS(ClassGroup=(BridgePoint), meta=(BlueprintSpawnableComponent))
class BRIDGEPOINT_EARTH_API UBPWeaponComponent : public UActorComponent
{
    GENERATED_BODY()

public:
    UBPWeaponComponent();

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Weapon|Aim")
    TObjectPtr<UCameraComponent> AimCamera;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Weapon|Aim")
    FName MuzzleSocket = TEXT("Muzzle");

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Weapon|Aim")
    float AimRangeMeters = 500.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Weapon|Aim", meta=(ClampMin="0.0", ClampMax="10.0"))
    float HipSpreadDegrees = 1.2f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Weapon|Aim", meta=(ClampMin="0.0", ClampMax="10.0"))
    float AimSpreadDegrees = 0.15f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Weapon|Recoil")
    float RecoilPitchDegrees = 0.9f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Weapon|Recoil")
    float RecoilYawDegrees = 0.25f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Weapon|Recoil")
    float RecoilRecoverySpeed = 8.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Weapon|Fire")
    float FireIntervalSeconds = 0.12f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Weapon|Audio")
    TObjectPtr<USoundBase> MetaSoundImpact = nullptr;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Weapon|Audio")
    FName SurfaceParameter = TEXT("SurfaceType");

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Weapon|Audio")
    FName ImpactIntensityParameter = TEXT("ImpactIntensity");

    UPROPERTY(BlueprintAssignable, Category="Weapon|Events")
    FBPWeaponHitEvent OnWeaponHit;

    UFUNCTION(BlueprintCallable, Category="Weapon|Aim")
    void SetAiming(bool bInAiming);

    UFUNCTION(BlueprintCallable, Category="Weapon|Fire")
    bool Fire();

    UFUNCTION(BlueprintPure, Category="Weapon|Aim")
    bool IsAiming() const { return bAiming; }

private:
    bool bAiming = false;
    float LastFireTime = -1000.0f;
    float CurrentRecoilPitch = 0.0f;
    float CurrentRecoilYaw = 0.0f;

    UCameraComponent* ResolveCamera() const;
    FVector GetMuzzleLocation() const;
    void ApplyRecoil();
    void PlayImpactAudio(const FHitResult& Hit, EPhysicalSurface Surface);
};