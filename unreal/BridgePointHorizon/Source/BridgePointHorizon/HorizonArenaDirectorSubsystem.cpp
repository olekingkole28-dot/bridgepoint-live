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
    TArray<FHorizonArenaCandidate> Ranked = GetRankedArenas(50);
    if (Ranked.IsEmpty())
    {
        SeedFallbackArenas();
        Ranked = GetRankedArenas(50);
    }

    // Fallback only when a pre-match vote is unavailable. Seed offsets the pool,
    // while RotationCounter prevents repeatedly returning the same emergency map.
    const int32 PoolSize = FMath::Max(1, Ranked.Num());
    const int32 SeedOffset = Seed == 0
        ? 0
        : static_cast<int32>(static_cast<uint32>(Seed) % static_cast<uint32>(PoolSize));
    int32 Pick = (SeedOffset + RotationCounter) % PoolSize;

    if (PoolSize > 1 && Ranked[Pick].ArenaId == LastArenaId)
    {
        Pick = (Pick + 1) % PoolSize;
    }

    ++RotationCounter;
    LastArenaId = Ranked[Pick].ArenaId;
    return Ranked[Pick];
}

TArray<FHorizonArenaCandidate> UHorizonArenaDirectorSubsystem::GetVoteCandidates(int32 Seed) const
{
    const TArray<FHorizonArenaCandidate> Ranked = GetRankedArenas(50);
    TArray<FHorizonArenaCandidate> VoteCandidates;
    if (Ranked.IsEmpty())
    {
        return VoteCandidates;
    }

    const int32 PoolSize = Ranked.Num();
    const int32 SeedOffset = Seed == 0
        ? 0
        : static_cast<int32>(static_cast<uint32>(Seed) % static_cast<uint32>(PoolSize));
    VoteCandidates.Add(Ranked[SeedOffset]);

    if (PoolSize > 1)
    {
        VoteCandidates.Add(Ranked[(SeedOffset + 1) % PoolSize]);
    }
    return VoteCandidates;
}

FHorizonArenaCandidate UHorizonArenaDirectorSubsystem::ResolveArenaVote(
    int32 Seed,
    int32 CandidateAVotes,
    int32 CandidateBVotes,
    int32 RandomVotes)
{
    TArray<FHorizonArenaCandidate> Ranked = GetRankedArenas(50);
    if (Ranked.IsEmpty())
    {
        SeedFallbackArenas();
        Ranked = GetRankedArenas(50);
    }

    const TArray<FHorizonArenaCandidate> VoteCandidates = GetVoteCandidates(Seed);
    if (VoteCandidates.IsEmpty())
    {
        return SelectNextArena(Seed);
    }

    int32 PickIndex = 0;
    const int32 HighestCandidateVotes = FMath::Max(CandidateAVotes, CandidateBVotes);
    if (RandomVotes > HighestCandidateVotes)
    {
        const int32 PoolSize = FMath::Max(1, Ranked.Num());
        const uint32 MixedSeed = static_cast<uint32>(Seed) ^
            (static_cast<uint32>(RotationCounter + 1) * 2654435761u);
        PickIndex = static_cast<int32>(MixedSeed % static_cast<uint32>(PoolSize));
        LastArenaId = Ranked[PickIndex].ArenaId;
        ++RotationCounter;
        return Ranked[PickIndex];
    }

    if (VoteCandidates.Num() > 1)
    {
        if (CandidateBVotes > CandidateAVotes)
        {
            PickIndex = 1;
        }
        else if (CandidateAVotes == CandidateBVotes)
        {
            PickIndex = FMath::Abs(Seed) % 2;
        }
    }

    LastArenaId = VoteCandidates[PickIndex].ArenaId;
    ++RotationCounter;
    return VoteCandidates[PickIndex];
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

    // Authoritative 50-map TDM fallback pool. Live backend candidates may refresh
    // the same anchors. Display names stay one word; pre-match selection is vote-driven.
    Add(TEXT("tdm_01_neon_canyon"), TEXT("Neon"), TEXT("NY"), 40.7580, -73.9855, 1.0000f, 0.55f, 0.970f, 0.950f, 0.88f, 0.76f, 0.940f, 0.960f);
    Add(TEXT("tdm_02_wall_street_siege"), TEXT("Vault"), TEXT("NY"), 40.7069, -74.0094, 0.9995f, 0.55f, 0.964f, 0.943f, 0.36f, 0.28f, 0.932f, 0.954f);
    Add(TEXT("tdm_03_canal_crossfire"), TEXT("Canal"), TEXT("NY"), 40.7163, -73.9970, 0.9990f, 0.55f, 0.958f, 0.936f, 0.36f, 0.28f, 0.924f, 0.948f);
    Add(TEXT("tdm_04_grand_central_lockdown"), TEXT("Terminal"), TEXT("NY"), 40.7527, -73.9772, 0.9985f, 0.55f, 0.952f, 0.929f, 0.36f, 0.28f, 0.916f, 0.942f);
    Add(TEXT("tdm_05_brooklyn_core"), TEXT("Borough"), TEXT("NY"), 40.6928, -73.9903, 0.9980f, 0.55f, 0.946f, 0.922f, 0.36f, 0.28f, 0.940f, 0.936f);
    Add(TEXT("tdm_06_dumbo_underfire"), TEXT("Dagger"), TEXT("NY"), 40.7033, -73.9888, 0.9975f, 0.55f, 0.940f, 0.950f, 0.36f, 0.28f, 0.932f, 0.930f);
    Add(TEXT("tdm_07_bedford_blitz"), TEXT("Bedford"), TEXT("NY"), 40.7173, -73.9580, 0.9970f, 0.55f, 0.934f, 0.943f, 0.88f, 0.28f, 0.924f, 0.960f);
    Add(TEXT("tdm_08_loop_warfare"), TEXT("Loop"), TEXT("IL"), 41.8837, -87.6324, 0.9965f, 0.55f, 0.970f, 0.936f, 0.36f, 0.28f, 0.916f, 0.954f);
    Add(TEXT("tdm_09_river_north_rush"), TEXT("River"), TEXT("IL"), 41.8924, -87.6341, 0.9960f, 0.55f, 0.964f, 0.929f, 0.36f, 0.28f, 0.940f, 0.948f);
    Add(TEXT("tdm_10_fulton_frenzy"), TEXT("Fulton"), TEXT("IL"), 41.8866, -87.6498, 0.9955f, 0.55f, 0.958f, 0.922f, 0.36f, 0.76f, 0.932f, 0.942f);
    Add(TEXT("tdm_11_downtown_crossing"), TEXT("Crossing"), TEXT("MA"), 42.3555, -71.0605, 0.9950f, 0.55f, 0.952f, 0.950f, 0.36f, 0.28f, 0.924f, 0.936f);
    Add(TEXT("tdm_12_north_end_pressure"), TEXT("Northend"), TEXT("MA"), 42.3651, -71.0545, 0.9945f, 0.55f, 0.946f, 0.943f, 0.36f, 0.28f, 0.916f, 0.930f);
    Add(TEXT("tdm_13_market_street_mayhem"), TEXT("Market"), TEXT("PA"), 39.9528, -75.1637, 0.9940f, 0.55f, 0.940f, 0.936f, 0.88f, 0.28f, 0.940f, 0.960f);
    Add(TEXT("tdm_14_old_city_breakout"), TEXT("Liberty"), TEXT("PA"), 39.9500, -75.1440, 0.9935f, 0.55f, 0.934f, 0.929f, 0.36f, 0.28f, 0.932f, 0.954f);
    Add(TEXT("tdm_15_capital_grid"), TEXT("Capitol"), TEXT("DC"), 38.8977, -77.0218, 0.9930f, 0.55f, 0.970f, 0.922f, 0.36f, 0.28f, 0.924f, 0.948f);
    Add(TEXT("tdm_16_k_street_killzone"), TEXT("Kilo"), TEXT("DC"), 38.9020, -77.0349, 0.9925f, 0.55f, 0.964f, 0.950f, 0.36f, 0.28f, 0.916f, 0.942f);
    Add(TEXT("tdm_17_brickell_burn"), TEXT("Brickell"), TEXT("FL"), 25.7601, -80.1952, 0.9920f, 0.55f, 0.958f, 0.943f, 0.36f, 0.28f, 0.940f, 0.936f);
    Add(TEXT("tdm_18_biscayne_blackout"), TEXT("Biscayne"), TEXT("FL"), 25.7751, -80.1900, 0.9915f, 0.55f, 0.952f, 0.936f, 0.36f, 0.28f, 0.932f, 0.930f);
    Add(TEXT("tdm_19_broadway_burnout"), TEXT("Broadway"), TEXT("CA"), 34.0451, -118.2501, 0.9910f, 0.55f, 0.946f, 0.929f, 0.88f, 0.76f, 0.924f, 0.960f);
    Add(TEXT("tdm_20_figueroa_fireline"), TEXT("Figueroa"), TEXT("CA"), 34.0506, -118.2570, 0.9905f, 0.55f, 0.940f, 0.922f, 0.36f, 0.28f, 0.916f, 0.954f);
    Add(TEXT("tdm_21_hollywood_havoc"), TEXT("Havoc"), TEXT("CA"), 34.1017, -118.3269, 0.9900f, 0.55f, 0.934f, 0.950f, 0.36f, 0.28f, 0.940f, 0.948f);
    Add(TEXT("tdm_22_fidi_vertical"), TEXT("Skyline"), TEXT("CA"), 37.7946, -122.3999, 0.9895f, 0.55f, 0.970f, 0.943f, 0.36f, 0.28f, 0.932f, 0.942f);
    Add(TEXT("tdm_23_union_square_uprising"), TEXT("Union"), TEXT("CA"), 37.7879, -122.4075, 0.9890f, 0.55f, 0.964f, 0.936f, 0.36f, 0.28f, 0.924f, 0.936f);
    Add(TEXT("tdm_24_dragon_gate"), TEXT("Dragon"), TEXT("CA"), 37.7941, -122.4078, 0.9885f, 0.55f, 0.958f, 0.929f, 0.36f, 0.28f, 0.916f, 0.930f);
    Add(TEXT("tdm_25_emerald_core"), TEXT("Emerald"), TEXT("WA"), 47.6096, -122.3360, 0.9880f, 0.55f, 0.952f, 0.922f, 0.88f, 0.28f, 0.940f, 0.960f);
    Add(TEXT("tdm_26_pioneer_pressure"), TEXT("Pioneer"), TEXT("WA"), 47.6021, -122.3336, 0.9875f, 0.55f, 0.946f, 0.950f, 0.36f, 0.28f, 0.932f, 0.954f);
    Add(TEXT("tdm_27_bourbon_brawl"), TEXT("Bourbon"), TEXT("LA"), 29.9584, -90.0644, 0.9870f, 0.55f, 0.940f, 0.943f, 0.36f, 0.28f, 0.924f, 0.948f);
    Add(TEXT("tdm_28_canal_siege"), TEXT("Crescent"), TEXT("LA"), 29.9514, -90.0715, 0.9865f, 0.55f, 0.934f, 0.936f, 0.36f, 0.76f, 0.916f, 0.942f);
    Add(TEXT("tdm_29_neon_strip"), TEXT("Mirage"), TEXT("NV"), 36.1147, -115.1728, 0.9860f, 0.55f, 0.970f, 0.929f, 0.36f, 0.28f, 0.940f, 0.936f);
    Add(TEXT("tdm_30_fremont_fury"), TEXT("Fremont"), TEXT("NV"), 36.1708, -115.1440, 0.9855f, 0.55f, 0.964f, 0.922f, 0.36f, 0.28f, 0.932f, 0.930f);
    Add(TEXT("tdm_31_gaslamp_clash"), TEXT("Gaslamp"), TEXT("CA"), 32.7115, -117.1600, 0.9850f, 0.55f, 0.958f, 0.950f, 0.88f, 0.28f, 0.924f, 0.960f);
    Add(TEXT("tdm_32_india_street_assault"), TEXT("Marina"), TEXT("CA"), 32.7242, -117.1682, 0.9845f, 0.55f, 0.952f, 0.943f, 0.36f, 0.28f, 0.916f, 0.954f);
    Add(TEXT("tdm_33_sixth_street_shutdown"), TEXT("Sixth"), TEXT("TX"), 30.2676, -97.7398, 0.9840f, 0.55f, 0.946f, 0.936f, 0.36f, 0.28f, 0.940f, 0.948f);
    Add(TEXT("tdm_34_rainey_rush"), TEXT("Rainey"), TEXT("TX"), 30.2587, -97.7390, 0.9835f, 0.55f, 0.940f, 0.929f, 0.36f, 0.28f, 0.932f, 0.942f);
    Add(TEXT("tdm_35_main_street_firefight"), TEXT("Mainline"), TEXT("TX"), 32.7800, -96.8003, 0.9830f, 0.55f, 0.934f, 0.922f, 0.36f, 0.28f, 0.924f, 0.936f);
    Add(TEXT("tdm_36_deep_ellum_drop"), TEXT("Ellum"), TEXT("TX"), 32.7840, -96.7844, 0.9825f, 0.55f, 0.970f, 0.950f, 0.36f, 0.28f, 0.916f, 0.930f);
    Add(TEXT("tdm_37_bayou_core"), TEXT("Bayou"), TEXT("TX"), 29.7589, -95.3677, 0.9820f, 0.55f, 0.964f, 0.943f, 0.88f, 0.76f, 0.940f, 0.960f);
    Add(TEXT("tdm_38_midtown_pressure"), TEXT("Midtown"), TEXT("TX"), 29.7410, -95.3771, 0.9815f, 0.55f, 0.958f, 0.936f, 0.36f, 0.28f, 0.932f, 0.954f);
    Add(TEXT("tdm_39_peachtree_fireline"), TEXT("Peachtree"), TEXT("GA"), 33.7548, -84.3900, 0.9810f, 0.55f, 0.952f, 0.929f, 0.36f, 0.28f, 0.924f, 0.948f);
    Add(TEXT("tdm_40_midtown_vertical"), TEXT("Apex"), TEXT("GA"), 33.7833, -84.3831, 0.9805f, 0.55f, 0.946f, 0.922f, 0.36f, 0.28f, 0.916f, 0.942f);
    Add(TEXT("tdm_41_lodo_lockdown"), TEXT("Lodo"), TEXT("CO"), 39.7534, -104.9994, 0.9800f, 0.55f, 0.940f, 0.950f, 0.36f, 0.28f, 0.940f, 0.936f);
    Add(TEXT("tdm_42_mile_high_core"), TEXT("Altitude"), TEXT("CO"), 39.7440, -104.9920, 0.9795f, 0.55f, 0.934f, 0.943f, 0.36f, 0.28f, 0.932f, 0.930f);
    Add(TEXT("tdm_43_steel_triangle"), TEXT("Forge"), TEXT("PA"), 40.4406, -80.0002, 0.9790f, 0.55f, 0.970f, 0.936f, 0.88f, 0.28f, 0.924f, 0.960f);
    Add(TEXT("tdm_44_strip_district_siege"), TEXT("Strip"), TEXT("PA"), 40.4515, -79.9825, 0.9785f, 0.55f, 0.964f, 0.929f, 0.36f, 0.28f, 0.916f, 0.954f);
    Add(TEXT("tdm_45_harbor_lockdown"), TEXT("Harbor"), TEXT("MD"), 39.2865, -76.6122, 0.9780f, 0.55f, 0.958f, 0.922f, 0.36f, 0.28f, 0.940f, 0.948f);
    Add(TEXT("tdm_46_charm_city_crossfire"), TEXT("Charm"), TEXT("MD"), 39.2895, -76.6170, 0.9775f, 0.55f, 0.952f, 0.950f, 0.36f, 0.76f, 0.932f, 0.942f);
    Add(TEXT("tdm_47_motor_city_core"), TEXT("Motown"), TEXT("MI"), 42.3317, -83.0466, 0.9770f, 0.55f, 0.946f, 0.943f, 0.36f, 0.28f, 0.924f, 0.936f);
    Add(TEXT("tdm_48_terminal_tower"), TEXT("Tower"), TEXT("OH"), 41.4972, -81.6946, 0.9765f, 0.55f, 0.940f, 0.936f, 0.36f, 0.28f, 0.916f, 0.930f);
    Add(TEXT("tdm_49_broadway_blitz"), TEXT("Nash"), TEXT("TN"), 36.1600, -86.7785, 0.9760f, 0.55f, 0.934f, 0.929f, 0.88f, 0.28f, 0.940f, 0.960f);
    Add(TEXT("tdm_50_phoenix_solstice"), TEXT("Solstice"), TEXT("AZ"), 33.4484, -112.0740, 0.9755f, 0.70f, 0.940f, 0.900f, 0.18f, 0.18f, 0.924f, 0.954f);
}
