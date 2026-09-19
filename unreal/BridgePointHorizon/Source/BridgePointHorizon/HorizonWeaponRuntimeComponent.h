#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "HorizonWeaponRuntimeComponent.generated.h"

USTRUCT(BlueprintType)
struct FHorizonWeaponSpec
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    int32 MagazineSize = 30;

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    int32 StartingReserve = 120;

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    float RoundsPerMinute = 650.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    float ReloadSeconds = 2.10f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    float HipSpreadDegrees = 2.40f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    float AdsSpreadDegrees = 0.65f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    float RecoilPitchDegrees = 1.10f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    float RecoilYawDegrees = 0.35f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    bool bAutomatic = true;
};

USTRUCT(BlueprintType)
struct FHorizonWeaponRuntimeState
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadOnly)
    int32 RoundsInMagazine = 0;

    UPROPERTY(BlueprintReadOnly)
    int32 ReserveRounds = 0;

    UPROPERTY(BlueprintReadOnly)
    bool bReloading = false;

    UPROPERTY(BlueprintReadOnly)
    float ReloadRemainingSeconds = 0.0f;

    UPROPERTY(BlueprintReadOnly)
    float FireCooldownSeconds = 0.0f;
};

USTRUCT(BlueprintType)
struct FHorizonWeaponShotResult
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadOnly)
    int32 ShotSequence = 0;

    UPROPERTY(BlueprintReadOnly)
    int32 RoundsRemaining = 0;

    UPROPERTY(BlueprintReadOnly)
    float SpreadDegrees = 0.0f;

    UPROPERTY(BlueprintReadOnly)
    FVector2D RecoilImpulse = FVector2D::ZeroVector;
};

DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(
    FHorizonWeaponShotFired,
    FHorizonWeaponShotResult,
    Shot);
DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(
    FHorizonWeaponStateChanged,
    FHorizonWeaponRuntimeState,
    State);

UCLASS(ClassGroup=(Horizon), meta=(BlueprintSpawnableComponent))
class BRIDGEPOINTHORIZON_API UHorizonWeaponRuntimeComponent : public UActorComponent
{
    GENERATED_BODY()

public:
    UHorizonWeaponRuntimeComponent();

    virtual void BeginPlay() override;
    virtual void TickComponent(
        float DeltaTime,
        ELevelTick TickType,
        FActorComponentTickFunction* ThisTickFunction) override;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Horizon|Weapon")
    FHorizonWeaponSpec WeaponSpec;

    UPROPERTY(BlueprintAssignable)
    FHorizonWeaponShotFired OnShotFired;

    UPROPERTY(BlueprintAssignable)
    FHorizonWeaponStateChanged OnWeaponStateChanged;

    UFUNCTION(BlueprintCallable, Category="Horizon|Weapon")
    void ConfigureWeapon(const FHorizonWeaponSpec& NewSpec, bool bRefillAmmo = true);

    UFUNCTION(BlueprintCallable, Category="Horizon|Weapon")
    void StartFire(bool bAiming);

    UFUNCTION(BlueprintCallable, Category="Horizon|Weapon")
    void StopFire();

    UFUNCTION(BlueprintCallable, Category="Horizon|Weapon")
    bool TryFireOnce();

    UFUNCTION(BlueprintCallable, Category="Horizon|Weapon")
    bool BeginReload();

    UFUNCTION(BlueprintCallable, Category="Horizon|Weapon")
    void CancelReload();

    UFUNCTION(BlueprintCallable, Category="Horizon|Weapon")
    void SetAiming(bool bNewAiming);

    UFUNCTION(BlueprintPure, Category="Horizon|Weapon")
    FHorizonWeaponRuntimeState GetWeaponState() const;

    static bool CanFireRound(int32 RoundsInMagazine, bool bReloading, float FireCooldownSeconds);
    static int32 ComputeReloadTransfer(int32 RoundsInMagazine, int32 ReserveRounds, int32 MagazineSize);
    static float AdvanceCountdown(float RemainingSeconds, float DeltaSeconds);
    static int32 AdvanceAutomaticCadence(
        float CurrentCooldownSeconds,
        float DeltaSeconds,
        float ShotIntervalSeconds,
        int32 AvailableRounds,
        int32 MaxCatchUpShots,
        float& OutCooldownSeconds);
    static FVector2D ComputeRecoilImpulse(
        int32 ShotSequence,
        bool bAiming,
        float PitchDegrees,
        float YawDegrees);

private:
    int32 RoundsInMagazine = 0;
    int32 ReserveRounds = 0;
    int32 ShotSequence = 0;
    float FireCooldownSeconds = 0.0f;
    float ReloadRemainingSeconds = 0.0f;
    bool bReloading = false;
    bool bTriggerHeld = false;
    bool bAiming = false;

    void CompleteReload();
    void BroadcastState();
    void RefreshTickState();
};
