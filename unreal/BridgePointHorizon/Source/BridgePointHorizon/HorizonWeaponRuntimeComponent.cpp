#include "HorizonWeaponRuntimeComponent.h"

#include "GameFramework/Pawn.h"

UHorizonWeaponRuntimeComponent::UHorizonWeaponRuntimeComponent()
{
    PrimaryComponentTick.bCanEverTick = true;
    PrimaryComponentTick.bStartWithTickEnabled = false;
}

void UHorizonWeaponRuntimeComponent::BeginPlay()
{
    Super::BeginPlay();
    ConfigureWeapon(WeaponSpec, true);
}

void UHorizonWeaponRuntimeComponent::ConfigureWeapon(
    const FHorizonWeaponSpec& NewSpec,
    bool bRefillAmmo)
{
    WeaponSpec = NewSpec;
    WeaponSpec.MagazineSize = FMath::Clamp(WeaponSpec.MagazineSize, 1, 300);
    WeaponSpec.StartingReserve = FMath::Clamp(WeaponSpec.StartingReserve, 0, 3000);
    WeaponSpec.RoundsPerMinute = FMath::Clamp(WeaponSpec.RoundsPerMinute, 60.0f, 1800.0f);
    WeaponSpec.ReloadSeconds = FMath::Clamp(WeaponSpec.ReloadSeconds, 0.20f, 12.0f);
    WeaponSpec.HipSpreadDegrees = FMath::Clamp(WeaponSpec.HipSpreadDegrees, 0.0f, 15.0f);
    WeaponSpec.AdsSpreadDegrees = FMath::Clamp(WeaponSpec.AdsSpreadDegrees, 0.0f, 8.0f);
    WeaponSpec.RecoilPitchDegrees = FMath::Clamp(WeaponSpec.RecoilPitchDegrees, 0.0f, 8.0f);
    WeaponSpec.RecoilYawDegrees = FMath::Clamp(WeaponSpec.RecoilYawDegrees, 0.0f, 5.0f);

    if (bRefillAmmo)
    {
        RoundsInMagazine = WeaponSpec.MagazineSize;
        ReserveRounds = WeaponSpec.StartingReserve;
        ShotSequence = 0;
        FireCooldownSeconds = 0.0f;
        ReloadRemainingSeconds = 0.0f;
        bReloading = false;
        bTriggerHeld = false;
    }
    else
    {
        RoundsInMagazine = FMath::Clamp(RoundsInMagazine, 0, WeaponSpec.MagazineSize);
        ReserveRounds = FMath::Max(0, ReserveRounds);
    }

    BroadcastState();
    RefreshTickState();
}

bool UHorizonWeaponRuntimeComponent::CanFireRound(
    int32 MagazineRounds,
    bool bIsReloading,
    float CooldownSeconds)
{
    return MagazineRounds > 0 && !bIsReloading && CooldownSeconds <= KINDA_SMALL_NUMBER;
}

int32 UHorizonWeaponRuntimeComponent::ComputeReloadTransfer(
    int32 MagazineRounds,
    int32 AvailableReserve,
    int32 MagazineCapacity)
{
    const int32 SafeCapacity = FMath::Max(1, MagazineCapacity);
    const int32 Missing = FMath::Max(0, SafeCapacity - FMath::Max(0, MagazineRounds));
    return FMath::Min(Missing, FMath::Max(0, AvailableReserve));
}

float UHorizonWeaponRuntimeComponent::AdvanceCountdown(
    float RemainingSeconds,
    float DeltaSeconds)
{
    if (!FMath::IsFinite(RemainingSeconds) || RemainingSeconds <= 0.0f)
    {
        return 0.0f;
    }

    if (!FMath::IsFinite(DeltaSeconds) || DeltaSeconds <= 0.0f)
    {
        return RemainingSeconds;
    }

    // Preserve ordinary long frames so cadence and reloads remain tied to wall time.
    // Cap only catastrophic stalls to avoid an unbounded simulation jump on resume.
    const float SafeDeltaSeconds = FMath::Min(DeltaSeconds, 0.50f);
    return FMath::Max(0.0f, RemainingSeconds - SafeDeltaSeconds);
}

FVector2D UHorizonWeaponRuntimeComponent::ComputeRecoilImpulse(
    int32 Sequence,
    bool bIsAiming,
    float PitchDegrees,
    float YawDegrees)
{
    const int32 SafeSequence = FMath::Max(1, Sequence);
    const float AimScale = bIsAiming ? 0.48f : 1.0f;
    const float Ramp = FMath::Min(1.55f, 1.0f + (SafeSequence - 1) * 0.035f);
    const float Side = (SafeSequence % 2 == 0) ? -1.0f : 1.0f;
    const float Pattern = 0.72f + static_cast<float>((SafeSequence * 37) % 29) / 100.0f;
    return FVector2D(
        FMath::Max(0.0f, PitchDegrees) * AimScale * Ramp,
        FMath::Max(0.0f, YawDegrees) * AimScale * Side * Pattern);
}

void UHorizonWeaponRuntimeComponent::StartFire(bool bNewAiming)
{
    bAiming = bNewAiming;
    bTriggerHeld = true;
    TryFireOnce();
    if (!WeaponSpec.bAutomatic)
    {
        bTriggerHeld = false;
    }
    RefreshTickState();
}

void UHorizonWeaponRuntimeComponent::StopFire()
{
    bTriggerHeld = false;
    RefreshTickState();
}

bool UHorizonWeaponRuntimeComponent::TryFireOnce()
{
    if (!CanFireRound(RoundsInMagazine, bReloading, FireCooldownSeconds))
    {
        return false;
    }

    --RoundsInMagazine;
    ++ShotSequence;
    FireCooldownSeconds = 60.0f / WeaponSpec.RoundsPerMinute;

    FHorizonWeaponShotResult Result;
    Result.ShotSequence = ShotSequence;
    Result.RoundsRemaining = RoundsInMagazine;
    Result.SpreadDegrees = bAiming ? WeaponSpec.AdsSpreadDegrees : WeaponSpec.HipSpreadDegrees;
    Result.RecoilImpulse = ComputeRecoilImpulse(
        ShotSequence,
        bAiming,
        WeaponSpec.RecoilPitchDegrees,
        WeaponSpec.RecoilYawDegrees);

    if (APawn* Pawn = Cast<APawn>(GetOwner()))
    {
        Pawn->AddControllerPitchInput(-Result.RecoilImpulse.X);
        Pawn->AddControllerYawInput(Result.RecoilImpulse.Y);
    }

    OnShotFired.Broadcast(Result);
    BroadcastState();
    RefreshTickState();
    return true;
}

bool UHorizonWeaponRuntimeComponent::BeginReload()
{
    if (bReloading ||
        RoundsInMagazine >= WeaponSpec.MagazineSize ||
        ReserveRounds <= 0)
    {
        return false;
    }

    bReloading = true;
    bTriggerHeld = false;
    ReloadRemainingSeconds = WeaponSpec.ReloadSeconds;
    BroadcastState();
    RefreshTickState();
    return true;
}

void UHorizonWeaponRuntimeComponent::CancelReload()
{
    if (!bReloading)
    {
        return;
    }

    bReloading = false;
    ReloadRemainingSeconds = 0.0f;
    BroadcastState();
    RefreshTickState();
}

void UHorizonWeaponRuntimeComponent::SetAiming(bool bNewAiming)
{
    bAiming = bNewAiming;
}

void UHorizonWeaponRuntimeComponent::CompleteReload()
{
    const int32 Transfer = ComputeReloadTransfer(
        RoundsInMagazine,
        ReserveRounds,
        WeaponSpec.MagazineSize);
    RoundsInMagazine += Transfer;
    ReserveRounds -= Transfer;
    bReloading = false;
    ReloadRemainingSeconds = 0.0f;
    BroadcastState();
}

void UHorizonWeaponRuntimeComponent::TickComponent(
    float DeltaTime,
    ELevelTick TickType,
    FActorComponentTickFunction* ThisTickFunction)
{
    Super::TickComponent(DeltaTime, TickType, ThisTickFunction);

    FireCooldownSeconds = AdvanceCountdown(FireCooldownSeconds, DeltaTime);

    if (bReloading)
    {
        ReloadRemainingSeconds = AdvanceCountdown(ReloadRemainingSeconds, DeltaTime);
        if (ReloadRemainingSeconds <= KINDA_SMALL_NUMBER)
        {
            CompleteReload();
        }
    }
    else if (bTriggerHeld && WeaponSpec.bAutomatic && FireCooldownSeconds <= KINDA_SMALL_NUMBER)
    {
        if (!TryFireOnce() && RoundsInMagazine <= 0)
        {
            bTriggerHeld = false;
        }
    }

    RefreshTickState();
}

FHorizonWeaponRuntimeState UHorizonWeaponRuntimeComponent::GetWeaponState() const
{
    FHorizonWeaponRuntimeState State;
    State.RoundsInMagazine = RoundsInMagazine;
    State.ReserveRounds = ReserveRounds;
    State.bReloading = bReloading;
    State.ReloadRemainingSeconds = ReloadRemainingSeconds;
    State.FireCooldownSeconds = FireCooldownSeconds;
    return State;
}

void UHorizonWeaponRuntimeComponent::BroadcastState()
{
    OnWeaponStateChanged.Broadcast(GetWeaponState());
}

void UHorizonWeaponRuntimeComponent::RefreshTickState()
{
    SetComponentTickEnabled(
        bReloading ||
        bTriggerHeld ||
        FireCooldownSeconds > KINDA_SMALL_NUMBER);
}
