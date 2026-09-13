#include "HorizonAutopilotSubsystem.h"

#include "HAL/IConsoleManager.h"

void UHorizonAutopilotSubsystem::Initialize(FSubsystemCollectionBase& Collection)
{
    Super::Initialize(Collection);
    QualityTier = 3;
    RecalculateProfile();
    ApplyRenderTier();
}

void UHorizonAutopilotSubsystem::Deinitialize()
{
    Super::Deinitialize();
}

bool UHorizonAutopilotSubsystem::DoesSupportWorldType(EWorldType::Type WorldType) const
{
    return WorldType == EWorldType::Game || WorldType == EWorldType::PIE;
}

TStatId UHorizonAutopilotSubsystem::GetStatId() const
{
    RETURN_QUICK_DECLARE_CYCLE_STAT(UHorizonAutopilotSubsystem, STATGROUP_Tickables);
}

void UHorizonAutopilotSubsystem::Tick(float DeltaTime)
{
    if (DeltaTime <= 0.0f)
    {
        return;
    }

    const float FrameMs = FMath::Clamp(DeltaTime * 1000.0f, 1.0f, 250.0f);
    SmoothedFrameMs = FMath::Lerp(SmoothedFrameMs, FrameMs, 0.08f);
    SampleAccumulator += DeltaTime;
    ++TotalSamples;
    if (FrameMs > 40.0f)
    {
        ++HitchSamples;
    }

    if (SampleAccumulator < 1.0f)
    {
        return;
    }

    const float HitchRatio = TotalSamples > 0
        ? static_cast<float>(HitchSamples) / static_cast<float>(TotalSamples)
        : 0.0f;

    const bool bBad =
        SmoothedFrameMs > 20.5f ||
        HitchRatio > 0.12f ||
        StreamingPressure01 > 0.88f;

    const bool bGood =
        SmoothedFrameMs < 14.8f &&
        HitchRatio < 0.03f &&
        StreamingPressure01 < 0.60f;

    if (!bTierForced)
    {
        BadSeconds = bBad ? BadSeconds + SampleAccumulator : 0.0f;
        GoodSeconds = bGood ? GoodSeconds + SampleAccumulator : 0.0f;

        if (BadSeconds >= 1.5f && QualityTier > 0)
        {
            --QualityTier;
            BadSeconds = 0.0f;
            GoodSeconds = 0.0f;
            ApplyRenderTier();
        }
        else if (GoodSeconds >= 8.0f && QualityTier < 4)
        {
            ++QualityTier;
            GoodSeconds = 0.0f;
            BadSeconds = 0.0f;
            ApplyRenderTier();
        }
    }

    RecalculateProfile();
    OnProfileChanged.Broadcast(Profile);

    SampleAccumulator = 0.0f;
    HitchSamples = 0;
    TotalSamples = 0;
}

void UHorizonAutopilotSubsystem::ReportNetworkRttMs(float InRttMs)
{
    NetworkRttMs = FMath::Clamp(InRttMs, 0.0f, 500.0f);
    RecalculateProfile();
}

void UHorizonAutopilotSubsystem::ReportStreamingPressure(float InPressure01)
{
    StreamingPressure01 = FMath::Clamp(InPressure01, 0.0f, 1.0f);
    RecalculateProfile();
}

void UHorizonAutopilotSubsystem::ReportCameraSpeedMps(float InSpeedMps)
{
    CameraSpeedMps = FMath::Clamp(InSpeedMps, 0.0f, 120.0f);
    RecalculateProfile();
}

void UHorizonAutopilotSubsystem::ForceQualityTier(int32 InTier)
{
    if (InTier < 0)
    {
        bTierForced = false;
        return;
    }

    bTierForced = true;
    QualityTier = FMath::Clamp(InTier, 0, 4);
    ApplyRenderTier();
    RecalculateProfile();
    OnProfileChanged.Broadcast(Profile);
}

void UHorizonAutopilotSubsystem::RecalculateProfile()
{
    static const float CellSpans[5] = {1.65f, 2.15f, 2.85f, 3.75f, 4.80f};
    static const int32 Buildings[5] = {650, 900, 1250, 1800, 2400};
    static const int32 Parts[5] = {350, 600, 950, 1400, 2100};
    static const int32 Infected[5] = {45, 70, 100, 135, 175};
    static const float Detail[5] = {0.55f, 0.68f, 0.80f, 0.92f, 1.0f};
    static const float Animation[5] = {0.50f, 0.62f, 0.76f, 0.90f, 1.0f};

    const int32 Tier = FMath::Clamp(QualityTier, 0, 4);
    const float PressureScale = FMath::Lerp(1.0f, 0.58f, StreamingPressure01);
    const float SpeedScale = CameraSpeedMps > 24.0f ? 0.82f : 1.0f;

    Profile.QualityTier = Tier;
    Profile.SmoothedFrameMs = SmoothedFrameMs;
    Profile.NetworkRttMs = NetworkRttMs;
    Profile.StreamingPressure01 = StreamingPressure01;
    Profile.RecommendedCellSpanKm = FMath::Clamp(CellSpans[Tier] * PressureScale * SpeedScale, 1.2f, 5.0f);
    Profile.MaxBuildingsPerCell = FMath::Max(450, FMath::RoundToInt(Buildings[Tier] * PressureScale));
    Profile.MaxBuildingPartsPerCell = FMath::Max(200, FMath::RoundToInt(Parts[Tier] * PressureScale));
    Profile.MaxActiveInfected = FMath::Max(30, FMath::RoundToInt(Infected[Tier] * FMath::Lerp(1.0f, 0.72f, StreamingPressure01)));
    Profile.AnimationBudgetScale = Animation[Tier];
    Profile.WorldDetailScale = Detail[Tier];

    const float NetworkScale = NetworkRttMs >= 120.0f ? 0.72f : NetworkRttMs >= 70.0f ? 0.86f : 1.0f;
    const float TierSampleRate = Tier >= 4 ? 120.0f : Tier >= 2 ? 90.0f : 60.0f;
    Profile.MovementSampleRateHz = FMath::Clamp(TierSampleRate * NetworkScale, 45.0f, 120.0f);
    Profile.MovementInterpolationSpeed = FMath::Clamp(
        FMath::Lerp(9.0f, 18.0f, Detail[Tier]) * FMath::Lerp(1.0f, 0.82f, NetworkRttMs / 200.0f),
        7.0f,
        18.0f);
}

void UHorizonAutopilotSubsystem::ApplyRenderTier()
{
    static const float ScreenPercent[5] = {62.0f, 72.0f, 82.0f, 92.0f, 100.0f};
    static const float ViewScale[5] = {0.62f, 0.75f, 0.90f, 1.05f, 1.20f};
    static const float NaniteEdge[5] = {2.6f, 2.1f, 1.65f, 1.25f, 1.0f};

    const int32 Tier = FMath::Clamp(QualityTier, 0, 4);
    SetFloatCVar(TEXT("r.ScreenPercentage"), ScreenPercent[Tier]);
    SetFloatCVar(TEXT("r.ViewDistanceScale"), ViewScale[Tier]);
    SetFloatCVar(TEXT("r.Nanite.MaxPixelsPerEdge"), NaniteEdge[Tier]);
    SetFloatCVar(TEXT("r.Shadow.Virtual.ResolutionLodBiasDirectional"), Tier <= 1 ? 2.0f : Tier == 2 ? 1.0f : 0.0f);
    SetIntCVar(TEXT("sg.EffectsQuality"), FMath::Clamp(Tier, 1, 4));
    SetIntCVar(TEXT("sg.FoliageQuality"), FMath::Clamp(Tier, 1, 4));
    SetIntCVar(TEXT("sg.PostProcessQuality"), FMath::Clamp(Tier, 1, 4));
}

void UHorizonAutopilotSubsystem::SetFloatCVar(const TCHAR* Name, float Value) const
{
    if (IConsoleVariable* Var = IConsoleManager::Get().FindConsoleVariable(Name))
    {
        Var->Set(Value, ECVF_SetByGameSetting);
    }
}

void UHorizonAutopilotSubsystem::SetIntCVar(const TCHAR* Name, int32 Value) const
{
    if (IConsoleVariable* Var = IConsoleManager::Get().FindConsoleVariable(Name))
    {
        Var->Set(Value, ECVF_SetByGameSetting);
    }
}
