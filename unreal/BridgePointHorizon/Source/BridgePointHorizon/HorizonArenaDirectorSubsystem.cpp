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

    // Walk the complete authoritative pool before repeating. Seed only offsets
    // the start point; RotationCounter guarantees automatic map-to-map switching.
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
    // the same anchors, but native/offline play keeps the full rotation available.
    Add(TEXT("tdm_01_neon_canyon"), TEXT("Neon Canyon"), TEXT("NY"), 40.7580, -73.9855, 1.0000f, 0.55f, 0.970f, 0.950f, 0.88f, 0.76f, 0.940f, 0.960f);
    Add(TEXT("tdm_02_wall_street_siege"), TEXT("Wall Street Siege"), TEXT("NY"), 40.7069, -74.0094, 0.9995f, 0.55f, 0.964f, 0.943f, 0.36f, 0.28f, 0.932f, 0.954f);
    Add(TEXT("tdm_03_canal_crossfire"), TEXT("Canal Crossfire"), TEXT("NY"), 40.7163, -73.9970, 0.9990f, 0.55f, 0.958f, 0.936f, 0.36f, 0.28f, 0.924f, 0.948f);
    Add(TEXT("tdm_04_grand_central_lockdown"), TEXT("Grand Central Lockdown"), TEXT("NY"), 40.7527, -73.9772, 0.9985f, 0.55f, 0.952f, 0.929f, 0.36f, 0.28f, 0.916f, 0.942f);
    Add(TEXT("tdm_05_brooklyn_core"), TEXT("Brooklyn Core"), TEXT("NY"), 40.6928, -73.9903, 0.9980f, 0.55f, 0.946f, 0.922f, 0.36f, 0.28f, 0.940f, 0.936f);
    Add(TEXT("tdm_06_dumbo_underfire"), TEXT("DUMBO Underfire"), TEXT("NY"), 40.7033, -73.9888, 0.9975f, 0.55f, 0.940f, 0.950f, 0.36f, 0.28f, 0.932f, 0.930f);
    Add(TEXT("tdm_07_bedford_blitz"), TEXT("Bedford Blitz"), TEXT("NY"), 40.7173, -73.9580, 0.9970f, 0.55f, 0.934f, 0.943f, 0.88f, 0.28f, 0.924f, 0.960f);
    Add(TEXT("tdm_08_loop_warfare"), TEXT("Loop Warfare"), TEXT("IL"), 41.8837, -87.6324, 0.9965f, 0.55f, 0.970f, 0.936f, 0.36f, 0.28f, 0.916f, 0.954f);
    Add(TEXT("tdm_09_river_north_rush"), TEXT("River North Rush"), TEXT("IL"), 41.8924, -87.6341, 0.9960f, 0.55f, 0.964f, 0.929f, 0.36f, 0.28f, 0.940f, 0.948f);
    Add(TEXT("tdm_10_fulton_frenzy"), TEXT("Fulton Frenzy"), TEXT("IL"), 41.8866, -87.6498, 0.9955f, 0.55f, 0.958f, 0.922f, 0.36f, 0.76f, 0.932f, 0.942f);
    Add(TEXT("tdm_11_downtown_crossing"), TEXT("Downtown Crossing"), TEXT("MA"), 42.3555, -71.0605, 0.9950f, 0.55f, 0.952f, 0.950f, 0.36f, 0.28f, 0.924f, 0.936f);
    Add(TEXT("tdm_12_north_end_pressure"), TEXT("North End Pressure"), TEXT("MA"), 42.3651, -71.0545, 0.9945f, 0.55f, 0.946f, 0.943f, 0.36f, 0.28f, 0.916f, 0.930f);
    Add(TEXT("tdm_13_market_street_mayhem"), TEXT("Market Street Mayhem"), TEXT("PA"), 39.9528, -75.1637, 0.9940f, 0.55f, 0.940f, 0.936f, 0.88f, 0.28f, 0.940f, 0.960f);
    Add(TEXT("tdm_14_old_city_breakout"), TEXT("Old City Breakout"), TEXT("PA"), 39.9500, -75.1440, 0.9935f, 0.55f, 0.934f, 0.929f, 0.36f, 0.28f, 0.932f, 0.954f);
    Add(TEXT("tdm_15_capital_grid"), TEXT("Capital Grid"), TEXT("DC"), 38.8977, -77.0218, 0.9930f, 0.55f, 0.970f, 0.922f, 0.36f, 0.28f, 0.924f, 0.948f);
    Add(TEXT("tdm_16_k_street_killzone"), TEXT("K Street Killzone"), TEXT("DC"), 38.9020, -77.0349, 0.9925f, 0.55f, 0.964f, 0.950f, 0.36f, 0.28f, 0.916f, 0.942f);
    Add(TEXT("tdm_17_brickell_burn"), TEXT("Brickell Burn"), TEXT("FL"), 25.7601, -80.1952, 0.9920f, 0.55f, 0.958f, 0.943f, 0.36f, 0.28f, 0.940f, 0.936f);
    Add(TEXT("tdm_18_biscayne_blackout"), TEXT("Biscayne Blackout"), TEXT("FL"), 25.7751, -80.1900, 0.9915f, 0.55f, 0.952f, 0.936f, 0.36f, 0.28f, 0.932f, 0.930f);
    Add(TEXT("tdm_19_broadway_burnout"), TEXT("Broadway Burnout"), TEXT("CA"), 34.0451, -118.2501, 0.9910f, 0.55f, 0.946f, 0.929f, 0.88f, 0.76f, 0.924f, 0.960f);
    Add(TEXT("tdm_20_figueroa_fireline"), TEXT("Figueroa Fireline"), TEXT("CA"), 34.0506, -118.2570, 0.9905f, 0.55f, 0.940f, 0.922f, 0.36f, 0.28f, 0.916f, 0.954f);
    Add(TEXT("tdm_21_hollywood_havoc"), TEXT("Hollywood Havoc"), TEXT("CA"), 34.1017, -118.3269, 0.9900f, 0.55f, 0.934f, 0.950f, 0.36f, 0.28f, 0.940f, 0.948f);
    Add(TEXT("tdm_22_fidi_vertical"), TEXT("FiDi Vertical"), TEXT("CA"), 37.7946, -122.3999, 0.9895f, 0.55f, 0.970f, 0.943f, 0.36f, 0.28f, 0.932f, 0.942f);
    Add(TEXT("tdm_23_union_square_uprising"), TEXT("Union Square Uprising"), TEXT("CA"), 37.7879, -122.4075, 0.9890f, 0.55f, 0.964f, 0.936f, 0.36f, 0.28f, 0.924f, 0.936f);
    Add(TEXT("tdm_24_dragon_gate"), TEXT("Dragon Gate"), TEXT("CA"), 37.7941, -122.4078, 0.9885f, 0.55f, 0.958f, 0.929f, 0.36f, 0.28f, 0.916f, 0.930f);
    Add(TEXT("tdm_25_emerald_core"), TEXT("Emerald Core"), TEXT("WA"), 47.6096, -122.3360, 0.9880f, 0.55f, 0.952f, 0.922f, 0.88f, 0.28f, 0.940f, 0.960f);
    Add(TEXT("tdm_26_pioneer_pressure"), TEXT("Pioneer Pressure"), TEXT("WA"), 47.6021, -122.3336, 0.9875f, 0.55f, 0.946f, 0.950f, 0.36f, 0.28f, 0.932f, 0.954f);
    Add(TEXT("tdm_27_bourbon_brawl"), TEXT("Bourbon Brawl"), TEXT("LA"), 29.9584, -90.0644, 0.9870f, 0.55f, 0.940f, 0.943f, 0.36f, 0.28f, 0.924f, 0.948f);
    Add(TEXT("tdm_28_canal_siege"), TEXT("Canal Siege"), TEXT("LA"), 29.9514, -90.0715, 0.9865f, 0.55f, 0.934f, 0.936f, 0.36f, 0.76f, 0.916f, 0.942f);
    Add(TEXT("tdm_29_neon_strip"), TEXT("Neon Strip"), TEXT("NV"), 36.1147, -115.1728, 0.9860f, 0.55f, 0.970f, 0.929f, 0.36f, 0.28f, 0.940f, 0.936f);
    Add(TEXT("tdm_30_fremont_fury"), TEXT("Fremont Fury"), TEXT("NV"), 36.1708, -115.1440, 0.9855f, 0.55f, 0.964f, 0.922f, 0.36f, 0.28f, 0.932f, 0.930f);
    Add(TEXT("tdm_31_gaslamp_clash"), TEXT("Gaslamp Clash"), TEXT("CA"), 32.7115, -117.1600, 0.9850f, 0.55f, 0.958f, 0.950f, 0.88f, 0.28f, 0.924f, 0.960f);
    Add(TEXT("tdm_32_india_street_assault"), TEXT("India Street Assault"), TEXT("CA"), 32.7242, -117.1682, 0.9845f, 0.55f, 0.952f, 0.943f, 0.36f, 0.28f, 0.916f, 0.954f);
    Add(TEXT("tdm_33_sixth_street_shutdown"), TEXT("Sixth Street Shutdown"), TEXT("TX"), 30.2676, -97.7398, 0.9840f, 0.55f, 0.946f, 0.936f, 0.36f, 0.28f, 0.940f, 0.948f);
    Add(TEXT("tdm_34_rainey_rush"), TEXT("Rainey Rush"), TEXT("TX"), 30.2587, -97.7390, 0.9835f, 0.55f, 0.940f, 0.929f, 0.36f, 0.28f, 0.932f, 0.942f);
    Add(TEXT("tdm_35_main_street_firefight"), TEXT("Main Street Firefight"), TEXT("TX"), 32.7800, -96.8003, 0.9830f, 0.55f, 0.934f, 0.922f, 0.36f, 0.28f, 0.924f, 0.936f);
    Add(TEXT("tdm_36_deep_ellum_drop"), TEXT("Deep Ellum Drop"), TEXT("TX"), 32.7840, -96.7844, 0.9825f, 0.55f, 0.970f, 0.950f, 0.36f, 0.28f, 0.916f, 0.930f);
    Add(TEXT("tdm_37_bayou_core"), TEXT("Bayou Core"), TEXT("TX"), 29.7589, -95.3677, 0.9820f, 0.55f, 0.964f, 0.943f, 0.88f, 0.76f, 0.940f, 0.960f);
    Add(TEXT("tdm_38_midtown_pressure"), TEXT("Midtown Pressure"), TEXT("TX"), 29.7410, -95.3771, 0.9815f, 0.55f, 0.958f, 0.936f, 0.36f, 0.28f, 0.932f, 0.954f);
    Add(TEXT("tdm_39_peachtree_fireline"), TEXT("Peachtree Fireline"), TEXT("GA"), 33.7548, -84.3900, 0.9810f, 0.55f, 0.952f, 0.929f, 0.36f, 0.28f, 0.924f, 0.948f);
    Add(TEXT("tdm_40_midtown_vertical"), TEXT("Midtown Vertical"), TEXT("GA"), 33.7833, -84.3831, 0.9805f, 0.55f, 0.946f, 0.922f, 0.36f, 0.28f, 0.916f, 0.942f);
    Add(TEXT("tdm_41_lodo_lockdown"), TEXT("LoDo Lockdown"), TEXT("CO"), 39.7534, -104.9994, 0.9800f, 0.55f, 0.940f, 0.950f, 0.36f, 0.28f, 0.940f, 0.936f);
    Add(TEXT("tdm_42_mile_high_core"), TEXT("Mile High Core"), TEXT("CO"), 39.7440, -104.9920, 0.9795f, 0.55f, 0.934f, 0.943f, 0.36f, 0.28f, 0.932f, 0.930f);
    Add(TEXT("tdm_43_steel_triangle"), TEXT("Steel Triangle"), TEXT("PA"), 40.4406, -80.0002, 0.9790f, 0.55f, 0.970f, 0.936f, 0.88f, 0.28f, 0.924f, 0.960f);
    Add(TEXT("tdm_44_strip_district_siege"), TEXT("Strip District Siege"), TEXT("PA"), 40.4515, -79.9825, 0.9785f, 0.55f, 0.964f, 0.929f, 0.36f, 0.28f, 0.916f, 0.954f);
    Add(TEXT("tdm_45_harbor_lockdown"), TEXT("Harbor Lockdown"), TEXT("MD"), 39.2865, -76.6122, 0.9780f, 0.55f, 0.958f, 0.922f, 0.36f, 0.28f, 0.940f, 0.948f);
    Add(TEXT("tdm_46_charm_city_crossfire"), TEXT("Charm City Crossfire"), TEXT("MD"), 39.2895, -76.6170, 0.9775f, 0.55f, 0.952f, 0.950f, 0.36f, 0.76f, 0.932f, 0.942f);
    Add(TEXT("tdm_47_motor_city_core"), TEXT("Motor City Core"), TEXT("MI"), 42.3317, -83.0466, 0.9770f, 0.55f, 0.946f, 0.943f, 0.36f, 0.28f, 0.924f, 0.936f);
    Add(TEXT("tdm_48_terminal_tower"), TEXT("Terminal Tower"), TEXT("OH"), 41.4972, -81.6946, 0.9765f, 0.55f, 0.940f, 0.936f, 0.36f, 0.28f, 0.916f, 0.930f);
    Add(TEXT("tdm_49_broadway_blitz"), TEXT("Broadway Blitz"), TEXT("TN"), 36.1600, -86.7785, 0.9760f, 0.55f, 0.934f, 0.929f, 0.88f, 0.28f, 0.940f, 0.960f);
    Add(TEXT("tdm_50_old_san_juan_siege"), TEXT("Old San Juan Siege"), TEXT("PR"), 18.4655, -66.1057, 0.9755f, 0.55f, 0.970f, 0.922f, 0.36f, 0.28f, 0.932f, 0.954f);
}
