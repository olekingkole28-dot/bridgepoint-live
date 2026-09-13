#include "HorizonInfectedDirectorSubsystem.h"

FHorizonInfectedTuning UHorizonInfectedDirectorSubsystem::GetTuning(
    int32 EventDay,
    float LocalUrbanDensity01,
    float RegionalDanger01,
    float HordePressure01) const
{
    FHorizonInfectedTuning Tuning;

    const float Day01 = EventDay <= 0
        ? 0.0f
        : FMath::Clamp((EventDay - 1) / 364.0f, 0.0f, 1.0f);

    const float Density = FMath::Clamp(LocalUrbanDensity01, 0.0f, 1.0f);
    const float Region = FMath::Clamp(RegionalDanger01, 0.0f, 1.0f);
    const float Horde = FMath::Clamp(HordePressure01, 0.0f, 1.0f);

    // Year One is intentionally forgiving at the beginning.
    const float CoreRamp = FMath::Pow(Day01, 1.35f);
    const float LateRamp = FMath::GetMappedRangeValueClamped(
        FVector2D(0.68f, 1.0f),
        FVector2D(0.0f, 1.0f),
        Day01);

    Tuning.HealthMultiplier = 0.78f + CoreRamp * 0.95f + LateRamp * 0.42f;
    Tuning.DamageMultiplier = 0.72f + CoreRamp * 0.82f + LateRamp * 0.36f;
    Tuning.SpeedMultiplier = 0.82f + CoreRamp * 0.34f + LateRamp * 0.18f;
    Tuning.SpawnDensityMultiplier =
        0.62f + Day01 * 0.78f + Density * 0.48f + Horde * 0.75f;
    Tuning.AggroRangeMultiplier =
        0.86f + Day01 * 0.28f + Density * 0.12f + Region * 0.08f;

    // Hard archetypes ramp in over time instead of appearing everywhere on day one.
    Tuning.RunnerChance = FMath::Clamp(0.03f + Day01 * 0.22f + Density * 0.05f, 0.03f, 0.32f);
    Tuning.SprinterChance = Day01 < 0.18f
        ? 0.0f
        : FMath::Clamp((Day01 - 0.18f) * 0.16f + Region * 0.02f, 0.0f, 0.14f);
    Tuning.ArmoredChance = Day01 < 0.12f
        ? 0.0f
        : FMath::Clamp((Day01 - 0.12f) * 0.14f + Density * 0.04f, 0.0f, 0.16f);
    Tuning.ScreamerChance = Day01 < 0.25f
        ? 0.0f
        : FMath::Clamp((Day01 - 0.25f) * 0.09f + Horde * 0.03f, 0.0f, 0.09f);
    Tuning.BruteChance = Day01 < 0.30f
        ? 0.0f
        : FMath::Clamp((Day01 - 0.30f) * 0.075f + Region * 0.025f, 0.0f, 0.08f);

    Tuning.EliteChance = FMath::Clamp(
        Tuning.ArmoredChance +
        Tuning.ScreamerChance +
        Tuning.BruteChance,
        0.0f,
        0.25f);

    return Tuning;
}

EHorizonInfectedArchetype UHorizonInfectedDirectorSubsystem::PickArchetype(
    int32 EventDay,
    float LocalUrbanDensity01,
    float RegionalDanger01,
    int32 RandomSeed) const
{
    const FHorizonInfectedTuning Tuning = GetTuning(
        EventDay,
        LocalUrbanDensity01,
        RegionalDanger01,
        0.0f);

    FRandomStream Random(RandomSeed);
    const float Roll = Random.FRand();

    const float BruteEnd = Tuning.BruteChance;
    const float ScreamerEnd = BruteEnd + Tuning.ScreamerChance;
    const float ArmoredEnd = ScreamerEnd + Tuning.ArmoredChance * 0.65f;
    const float HelmetedEnd = ArmoredEnd + Tuning.ArmoredChance * 0.35f;
    const float SprinterEnd = HelmetedEnd + Tuning.SprinterChance;
    const float RunnerEnd = SprinterEnd + Tuning.RunnerChance;

    if (Roll < BruteEnd)
    {
        return EHorizonInfectedArchetype::Brute;
    }
    if (Roll < ScreamerEnd)
    {
        return EHorizonInfectedArchetype::Screamer;
    }
    if (Roll < ArmoredEnd)
    {
        return EHorizonInfectedArchetype::Armored;
    }
    if (Roll < HelmetedEnd)
    {
        return EHorizonInfectedArchetype::Helmeted;
    }
    if (Roll < SprinterEnd)
    {
        return EHorizonInfectedArchetype::Sprinter;
    }
    if (Roll < RunnerEnd)
    {
        return EHorizonInfectedArchetype::Runner;
    }

    // Most of the population remains slow infected, even late in the event.
    return Random.FRand() < 0.38f
        ? EHorizonInfectedArchetype::Shambler
        : EHorizonInfectedArchetype::Walker;
}

float UHorizonInfectedDirectorSubsystem::GetCityConvergencePressure(int32 EventDay) const
{
    if (EventDay <= 0)
    {
        return 0.0f;
    }

    const float Day01 = FMath::Clamp((EventDay - 1) / 364.0f, 0.0f, 1.0f);

    // Subtle for most of the year; the last third deliberately pushes harder.
    const float LongRamp = FMath::Pow(Day01, 1.75f);
    const float FinalQuarter = FMath::GetMappedRangeValueClamped(
        FVector2D(0.75f, 1.0f),
        FVector2D(0.0f, 1.0f),
        Day01);

    return FMath::Clamp(LongRamp * 0.72f + FinalQuarter * 0.28f, 0.0f, 1.0f);
}
