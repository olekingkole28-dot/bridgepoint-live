#include "HorizonMatchmakingSubsystem.h"

FHorizonMatchCompatibility UHorizonMatchmakingSubsystem::EvaluateCompatibility(
    const FHorizonMatchProfile& Host,
    const FHorizonMatchProfile& Candidate) const
{
    FHorizonMatchCompatibility Result;

    if (Host.PlayerId.IsEmpty() || Candidate.PlayerId.IsEmpty() || Host.PlayerId == Candidate.PlayerId)
    {
        Result.RejectionReason = TEXT("INVALID_PLAYER_ID");
        return Result;
    }

    const int32 HostPing = FMath::Max(0, Host.EstimatedPingMs);
    const int32 CandidatePing = FMath::Max(0, Candidate.EstimatedPingMs);
    if (HostPing > HardPingLimitMs || CandidatePing > HardPingLimitMs)
    {
        Result.RejectionReason = TEXT("CONNECTION_OUTSIDE_LIMIT");
        return Result;
    }

    if (Host.PartySize < 1 || Host.PartySize > MaxPartySize
        || Candidate.PartySize < 1 || Candidate.PartySize > MaxPartySize)
    {
        Result.RejectionReason = TEXT("INVALID_PARTY_SIZE");
        return Result;
    }

    const bool bInputMismatch = Host.InputPool != Candidate.InputPool;
    if (bInputMismatch && !(Host.bCrossInputOptIn && Candidate.bCrossInputOptIn))
    {
        Result.RejectionReason = TEXT("INPUT_POOL_OPT_IN_REQUIRED");
        return Result;
    }

    const float HostSkill = FMath::Clamp(Host.SkillMean, 0.0f, 100.0f);
    const float CandidateSkill = FMath::Clamp(Candidate.SkillMean, 0.0f, 100.0f);
    const float UncertaintyBudget = FMath::Max(
        4.0f,
        FMath::Clamp(Host.SkillUncertainty, 0.5f, 25.0f)
            + FMath::Clamp(Candidate.SkillUncertainty, 0.5f, 25.0f));

    Result.SkillGap = FMath::Abs(HostSkill - CandidateSkill);
    const float SkillPenalty = FMath::Clamp(Result.SkillGap / (UncertaintyBudget * 3.0f), 0.0f, 1.0f);

    const int32 HostProgress = FMath::Clamp(Host.CareerLevel, 1, MaxCareerLevel)
        + FMath::Clamp(Host.Prestige, 0, MaxPrestige) * MaxCareerLevel;
    const int32 CandidateProgress = FMath::Clamp(Candidate.CareerLevel, 1, MaxCareerLevel)
        + FMath::Clamp(Candidate.Prestige, 0, MaxPrestige) * MaxCareerLevel;
    const float ProgressPenalty = FMath::Clamp(
        FMath::Abs(static_cast<float>(HostProgress - CandidateProgress)) / 1000.0f,
        0.0f,
        1.0f);

    const float HostKillExperience = FMath::Loge(1.0f + FMath::Max(0, Host.LifetimeKills));
    const float CandidateKillExperience = FMath::Loge(1.0f + FMath::Max(0, Candidate.LifetimeKills));
    const float KillPenalty = FMath::Clamp(
        FMath::Abs(HostKillExperience - CandidateKillExperience) / 8.0f,
        0.0f,
        1.0f);

    Result.ConnectionPenalty = FMath::Clamp(
        static_cast<float>(FMath::Max(HostPing, CandidatePing)) / HardPingLimitMs,
        0.0f,
        1.0f);

    const float PlatformPenalty = Host.PlatformPool == Candidate.PlatformPool ? 0.0f : 1.0f;
    const float InputPenalty = bInputMismatch ? 1.0f : 0.0f;
    const float PartyPenalty = FMath::Clamp(
        static_cast<float>(FMath::Abs(Host.PartySize - Candidate.PartySize)) / (MaxPartySize - 1),
        0.0f,
        1.0f);

    const float TotalPenalty =
        SkillPenalty * 0.55f
        + ProgressPenalty * 0.12f
        + KillPenalty * 0.08f
        + Result.ConnectionPenalty * 0.16f
        + PlatformPenalty * 0.03f
        + InputPenalty * 0.02f
        + PartyPenalty * 0.04f;

    Result.Score01 = FMath::Clamp(1.0f - TotalPenalty, 0.0f, 1.0f);
    Result.bEligible = Result.Score01 >= MinimumEligibleScore;
    if (!Result.bEligible)
    {
        Result.RejectionReason = TEXT("COMPATIBILITY_BELOW_THRESHOLD");
    }

    return Result;
}
