#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "PhysicalMaterials/PhysicalMaterial.h"
#include "BPWeaponComponent.generated.h"

class UCameraComponent;
class USkeletalMeshComponent;
class USceneCaptureComponent2D;
class UAudioComponent;
class USoundBase;
class UTextureRenderTarget2D;
class UAnimMontage;
class UCurveFloat;

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
DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FBPWeaponAmmoChanged, int32, MagazineAmmo, int32, ReserveAmmo);

UCLASS(ClassGroup=(BridgePoint), meta=(BlueprintSpawnableComponent))
class BRIDGEPOINTEARTH_API UBPWeaponComponent : public UActorComponent
{
    GENERATED_BODY()

public:
    UBPWeaponComponent();
    virtual void BeginPlay() override;
    virtual void TickComponent(float DeltaTime, ELevelTick TickType, FActorComponentTickFunction* ThisTickFunction) override;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Weapon|Aim")
    TObjectPtr<UCameraComponent> AimCamera;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Weapon|Aim")
    TObjectPtr<USkeletalMeshComponent> WeaponMesh;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Weapon|Aim")
    FName SightSocket = TEXT("Sight");

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Weapon|Aim")
    TObjectPtr<UCurveFloat> ADSCurve;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Weapon|Aim")
    float ADSInterpolationSpeed = 12.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Weapon|Scope")
    bool bScopeEnabled = false;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Weapon|Scope")
    float ScopeZoomFactor = 4.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Weapon|Scope")
    TObjectPtr<USceneCaptureComponent2D> ScopeCapture;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Weapon|Scope")
    TObjectPtr<UTextureRenderTarget2D> ScopeRenderTarget;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Weapon|Reload")
    int32 MagazineCapacity = 30;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Weapon|Reload")
    int32 CurrentAmmo = 30;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Weapon|Reload")
    int32 ReserveAmmo = 120;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Weapon|Reload")
    float ReloadDurationSeconds = 1.8f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Weapon|Reload")
    TObjectPtr<UAnimMontage> ReloadMontage;

    UPROPERTY(BlueprintReadOnly, Category="Weapon|Reload")
    bool bReloading = false;

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

    UPROPERTY(BlueprintAssignable, Category="Weapon|Events")
    FBPWeaponAmmoChanged OnAmmoChanged;

    UFUNCTION(BlueprintCallable, Category="Weapon|Aim")
    void SetAiming(bool bInAiming);

    UFUNCTION(BlueprintCallable, Category="Weapon|Fire")
    bool Fire();

    UFUNCTION(BlueprintCallable, Category="Weapon|Reload")
    bool Reload();

    UFUNCTION(BlueprintCallable, Category="Weapon|Sway")
    void AddLookInput(const FVector2D& LookDelta);

    UFUNCTION(BlueprintCallable, Category="Weapon|Sway")
    void SetLocomotionState(bool bSprinting, bool bCrouching, bool bProne);

    UFUNCTION(BlueprintPure, Category="Weapon|Aim")
    bool IsAiming() const { return bAiming; }

private:
    bool bAiming = false;
    float AimAlpha = 0.0f;
    float TargetAimAlpha = 0.0f;
    float LastFireTime = -1000.0f;
    float CurrentRecoilPitch = 0.0f;
    float CurrentRecoilYaw = 0.0f;
    FVector2D SwayTarget = FVector2D::ZeroVector;
    FVector2D SwayCurrent = FVector2D::ZeroVector;
    float LocomotionSwayScale = 1.0f;
    FTransform HipRelativeTransform = FTransform::Identity;
    bool bHasCapturedHipTransform = false;
    FTimerHandle ReloadTimer;

    void CompleteReload();
    void UpdateWeaponPose(float DeltaTime);
    void UpdateScopeCapture();
    UCameraComponent* ResolveCamera() const;
    FVector GetMuzzleLocation() const;
    void ApplyRecoil();
    void PlayImpactAudio(const FHitResult& Hit, EPhysicalSurface Surface);
};