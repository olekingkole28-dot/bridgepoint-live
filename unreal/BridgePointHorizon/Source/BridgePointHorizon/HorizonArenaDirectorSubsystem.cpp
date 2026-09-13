#include "HorizonArenaDirectorSubsystem.h"

void UHorizonArenaDirectorSubsystem::Initialize(FSubsystemCollectionBase& Collection)
{
    Super::Initialize(Collection);
    SeedFallbackArenas();
}

void UHorizonArenaDirectorSubsystem::SetCandidates(const TArray<FHorizonArenaCandidate>& InCandidates)
{
    Candidates = InCandidates;
    if (Candidates.IsEmpty())
    {
        SeedFallbackArenas();
    }
}

float UHorizonArenaDirectorSubsystem::ScoreArena(const FHorizonArenaCandidate& Candidate) const
{
    if (!Candidate.bAllowedForTDM)
    {
        return -1000.0f;
    }

    // TDM should feel dense and vertical first; scenic bonuses are secondary.
    const float Combat =
        Candidate.DensityScore * 0.24f +
        Candidate.VerticalityScore * 0.20f +
        Candidate.CoverScore * 0.15f +
        Candidate.InteriorScore * 0.13f +
        Candidate.RooftopScore * 0.11f;

    const float Terrain =
        Candidate.ElevationScore * 0.08f +
        Candidate.BridgeScore * 0.05f +
        Candidate.WaterfrontScore * 0.04f;

    return (Combat + Terrain) * FMath::Clamp(Candidate.StreamReadiness, 0.0f, 1.0f);
}

TArray<FHorizonArenaCandidate> UHorizonArenaDirectorSubsystem::GetRankedArenas(int32 MaxCount) const
{
    TArray<FHorizonArenaCandidate> Ranked = Candidates;
    Ranked.Sort([this](const FHorizonArenaCandidate& A, const FHorizonArenaCandidate& B)
    {
        return ScoreArena(A) > ScoreArena(B);
    });

    if (MaxCount > 0 && Ranked.Num() > MaxCount)
    {
        Ranked.SetNum(MaxCount);
    }
    return Ranked;
}

FHorizonArenaCandidate UHorizonArenaDirectorSubsystem::SelectNextArena(int32 Seed)
{
    TArray<FHorizonArenaCandidate> Ranked = GetRankedArenas(16);
    if (Ranked.IsEmpty())
    {
        SeedFallbackArenas();
        Ranked = GetRankedArenas(16);
    }

    // Use the strongest group, but rotate deterministically so matches do not repeat.
    const int32 PoolSize = FMath::Clamp(Ranked.Num(), 1, 8);
    FRandomStream Random(Seed != 0 ? Seed : (RotationCounter + 1) * 7919);
    int32 Pick = Random.RandRange(0, PoolSize - 1);

    if (PoolSize > 1 && Ranked[Pick].ArenaId == LastArenaId)
    {
        Pick = (Pick + 1 + (RotationCounter % (PoolSize - 1))) % PoolSize;
    }

    ++RotationCounter;
    LastArenaId = Ranked[Pick].ArenaId;
    return Ranked[Pick];
}

void UHorizonArenaDirectorSubsystem::SeedFallbackArenas()
{
    Candidates.Reset();

    auto Add = [this](
        const TCHAR* Id, const TCHAR* Name, const TCHAR* Region,
        double Lat, double Lon,
        float Density, float Elevation, float Verticality, float Rooftop,
        float Waterfront, float Bridge, float Interior, float Cover)
    {
        FHorizonArenaCandidate A;
        A.ArenaId = Id;
        A.DisplayName = Name;
        A.RegionCode = Region;
        A.Latitude = Lat;
        A.Longitude = Lon;
        A.DensityScore = Density;
        A.ElevationScore = Elevation;
        A.VerticalityScore = Verticality;
        A.RooftopScore = Rooftop;
        A.WaterfrontScore = Waterfront;
        A.BridgeScore = Bridge;
        A.InteriorScore = Interior;
        A.CoverScore = Cover;
        A.StreamReadiness = 1.0f;
        Candidates.Add(A);
    };

    // These are only fallback stream anchors. BridgePoint backend candidates replace them.
    Add(TEXT("nyc_lower_manhattan"), TEXT("Lower Manhattan Vertical"), TEXT("NY"), 40.7084, -74.0113, 1.00f, 0.35f, 1.00f, 1.00f, 0.72f, 0.58f, 0.95f, 0.92f);
    Add(TEXT("sf_nob_hill"), TEXT("San Francisco Hill Grid"), TEXT("CA"), 37.7930, -122.4161, 0.90f, 1.00f, 0.92f, 0.78f, 0.58f, 0.30f, 0.82f, 0.84f);
    Add(TEXT("pittsburgh_triangle"), TEXT("Pittsburgh River Triangle"), TEXT("PA"), 40.4407, -80.0002, 0.83f, 0.88f, 0.80f, 0.66f, 0.95f, 0.92f, 0.78f, 0.86f);
    Add(TEXT("seattle_downtown"), TEXT("Seattle Vertical Rain"), TEXT("WA"), 47.6080, -122.3351, 0.93f, 0.78f, 0.91f, 0.88f, 0.80f, 0.48f, 0.88f, 0.83f);
    Add(TEXT("honolulu_waikiki"), TEXT("Honolulu High-Rise Coast"), TEXT("HI"), 21.2793, -157.8294, 0.88f, 0.45f, 0.82f, 0.79f, 1.00f, 0.16f, 0.80f, 0.76f);
    Add(TEXT("sanjuan_oldcity"), TEXT("San Juan Rooftops"), TEXT("PR"), 18.4655, -66.1057, 0.86f, 0.58f, 0.76f, 0.91f, 0.96f, 0.10f, 0.86f, 0.90f);
    Add(TEXT("denver_core"), TEXT("Denver Skyline Core"), TEXT("CO"), 39.7420, -104.9915, 0.87f, 0.72f, 0.86f, 0.84f, 0.12f, 0.18f, 0.83f, 0.82f);
    Add(TEXT("boston_harbor"), TEXT("Boston Harbor Blocks"), TEXT("MA"), 42.3572, -71.0522, 0.94f, 0.40f, 0.80f, 0.72f, 0.93f, 0.42f, 0.91f, 0.90f);
}
