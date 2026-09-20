#include "HorizonMatchmakingSubsystem.h"

bool UHorizonMatchmakingSubsystem::ValidateProfile(
    const FHorizonMatchProfile& Profile,
    FString& OutRejectionReason)
{
    OutRejectionReason.Reset();

    FString NormalizedPlayerId = Profile.PlayerId;
    NormalizedPlayerId.TrimStartAndEndInline();
    if (NormalizedPlayerId.IsEmpty() ||
        NormalizedPlayerId != Profile.PlayerId)
    {
        OutRejectionReason = TEXT("INVALID_PLAYER_ID");
        return false;
    }

    if (!FMath::IsFinite(Profile.SkillMean) ||
        !FMath::IsFinite(Profile.SkillUncertainty) ||
        Profile.SkillMean < 0.0f ||
        Profile.SkillMean > 100.0f ||
        Profile.SkillUncertainty < 0.5f ||
        Profile.SkillUncertainty > 25.0f)
    {
        OutRejectionReason = TEXT("INVALID_SKILL_PROFILE");
        return false;
    }

    if (Profile.CareerLevel < 1 ||
        Profile.CareerLevel > MaxCareerLevel ||
        Profile.LifetimeKills < 0 ||
        Profile.Prestige < 0 ||
        Profile.Prestige > MaxPrestige)
    {
        OutRejectionReason = TEXT("INVALID_PROGRESSION_PROFILE");
        return false;
    }

    if (Profile.EstimatedPingMs < 0)
    {
        OutRejectionReason = TEXT("INVALID_CONNECTION_PROFILE");
        return false;
    }
    if (Profile.EstimatedPingMs > HardPingLimitMs)
    {
        OutRejectionReason = TEXT("CONNECTION_OUTSIDE_LIMIT");
        return false;
    }

    if (Profile.PartySize < 1 || Profile.PartySize > MaxPartySize)
    {
        OutRejectionReason = TEXT("INVALID_PARTY_SIZE");
        return false;
    }

    if (static_cast<uint8>(Profile.InputPool) >
            static_cast<uint8>(EHorizonInputPool::Touch) ||
        static_cast<uint8>(Profile.PlatformPool) >
            static_cast<uint8>(EHorizonPlatformPool::Cloud))
    {
        OutRejectionReason = TEXT("INVALID_INPUT_PLATFORM_PROFILE");
        return false;
    }

    return true;
}

FHorizonMatchCompatibility UHorizonMatchmakingSubsystem::EvaluateCompatibility(
    const FHorizonMatchProfile& Host,
    const FHorizonMatchProfile& Candidate) const
{
    FHorizonMatchCompatibility Result;

    if (!ValidateProfile(Host, Result.RejectionReason) ||
        !ValidateProfile(Candidate, Result.RejectionReason))
    {
        return Result;
    }

    if (Host.PlayerId == Candidate.PlayerId)
    {
        Result.RejectionReason = TEXT("INVALID_PLAYER_ID");
        return Result;
    }

    const bool bInputMismatch = Host.InputPool != Candidate.InputPool;
    if (bInputMismatch && !(Host.bCrossInputOptIn && Candidate.bCrossInputOptIn))
    {
        Result.RejectionReason = TEXT("INPUT_POOL_OPT_IN_REQUIRED");
        return Result;
    }

    const float UncertaintyBudget = FMath::Max(
        4.0f,
        Host.SkillUncertainty + Candidate.SkillUncertainty);

    Result.SkillGap = FMath::Abs(Host.SkillMean - Candidate.SkillMean);
    Result.SkillPenalty = FMath::Clamp(
        Result.SkillGap / (UncertaintyBudget * 3.0f),
        0.0f,
        1.0f);

    const int32 HostProgress =
        Host.CareerLevel + Host.Prestige * MaxCareerLevel;
    const int32 CandidateProgress =
        Candidate.CareerLevel + Candidate.Prestige * MaxCareerLevel;
    Result.ProgressPenalty = FMath::Clamp(
        FMath::Abs(static_cast<float>(HostProgress - CandidateProgress)) / 1000.0f,
        0.0f,
        1.0f);

    const float HostKillExperience =
        FMath::Loge(1.0f + static_cast<float>(Host.LifetimeKills));
    const float CandidateKillExperience =
        FMath::Loge(1.0f + static_cast<float>(Candidate.LifetimeKills));
    Result.KillPenalty = FMath::Clamp(
        FMath::Abs(HostKillExperience - CandidateKillExperience) / 8.0f,
        0.0f,
        1.0f);

    Result.ConnectionPenalty = FMath::Clamp(
        static_cast<float>(FMath::Max(
            Host.EstimatedPingMs,
            Candidate.EstimatedPingMs)) / HardPingLimitMs,
        0.0f,
        1.0f);

    Result.PlatformPenalty =
        Host.PlatformPool == Candidate.PlatformPool ? 0.0f : 1.0f;
    Result.InputPenalty = bInputMismatch ? 1.0f : 0.0f;
    Result.PartyPenalty = FMath::Clamp(
        static_cast<float>(FMath::Abs(
            Host.PartySize - Candidate.PartySize)) / (MaxPartySize - 1),
        0.0f,
        1.0f);

    const float TotalPenalty =
        Result.SkillPenalty * 0.55f
        + Result.ProgressPenalty * 0.12f
        + Result.KillPenalty * 0.08f
        + Result.ConnectionPenalty * 0.16f
        + Result.PlatformPenalty * 0.03f
        + Result.InputPenalty * 0.02f
        + Result.PartyPenalty * 0.04f;

    Result.Score01 = FMath::Clamp(1.0f - TotalPenalty, 0.0f, 1.0f);
    Result.bEligible = Result.Score01 >= MinimumEligibleScore;
    if (!Result.bEligible)
    {
        Result.RejectionReason = TEXT("COMPATIBILITY_BELOW_THRESHOLD");
    }

    return Result;
}
