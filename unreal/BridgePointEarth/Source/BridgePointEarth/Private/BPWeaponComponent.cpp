#include "BPWeaponComponent.h"
#include "BPGeoTileProxyActor.h"
#include "Camera/CameraComponent.h"
#include "Components/AudioComponent.h"
#include "GameFramework/Character.h"
#include "GameFramework/PlayerController.h"
#include "Kismet/GameplayStatics.h"
#include "Sound/SoundBase.h"
#include "Engine/World.h"

UBPWeaponComponent::UBPWeaponComponent()
{
    PrimaryComponentTick.bCanEverTick = true;
}

void UBPWeaponComponent::SetAiming(bool bInAiming)
{
    bAiming = bInAiming;
}

UCameraComponent* UBPWeaponComponent::ResolveCamera() const
{
    if (AimCamera) return AimCamera;
    return GetOwner() ? GetOwner()->FindComponentByClass<UCameraComponent>() : nullptr;
}

FVector UBPWeaponComponent::GetMuzzleLocation() const
{
    if (ACharacter* Character = Cast<ACharacter>(GetOwner()))
    {
        if (USkeletalMeshComponent* Mesh = Character->GetMesh())
        {
            if (Mesh->DoesSocketExist(MuzzleSocket)) return Mesh->GetSocketLocation(MuzzleSocket);
        }
    }
    if (UCameraComponent* Camera = ResolveCamera()) return Camera->GetComponentLocation();
    return GetOwner() ? GetOwner()->GetActorLocation() : FVector::ZeroVector;
}

void UBPWeaponComponent::ApplyRecoil()
{
    ACharacter* Character = Cast<ACharacter>(GetOwner());
    AController* Controller = Character ? Character->GetController() : nullptr;
    if (!Controller) return;
    const float Sign = FMath::RandBool() ? 1.0f : -1.0f;
    Controller->AddPitchInput(-RecoilPitchDegrees);
    Controller->AddYawInput(Sign * RecoilYawDegrees);
}

void UBPWeaponComponent::PlayImpactAudio(const FHitResult& Hit, EPhysicalSurface Surface)
{
    if (!MetaSoundImpact || !GetWorld()) return;
    UAudioComponent* Audio = UGameplayStatics::SpawnSoundAtLocation(
        GetWorld(), MetaSoundImpact, Hit.ImpactPoint, Hit.ImpactNormal.Rotation());
    if (!Audio) return;
    Audio->SetFloatParameter(SurfaceParameter, static_cast<float>(Surface));
    Audio->SetFloatParameter(ImpactIntensityParameter, FMath::Clamp(Hit.Distance / FMath::Max(1.0f, AimRangeMeters * 100.0f), 0.05f, 1.0f));
}

bool UBPWeaponComponent::Fire()
{
    UWorld* World = GetWorld();
    UCameraComponent* Camera = ResolveCamera();
    if (!World || !Camera || World->GetTimeSeconds() - LastFireTime < FireIntervalSeconds) return false;
    LastFireTime = World->GetTimeSeconds();

    const FVector CameraOrigin = Camera->GetComponentLocation();
    const FVector CameraDirection = Camera->GetForwardVector();
    const float RangeCm = AimRangeMeters * 100.0f;
    FCollisionQueryParams Params(SCENE_QUERY_STAT(BridgePointWeaponTrace), true, GetOwner());
    Params.bReturnPhysicalMaterial = true;

    // First trace identifies the screen-space aim point. The shot then originates at the muzzle,
    // so nearby walls/cover correctly block a barrel that is not aligned with the camera.
    FHitResult AimHit;
    World->LineTraceSingleByChannel(AimHit, CameraOrigin, CameraOrigin + CameraDirection * RangeCm, ECC_Visibility, Params);
    const FVector AimPoint = AimHit.bBlockingHit ? AimHit.ImpactPoint : CameraOrigin + CameraDirection * RangeCm;

    FVector ShotDirection = (AimPoint - GetMuzzleLocation()).GetSafeNormal();
    const float Spread = FMath::DegreesToRadians(bAiming ? AimSpreadDegrees : HipSpreadDegrees);
    ShotDirection = FMath::VRandCone(ShotDirection, Spread, Spread).GetSafeNormal();

    FHitResult Hit;
    const FVector Muzzle = GetMuzzleLocation();
    const bool bHit = World->LineTraceSingleByChannel(Hit, Muzzle, Muzzle + ShotDirection * RangeCm, ECC_Visibility, Params);
    ApplyRecoil();

    if (!bHit) return true;
    const EPhysicalSurface Surface = UPhysicalMaterial::DetermineSurfaceType(Hit.PhysMaterial.Get());

    FBPWeaponHitData Data;
    Data.Hit = Hit;
    Data.HitActor = Hit.GetActor();
    Data.SurfaceType = Surface;
    Data.SurfaceName = UEnum::GetValueAsName(Surface);
    Data.ImpactPoint = Hit.ImpactPoint;
    Data.ImpactNormal = Hit.ImpactNormal;
    OnWeaponHit.Broadcast(Data);

    if (ABPGeoTileProxyActor* TileActor = Cast<ABPGeoTileProxyActor>(Hit.GetActor()))
        TileActor->NotifyTileImpact(Hit);

    PlayImpactAudio(Hit, Surface);
    return true;
}