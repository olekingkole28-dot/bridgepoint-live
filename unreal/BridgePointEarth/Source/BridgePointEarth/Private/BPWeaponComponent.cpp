#include "BPWeaponComponent.h"
#include "BPGeoTileProxyActor.h"
#include "Camera/CameraComponent.h"
#include "Components/AudioComponent.h"
#include "Components/SceneCaptureComponent2D.h"
#include "Components/SkeletalMeshComponent.h"
#include "Components/SceneCaptureComponent2D.h"
#include "GameFramework/Character.h"
#include "GameFramework/PlayerController.h"
#include "Kismet/GameplayStatics.h"
#include "Sound/SoundBase.h"
#include "Engine/World.h"
#include "Engine/TextureRenderTarget2D.h"
#include "Animation/AnimInstance.h"
#include "Animation/AnimMontage.h"
#include "Curves/CurveFloat.h"
#include "TimerManager.h"

UBPWeaponComponent::UBPWeaponComponent()
{
    PrimaryComponentTick.bCanEverTick = true;
}

void UBPWeaponComponent::BeginPlay()
{
    Super::BeginPlay();
    MagazineCapacity=FMath::Max(1,MagazineCapacity);
    CurrentAmmo=FMath::Clamp(CurrentAmmo,0,MagazineCapacity);
    ReserveAmmo=FMath::Max(0,ReserveAmmo);
    if(WeaponMesh)
    {
        HipRelativeTransform=WeaponMesh->GetRelativeTransform();
        bHasCapturedHipTransform=true;
    }
    UpdateScopeCapture();
    OnAmmoChanged.Broadcast(CurrentAmmo,ReserveAmmo);
}

void UBPWeaponComponent::TickComponent(float DeltaTime, ELevelTick TickType, FActorComponentTickFunction* ThisTickFunction)
{
    Super::TickComponent(DeltaTime,TickType,ThisTickFunction);

    ACharacter* Character=Cast<ACharacter>(GetOwner());
    AController* Controller=Character ? Character->GetController() : nullptr;
    if(Controller)
    {
        const float NewPitch=FMath::FInterpTo(CurrentRecoilPitch,0.0f,DeltaTime,FMath::Max(0.1f,RecoilRecoverySpeed));
        const float NewYaw=FMath::FInterpTo(CurrentRecoilYaw,0.0f,DeltaTime,FMath::Max(0.1f,RecoilRecoverySpeed));
        Controller->AddPitchInput(NewPitch-CurrentRecoilPitch);
        Controller->AddYawInput(NewYaw-CurrentRecoilYaw);
        CurrentRecoilPitch=NewPitch;
        CurrentRecoilYaw=NewYaw;
    }

    AimAlpha=FMath::FInterpTo(AimAlpha,TargetAimAlpha,DeltaTime,FMath::Max(0.1f,ADSInterpolationSpeed));
    SwayTarget=FMath::Vector2DInterpTo(SwayTarget,FVector2D::ZeroVector,DeltaTime,5.0f);
    SwayCurrent=FMath::Vector2DInterpTo(SwayCurrent,SwayTarget,DeltaTime,12.0f);
    UpdateWeaponPose(DeltaTime);
    UpdateScopeCapture();
}

void UBPWeaponComponent::SetAiming(bool bInAiming)
{
    bAiming=bInAiming;
    TargetAimAlpha=bAiming?1.0f:0.0f;
    UpdateScopeCapture();
}

void UBPWeaponComponent::AddLookInput(const FVector2D& LookDelta)
{
    SwayTarget.X=FMath::Clamp(SwayTarget.X+LookDelta.X*0.012f,-1.0f,1.0f);
    SwayTarget.Y=FMath::Clamp(SwayTarget.Y+LookDelta.Y*0.012f,-1.0f,1.0f);
}

void UBPWeaponComponent::SetLocomotionState(bool bSprinting,bool bCrouching,bool bProne)
{
    LocomotionSwayScale=bSprinting?1.55f:(bProne?0.4f:(bCrouching?0.7f:1.0f));
}

void UBPWeaponComponent::UpdateWeaponPose(float DeltaTime)
{
    if(!WeaponMesh || !bHasCapturedHipTransform)return;
    UCameraComponent* Camera=ResolveCamera();
    AActor* Owner=GetOwner();
    if(!Camera || !Owner)return;

    USceneComponent* Parent=WeaponMesh->GetAttachParent();
    const FTransform ParentWorld=Parent?Parent->GetComponentTransform():Owner->GetActorTransform();
    const FTransform HipWorld=HipRelativeTransform*ParentWorld;

    FTransform ADSWorld=HipWorld;
    if(WeaponMesh->DoesSocketExist(SightSocket))
    {
        const FTransform SightInMesh=WeaponMesh->GetSocketTransform(SightSocket,RTS_Component);
        ADSWorld=SightInMesh.Inverse()*Camera->GetComponentTransform();
    }

    const float CurveAlpha=ADSCurve?FMath::Clamp(ADSCurve->GetFloatValue(AimAlpha),0.0f,1.0f):AimAlpha;
    FTransform DesiredWorld;
    DesiredWorld.Blend(HipWorld,ADSWorld,CurveAlpha);

    const float SwayScale=LocomotionSwayScale*(bAiming?0.35f:1.0f);
    const FRotator SwayRotation(
        -SwayCurrent.Y*2.2f*SwayScale,
        SwayCurrent.X*2.0f*SwayScale,
        -SwayCurrent.X*1.3f*SwayScale);
    DesiredWorld.ConcatenateRotation(SwayRotation.Quaternion());
    DesiredWorld.AddToTranslation(
        Camera->GetRightVector()*SwayCurrent.X*1.4f*SwayScale+
        Camera->GetUpVector()*SwayCurrent.Y*1.1f*SwayScale);
    WeaponMesh->SetWorldTransform(DesiredWorld);
}

void UBPWeaponComponent::UpdateScopeCapture()
{
    if(!ScopeCapture)return;
    const bool bCapture=bAiming && bScopeEnabled && ScopeRenderTarget;
    ScopeCapture->TextureTarget=ScopeRenderTarget;
    if(UCameraComponent* Camera=ResolveCamera())
    {
        ScopeCapture->SetWorldTransform(Camera->GetComponentTransform());
        ScopeCapture->FOVAngle=FMath::Clamp(Camera->FieldOfView/FMath::Max(1.0f,ScopeZoomFactor),5.0f,90.0f);
    }
    ScopeCapture->bCaptureEveryFrame=bCapture;
    ScopeCapture->bCaptureOnMovement=bCapture;
    ScopeCapture->SetActive(bCapture);
}

bool UBPWeaponComponent::Reload()
{
    UWorld* World=GetWorld();
    if(!World || bReloading || CurrentAmmo>=MagazineCapacity || ReserveAmmo<=0)return false;
    bReloading=true;

    if(ReloadMontage)
        if(ACharacter* Character=Cast<ACharacter>(GetOwner()))
            if(USkeletalMeshComponent* Mesh=Character->GetMesh())
                if(UAnimInstance* Anim=Mesh->GetAnimInstance())
                    Anim->Montage_Play(ReloadMontage);

    World->GetTimerManager().SetTimer(ReloadTimer,this,&UBPWeaponComponent::CompleteReload,
                                      FMath::Max(0.05f,ReloadDurationSeconds),false);
    return true;
}

void UBPWeaponComponent::CompleteReload()
{
    const int32 Needed=FMath::Max(0,MagazineCapacity-CurrentAmmo);
    const int32 Loaded=FMath::Min(Needed,ReserveAmmo);
    CurrentAmmo+=Loaded;
    ReserveAmmo-=Loaded;
    bReloading=false;
    OnAmmoChanged.Broadcast(CurrentAmmo,ReserveAmmo);
}

UCameraComponent* UBPWeaponComponent::ResolveCamera() const
{
    if(AimCamera)return AimCamera;
    return GetOwner()?GetOwner()->FindComponentByClass<UCameraComponent>():nullptr;
}

FVector UBPWeaponComponent::GetMuzzleLocation() const
{
    if(WeaponMesh && WeaponMesh->DoesSocketExist(MuzzleSocket))
        return WeaponMesh->GetSocketLocation(MuzzleSocket);
    if(ACharacter* Character=Cast<ACharacter>(GetOwner()))
    {
        if(USkeletalMeshComponent* Mesh=Character->GetMesh())
            if(Mesh->DoesSocketExist(MuzzleSocket))return Mesh->GetSocketLocation(MuzzleSocket);
    }
    if(UCameraComponent* Camera=ResolveCamera())return Camera->GetComponentLocation();
    return GetOwner()?GetOwner()->GetActorLocation():FVector::ZeroVector;
}

void UBPWeaponComponent::ApplyRecoil()
{
    ACharacter* Character=Cast<ACharacter>(GetOwner());
    AController* Controller=Character?Character->GetController():nullptr;
    if(!Controller)return;
    const float Sign=FMath::RandBool()?1.0f:-1.0f;
    const float PitchImpulse=-RecoilPitchDegrees;
    const float YawImpulse=Sign*RecoilYawDegrees;
    Controller->AddPitchInput(PitchImpulse);
    Controller->AddYawInput(YawImpulse);
    CurrentRecoilPitch=FMath::Clamp(CurrentRecoilPitch+PitchImpulse,-30.0f,30.0f);
    CurrentRecoilYaw=FMath::Clamp(CurrentRecoilYaw+YawImpulse,-30.0f,30.0f);
}

void UBPWeaponComponent::PlayImpactAudio(const FHitResult& Hit,EPhysicalSurface Surface)
{
    if(!MetaSoundImpact || !GetWorld())return;
    UAudioComponent* Audio=UGameplayStatics::SpawnSoundAtLocation(
        GetWorld(),MetaSoundImpact,Hit.ImpactPoint,Hit.ImpactNormal.Rotation());
    if(!Audio)return;
    Audio->SetFloatParameter(SurfaceParameter,static_cast<float>(Surface));
    const AActor* Shooter=GetOwner();
    const float ImpactSpeed=Shooter?Shooter->GetVelocity().Size():0.0f;
    Audio->SetFloatParameter(ImpactIntensityParameter,FMath::Clamp(0.25f+ImpactSpeed/1800.0f,0.05f,1.0f));
}

bool UBPWeaponComponent::Fire()
{
    UWorld* World=GetWorld();
    UCameraComponent* Camera=ResolveCamera();
    if(!World || !Camera || bReloading || CurrentAmmo<=0 ||
       World->GetTimeSeconds()-LastFireTime<FireIntervalSeconds)return false;
    LastFireTime=World->GetTimeSeconds();
    --CurrentAmmo;
    OnAmmoChanged.Broadcast(CurrentAmmo,ReserveAmmo);

    const FVector CameraOrigin=Camera->GetComponentLocation();
    const FVector CameraDirection=Camera->GetForwardVector();
    const float RangeCm=AimRangeMeters*100.0f;
    FCollisionQueryParams Params(SCENE_QUERY_STAT(BridgePointWeaponTrace),true,GetOwner());
    Params.bReturnPhysicalMaterial=true;

    // Aim from the camera, then confirm the real projectile line from the muzzle.
    FHitResult AimHit;
    World->LineTraceSingleByChannel(AimHit,CameraOrigin,CameraOrigin+CameraDirection*RangeCm,ECC_Visibility,Params);
    const FVector AimPoint=AimHit.bBlockingHit?AimHit.ImpactPoint:CameraOrigin+CameraDirection*RangeCm;
    FVector ShotDirection=(AimPoint-GetMuzzleLocation()).GetSafeNormal();

    const ACharacter* Character=Cast<ACharacter>(GetOwner());
    const float MovementSpread=Character?FMath::Clamp(Character->GetVelocity().Size2D()/1800.0f,0.0f,0.8f):0.0f;
    const float RecoilSpread=FMath::Clamp(FMath::Abs(CurrentRecoilPitch)*0.025f,0.0f,0.5f);
    const float BaseSpread=bAiming?AimSpreadDegrees:HipSpreadDegrees;
    const float Spread=FMath::DegreesToRadians(BaseSpread+MovementSpread+RecoilSpread);
    ShotDirection=FMath::VRandCone(ShotDirection,Spread,Spread).GetSafeNormal();

    FHitResult Hit;
    const FVector Muzzle=GetMuzzleLocation();
    const bool bHit=World->LineTraceSingleByChannel(Hit,Muzzle,Muzzle+ShotDirection*RangeCm,ECC_Visibility,Params);
    ApplyRecoil();
    if(!bHit)return true;

    const EPhysicalSurface Surface=UPhysicalMaterial::DetermineSurfaceType(Hit.PhysMaterial.Get());
    FBPWeaponHitData Data;
    Data.Hit=Hit;
    Data.HitActor=Hit.GetActor();
    Data.SurfaceType=Surface;
    Data.SurfaceName=UEnum::GetValueAsName(Surface);
    Data.ImpactPoint=Hit.ImpactPoint;
    Data.ImpactNormal=Hit.ImpactNormal;
    OnWeaponHit.Broadcast(Data);

    if(ABPGeoTileProxyActor* TileActor=Cast<ABPGeoTileProxyActor>(Hit.GetActor()))
        TileActor->NotifyTileImpact(Hit);

    PlayImpactAudio(Hit,Surface);
    return true;
}