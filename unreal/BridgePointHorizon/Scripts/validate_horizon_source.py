#!/usr/bin/env python3
import json
import py_compile
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
UE = ROOT / "unreal" / "BridgePointHorizon"

errors = []

def require(condition, message):
    if not condition:
        errors.append(message)

def read(path):
    p = ROOT / path
    require(p.exists(), f"missing: {path}")
    return p.read_text(encoding="utf-8") if p.exists() else ""

uproject_path = UE / "BridgePointHorizon.uproject"
uproject = json.loads(uproject_path.read_text(encoding="utf-8"))
module_names = {m.get("Name") for m in uproject.get("Modules", [])}
plugin_names = {p.get("Name") for p in uproject.get("Plugins", []) if p.get("Enabled")}

require("BridgePointHorizon" in module_names, "BridgePointHorizon runtime module missing")
for plugin in {
    "EnhancedInput", "PCG", "StateTree", "GameplayAbilities", "MassAI",
    "ChaosVehiclesPlugin", "Water", "Niagara", "Metasound", "AudioModulation",
    "OnlineSubsystemEOS", "EOSVoiceChat", "PythonScriptPlugin", "ProceduralMeshComponent"
}:
    require(plugin in plugin_names, f"required plugin not enabled: {plugin}")

build = read("unreal/BridgePointHorizon/Source/BridgePointHorizon/BridgePointHorizon.Build.cs")
for dep in {
    "EnhancedInput", "GameplayTags", "GameplayAbilities", "AIModule",
    "NavigationSystem", "OnlineSubsystem", "OnlineSubsystemUtils", "VoiceChat",
    "HTTP", "Json", "JsonUtilities", "ProceduralMeshComponent"
}:
    require(f'"{dep}"' in build, f"missing module dependency: {dep}")

required_source = [
    "HorizonAutopilotSubsystem",
    "HorizonGameMode",
    "HorizonPlayerCharacter",
    "HorizonGameStateSubsystem",
    "HorizonArenaDirectorSubsystem",
    "HorizonGeneratedInterior",
    "HorizonZipline",
    "HorizonInfectedDirectorSubsystem",
    "HorizonChallengeDirectorSubsystem",
    "HorizonChallengeNPC",
    "HorizonAudioDirectorSubsystem",
    "HorizonZombieWallController",
    "HorizonProgressionSubsystem",
    "HorizonMatchmakingSubsystem",
    "HorizonSocialSubsystem",
    "HorizonRaidDirectorSubsystem",
    "HorizonLoadoutSubsystem",
    "HorizonWeaponRuntimeComponent",
    "HorizonSurvivalSubsystem",
    "HorizonBaseBuildingSubsystem",
    "HorizonEnemyProgressionSubsystem",
    "HorizonWorldStreamSubsystem",
    "HorizonWorldCellRenderer",
    "HorizonWorldRuntime",
]
for stem in required_source:
    h = f"unreal/BridgePointHorizon/Source/BridgePointHorizon/{stem}.h"
    cpp = f"unreal/BridgePointHorizon/Source/BridgePointHorizon/{stem}.cpp"
    ht = read(h)
    cppt = read(cpp)
    require(ht.count("{") == ht.count("}"), f"brace mismatch: {h}")
    require(cppt.count("{") == cppt.count("}"), f"brace mismatch: {cpp}")

game_state_header = read("unreal/BridgePointHorizon/Source/BridgePointHorizon/HorizonGameStateSubsystem.h")
game_state = read("unreal/BridgePointHorizon/Source/BridgePointHorizon/HorizonGameStateSubsystem.cpp")
require("YearOne.DurationDays = 365" in game_state, "Year One must remain 365 days")
require("FMath::Clamp(Lives, 0, 3)" in game_state, "Year One lives must remain capped at three")
require("case EHorizonGameMode::YearOneSurvival" in game_state and "Rules.MaxPartySize = 1" in game_state and "Rules.bConsumesYearOneLives = YearOne.bStarted" in game_state, "Year One mode rules missing")
require("bOwnerAuthorizedYearOneStart = false" in game_state_header, "Year One owner start gate must default locked")
require("!bOwnerAuthorizedYearOneStart" in game_state, "Year One runtime start gate missing")
for token in ["LoadGameFromSlot", "SaveGameToSlot", "YearOneSaveSlot"]:
    require(token in game_state, f"Year One persistence missing: {token}")

default_game = read("unreal/BridgePointHorizon/Config/DefaultGame.ini")
require("bOwnerAuthorizedYearOneStart=False" in default_game, "Year One must remain owner-locked until explicit start approval")

social = read("unreal/BridgePointHorizon/Source/BridgePointHorizon/HorizonSocialSubsystem.cpp")
require("Year One Survival is solo-only." in social, "Year One party rejection missing")
require("bUseLobbiesVoiceChatIfAvailable = true" in social, "lobby voice auto-join is not enabled")

streaming_header = read("unreal/BridgePointHorizon/Source/BridgePointHorizon/HorizonWorldStreamSubsystem.h")
streaming = read("unreal/BridgePointHorizon/Source/BridgePointHorizon/HorizonWorldStreamSubsystem.cpp")
stream_contract = streaming_header + "\n" + streaming
for token in ["bridgepoint-horizon-stream-v3020", "state=%s&lat=%.8f&lon=%.8f", "resolved_jurisdiction"]:
    require(token in stream_contract, f"world stream contract missing: {token}")
for token in ["CellCache", "CacheTtlSeconds", "TryServeCachedCell", "StoreCachedCell", "MaxCachedCells"]:
    require(token in stream_contract, f"short-lived world cell cache missing: {token}")

renderer = read("unreal/BridgePointHorizon/Source/BridgePointHorizon/HorizonWorldCellRenderer.cpp")
for token in [
    "BuildTerrain", "BuildTransport", "BuildWater", "BuildBuildings",
    "TriangulateSimplePolygon", "BuildingPartMaterial", "WaterMaterial",
    "FarBuildingMesh", "ResolveBuildingLodCounts", "MaxCollidableBuildingsPerCell"
]:
    require(token in renderer, f"streamed UE renderer feature missing: {token}")
for token in ["SetCollisionEnabled(ECollisionEnabled::QueryAndPhysics)", "SetCollisionResponseToAllChannels(ECR_Block)"]:
    require(token in renderer, f"streamed terrain collision safeguard missing: {token}")
for token in [
    "visual-only so city-scale density does not multiply physics cost",
    "FarBuildingMesh->CreateMeshSection_LinearColor", "BuildingLodCounts.X",
    "BuildingLodCounts.Y"
]:
    require(token in renderer, f"city silhouette LOD safeguard missing: {token}")

world_lod_tests = read("unreal/BridgePointHorizon/Source/BridgePointHorizon/HorizonWorldLodTests.cpp")
for token in [
    "WITH_DEV_AUTOMATION_TESTS", "World.LOD.BuildingDensityBudget",
    "City tier keeps collision bounded", "preserves thousands of far silhouettes",
    "Sparse cells keep every source-backed building", "Invalid budgets fail closed"
]:
    require(token in world_lod_tests, f"native world LOD QA missing: {token}")


autopilot = read("unreal/BridgePointHorizon/Source/BridgePointHorizon/HorizonAutopilotSubsystem.cpp")
for token in ["r.ScreenPercentage", "r.ViewDistanceScale", "r.Nanite.MaxPixelsPerEdge", "RecommendedCellSpanKm", "MovementSampleRateHz", "MaxActiveInfected"]:
    require(token in autopilot, f"adaptive Horizon autopilot feature missing: {token}")

runtime = read("unreal/BridgePointHorizon/Source/BridgePointHorizon/HorizonWorldRuntime.cpp")
for token in ["RequestWorldCell", "RenderCellJson", "TravelToCell", "UHorizonAutopilotSubsystem", "MaxBuildingsPerCell", "ReportStreamingPressure"]:
    require(token in runtime, f"end-to-end world runtime feature missing: {token}")

interior = read("unreal/BridgePointHorizon/Source/BridgePointHorizon/HorizonGeneratedInterior.cpp")
for token in [
    "AddStairRun", "AddDoor", "AddWindowBayX", "ToggleNearestDoor",
    "AddFloorPlate(FloorCount)", "AddStairRun(FloorCount - 1)", "AddRoofAccess",
    "RoofBulkhead", "RoofDoorHeader", "RoofParapet"
]:
    require(token in interior, f"generated interior traversal feature missing: {token}")

interior_header = read("unreal/BridgePointHorizon/Source/BridgePointHorizon/HorizonGeneratedInterior.h")
require("bGenerateRoofAccess = true" in interior_header,
        "procedural interiors must default to physical roof access")
for token in [
    "bGenerateFictionalDressing = true", "MaxDressingPieces = 48",
    "GetGeneratedDressingPieceCount", "fictional-procedural-gameplay"
]:
    require(token in interior_header, f"fictional interior provenance/budget contract missing: {token}")
for token in [
    "AddFictionalDressing(Floor, Random)", "HorizonFictionalDressing",
    "GeneratedDressingPieceCount >= MaxDressingPieces",
    "SetCollisionEnabled(ECollisionEnabled::NoCollision)",
    "FictionalCrate_", "FictionalDebris_"
]:
    require(token in interior, f"fictional apocalypse dressing behavior missing: {token}")
require("real interior plans" in interior and "source-backed exterior records" in interior,
        "real exterior evidence must remain separated from invented interior dressing")

for token in [
    "PrimaryActorTick.bStartWithTickEnabled = false",
    "bool bAnyDoorStillMoving = false",
    "IsDoorAnimationSettled",
    "SetActorTickEnabled(false)",
    "SetActorTickEnabled(true)",
]:
    require(token in interior, f"interior tick-budget safeguard missing: {token}")

interior_tests = read("unreal/BridgePointHorizon/Source/BridgePointHorizon/HorizonGeneratedInteriorTests.cpp")
for token in [
    "WITH_DEV_AUTOMATION_TESTS", "Interior.Performance.DoorTickBudget",
    "Exact target is settled", "Wrapped angle is settled",
    "Active swing remains awake", "Negative tolerance fails closed",
]:
    require(token in interior_tests, f"native interior performance QA missing: {token}")

audio_header = read("unreal/BridgePointHorizon/Source/BridgePointHorizon/HorizonAudioDirectorSubsystem.h")
audio = read("unreal/BridgePointHorizon/Source/BridgePointHorizon/HorizonAudioDirectorSubsystem.cpp")
for token in [
    "EHorizonSpatialCueClass", "EHorizonFootstepSurface",
    "FHorizonSpatialCueMix", "FHorizonFootstepMix",
    "GetSpatialCueMix", "GetFootstepMix",
    "EHorizonSensoryStinger", "PushPlayerHitFeedback", "ConsumePendingStinger",
    "CombatIntensity", "AmbienceGain", "TransientDuck",
    "EHorizonRegionalAmbience", "FHorizonRegionalAmbienceMix",
    "SetRegionalAmbience", "SetWeatherIntensity01", "GetRegionalAmbienceMix",
    "DesiredWeatherIntensity01", "SmoothedWeatherIntensity01",
    "EHorizonCreatureVocalArchetype", "EHorizonCreatureVocalIntent",
    "FHorizonCreatureVocalMix", "GetCreatureVocalMix"
]:
    require(token in audio_header, f"AAA audio runtime contract missing: {token}")
for token in [
    "MaxDistanceCm = 45000.0f", "bOccluded ? 0.78f",
    "EHorizonFootstepSurface::Metal", "EHorizonFootstepSurface::ShallowWater",
    "Mix.Volume *= 0.42f", "AcousticSpace == EHorizonAcousticSpace::Tunnel",
    "FTSTicker::GetCoreTicker().AddTicker", "CombatReleaseHoldSeconds = 1.75f",
    "FMath::FInterpTo", "EHorizonSensoryStinger::HordeSurge",
    "Mix.AmbienceGain = FMath::Lerp(1.0f, 0.58f", "Mix.EffectsGain *= FMath::Lerp",
    "WeatherInterpSpeed", "EHorizonRegionalAmbience::SoutheastWetlands",
    "EHorizonRegionalAmbience::TropicalTerritory", "Mix.InteriorTransmission = 0.24f",
    "Mix.InteriorTransmission = 0.08f", "Mix.InteriorTransmission = 1.12f",
    "SmoothedWeatherIntensity01 * AmbienceMix.InteriorTransmission"
]:
    require(token in audio, f"AAA audio behavior missing: {token}")
for token in [
    "EHorizonCreatureVocalArchetype::Shambler", "EHorizonCreatureVocalArchetype::Screamer",
    "EHorizonCreatureVocalArchetype::Beast", "EHorizonCreatureVocalIntent::Attack",
    "EHorizonCreatureVocalIntent::Death", "FRandomStream Variation",
    "GetSpatialCueMix(", "Seeded micro-variation"
]:
    require(token in audio, f"infected vocal direction behavior missing: {token}")
require("Stripe" not in audio_header + audio and "Payment" not in audio_header + audio,
        "audio runtime must remain independent of payments")

audio_tests = read("unreal/BridgePointHorizon/Source/BridgePointHorizon/HorizonAudioDirectorTests.cpp")
for token in [
    "WITH_DEV_AUTOMATION_TESTS", "RegionalAmbience.Identity",
    "RegionalAmbience.AcousticTransmission", "Wetlands should emphasize fauna",
    "Desert should emphasize wind over water", "Interior should attenuate exterior fauna",
    "Rooftop wind should remain fully exposed"
]:
    require(token in audio_tests, f"native regional ambience QA missing: {token}")
for token in [
    "Audio.Creatures.VocalDirection", "Attack vocal is stronger than idle vocal",
    "Screamer emphasizes the scream layer", "Occlusion reduces creature vocal volume",
    "Seeded creature vocal pitch is deterministic"
]:
    require(token in audio_tests, f"native creature vocal QA missing: {token}")
require("Stripe" not in audio_tests and "Payment" not in audio_tests,
        "regional ambience QA must remain independent of payments")

progression_header = read("unreal/BridgePointHorizon/Source/BridgePointHorizon/HorizonProgressionSubsystem.h")
progression = read("unreal/BridgePointHorizon/Source/BridgePointHorizon/HorizonProgressionSubsystem.cpp")
for token in [
    "CareerLevel = 1", "MaxCareerLevel = 100", "MaxPrestige = 100",
    "EHorizonRewardType::Badge", "EHorizonRewardType::Banner",
    "AddCareerXP", "RecordKill", "TryPrestige", "CanPrestige"
]:
    require(token in progression_header + progression, f"career/prestige contract missing: {token}")
for token in [
    "State->CareerXP = 0", "State->CareerLevel = 1",
    "State->Prestige < MaxPrestige", "PRESTIGE_COSMETIC_%03d",
    "OutReward.bFree = true", "OutReward.bPremium = false"
]:
    require(token in progression, f"prestige behavior missing: {token}")
prestige_body = progression.partition("bool UHorizonProgressionSubsystem::TryPrestige")[2].partition(
    "FHorizonReward UHorizonProgressionSubsystem::PreviewDailyFreeReward")[0]
require("SeasonXP" not in prestige_body and "SeasonLevel" not in prestige_body,
        "prestige must not erase independent seasonal progress")

matchmaking_header = read("unreal/BridgePointHorizon/Source/BridgePointHorizon/HorizonMatchmakingSubsystem.h")
matchmaking = read("unreal/BridgePointHorizon/Source/BridgePointHorizon/HorizonMatchmakingSubsystem.cpp")
matchmaking_contract = matchmaking_header + "\n" + matchmaking
for token in [
    "SkillMean", "SkillUncertainty", "CareerLevel", "LifetimeKills", "Prestige",
    "InputPool", "PlatformPool", "EstimatedPingMs", "PartySize", "bCrossInputOptIn",
    "EvaluateCompatibility", "HardPingLimitMs = 180", "MinimumEligibleScore = 0.35f"
]:
    require(token in matchmaking_contract, f"fair matchmaking contract missing: {token}")
for token in [
    "INPUT_POOL_OPT_IN_REQUIRED", "CONNECTION_OUTSIDE_LIMIT", "INVALID_PARTY_SIZE",
    "UncertaintyBudget", "SkillPenalty * 0.55f", "ProgressPenalty * 0.12f",
    "KillPenalty * 0.08f", "Result.ConnectionPenalty * 0.16f"
]:
    require(token in matchmaking, f"fair matchmaking behavior missing: {token}")
for forbidden in ["premium", "purchase", "entitle", "reward"]:
    require(forbidden not in matchmaking_contract.lower(),
            f"matchmaking must not use monetization or reward state: {forbidden}")

matchmaking_tests = read("unreal/BridgePointHorizon/Source/BridgePointHorizon/HorizonMatchmakingTests.cpp")
for token in [
    "WITH_DEV_AUTOMATION_TESTS",
    "BalancedProfilesAreEligible",
    "InputLatencyAndPartyGuardrails",
    "SkillUncertaintyWidensSearchFairly",
    "CrossInputRequiresMutualConsent",
    "INPUT_POOL_OPT_IN_REQUIRED",
    "CONNECTION_OUTSIDE_LIMIT",
    "INVALID_PARTY_SIZE",
    "Uncertain.Score01 > Certain.Score01"
]:
    require(token in matchmaking_tests, f"native matchmaking QA missing: {token}")
require("Stripe" not in matchmaking_tests and "Payment" not in matchmaking_tests,
        "matchmaking QA must remain independent of payments")

zombie_wall_header = read("unreal/BridgePointHorizon/Source/BridgePointHorizon/HorizonZombieWallController.h")
zombie_wall = read("unreal/BridgePointHorizon/Source/BridgePointHorizon/HorizonZombieWallController.cpp")
for token in ["UHorizonGameStateSubsystem", "GetZombieWallProgress01", "bHideUntilYearOneStarts"]:
    require(token in zombie_wall, f"Year One zombie-wall clock integration missing: {token}")
for token in [
    "PrimaryActorTick.TickInterval = 2.0f", "RefreshYearOneClock()",
    "SetActorTickInterval(ResolveWallTickInterval", "return 0.25f"
]:
    require(token in zombie_wall, f"Year One wall tick-budget safeguard missing: {token}")
for token in ["FHorizonWallPerimeterLoop", "PlayablePerimeterLoops", "CollapseTargetLocal"]:
    require(token in zombie_wall_header, f"disconnected Year One perimeter contract missing: {token}")
for token in ["GetContractedLoopPoints", "IsPointInsideLoop", "DistanceToLoopBoundary", "EnsureSplineCount"]:
    require(token in zombie_wall, f"playable-perimeter wall geometry missing: {token}")

zombie_wall_tests = read("unreal/BridgePointHorizon/Source/BridgePointHorizon/HorizonZombieWallTests.cpp")
for token in [
    "WITH_DEV_AUTOMATION_TESTS", "Performance.YearOneWallTickBudget",
    "Dormant Year One wall polls no faster than twice per second",
    "Active wall updates faster than dormant wall",
    "Manual wall does not pay per-frame polling cost"
]:
    require(token in zombie_wall_tests, f"native Year One wall performance QA missing: {token}")

challenge_header = read("unreal/BridgePointHorizon/Source/BridgePointHorizon/HorizonChallengeDirectorSubsystem.h")
challenge = read("unreal/BridgePointHorizon/Source/BridgePointHorizon/HorizonChallengeDirectorSubsystem.cpp")
for token in ["UHorizonChallengeSaveGame", "FHorizonChallengeRuntimeState", "FreeItemInventory"]:
    require(token in challenge_header, f"persistent NPC challenge contract missing: {token}")
for token in ["OfferChallenge", "AddChallengeProgress", "ClaimChallengeReward", "LoadGameFromSlot", "SaveGameToSlot"]:
    require(token in challenge, f"NPC challenge execution missing: {token}")
for token in ["GrantFreeSalvage", "GrantFreeUnlock"]:
    require(token in challenge, f"free NPC reward handoff missing: {token}")
for token in [
    "ResolveSurvivalInventoryItem", "ResolveSurvivalInventoryQuantity",
    "ComputeDeferredRewardAmount", "CollectDeferredItemReward",
    "GameInstance->GetSubsystem<UHorizonSurvivalSubsystem>()",
    "Survival->TryAddItem", "State->FreeItemInventory.FindOrAdd(InventoryItem.ToString())"
]:
    require(token in challenge_header + challenge, f"NPC reward-to-inventory integration missing: {token}")

challenge_tests = read("unreal/BridgePointHorizon/Source/BridgePointHorizon/HorizonChallengeDirectorTests.cpp")
for token in [
    "WITH_DEV_AUTOMATION_TESTS", "Challenges.SurvivalRewardIntegration",
    "Medic reward enters usable bandage inventory",
    "Ranger reward enters consumable ration inventory",
    "Unknown reward keys fail closed", "Capacity overflow is deferred exactly once",
    "Over-grant cannot create negative deferred inventory"
]:
    require(token in challenge_tests, f"native NPC reward integration QA missing: {token}")
require("Stripe" not in challenge_tests and "Payment" not in challenge_tests,
        "NPC reward integration QA must remain independent of payments")

challenge_npc = read("unreal/BridgePointHorizon/Source/BridgePointHorizon/HorizonChallengeNPC.cpp")
for token in ["InteractionSphere", "OfferChallenge", "ReportChallengeProgress", "ClaimChallengeReward", "GetChallengeDirector"]:
    require(token in challenge_npc, f"strategic challenge NPC runtime missing: {token}")

survival_header = read("unreal/BridgePointHorizon/Source/BridgePointHorizon/HorizonSurvivalSubsystem.h")
survival = read("unreal/BridgePointHorizon/Source/BridgePointHorizon/HorizonSurvivalSubsystem.cpp")
survival_contract = survival_header + "\n" + survival
for token in [
    "FHorizonSurvivalState", "FHorizonCraftingRecipe", "UHorizonSurvivalSaveGame",
    "TryAddItem", "TryRemoveItem", "TryConsumeItemsAtomically", "TryCraft", "ConsumeItem",
    "AdvanceSurvivalHours", "CarryCapacityKg = 35.0f",
    "ComputeInventoryWeightKg", "CanAffordIngredients", "CanAffordRecipe", "SimulateNeeds"
]:
    require(token in survival_contract, f"survival/crafting contract missing: {token}")
for token in [
    "BridgePointHorizonSurvival", "LoadGameFromSlot", "SaveGameToSlot",
    "TMap<FName, int32> ResultInventory", "consumes nothing",
    "TMap<FName, int32> Required", "MAX_int32 - Ingredient.Quantity",
    "State->Inventory = MoveTemp(ResultInventory)",
    "craft_bandage", "craft_campfire", "craft_water_filter", "craft_repair_kit",
    "SprintHungerMultiplier", "SprintThirstMultiplier",
    "ShelterHungerMultiplier", "ShelterThirstMultiplier",
    "DeprivationDamagePerHour", "FMath::Clamp(DeltaHours, 0.0f, 24.0f)"
]:
    require(token in survival, f"survival/crafting behavior missing: {token}")
for forbidden in ["premium", "purchase", "entitlement", "stripe", "payment"]:
    require(forbidden not in survival_contract.lower(),
            f"survival inventory must remain gameplay-only: {forbidden}")

survival_tests = read("unreal/BridgePointHorizon/Source/BridgePointHorizon/HorizonSurvivalTests.cpp")
for token in [
    "WITH_DEV_AUTOMATION_TESTS", "Survival.CraftingAtomicity",
    "Survival.Needs", "Survival.InventoryWeight",
    "Insufficient ingredients fail before consumption",
    "Sprinting increases thirst drain", "Shelter reduces thirst drain",
    "Combined deprivation damages health", "Known inventory weight is deterministic",
    "Duplicate material entries aggregate before debit",
    "Exact aggregated material debit is affordable",
    "Invalid debit quantities fail closed"
]:
    require(token in survival_tests, f"native survival QA missing: {token}")
require("Stripe" not in survival_tests and "Payment" not in survival_tests,
        "survival QA must remain independent of payments")

base_building_header = read("unreal/BridgePointHorizon/Source/BridgePointHorizon/HorizonBaseBuildingSubsystem.h")
base_building = read("unreal/BridgePointHorizon/Source/BridgePointHorizon/HorizonBaseBuildingSubsystem.cpp")
base_building_contract = base_building_header + "\n" + base_building
for token in [
    "EHorizonBasePieceType", "FHorizonBaseMaterialCost", "FHorizonBasePieceState",
    "UHorizonBaseBuildingSaveGame", "MaxBasePieces = 512", "AttachmentRangeCm = 650.0f",
    "TryBuildPiece", "ApplyPieceDamage", "TryRepairPiece", "GetPieceCost",
    "CanPlacePiece", "ComputeDamagedDurability", "ComputeRepairedDurability",
    "bFictionalGameplayConstruction = true"
]:
    require(token in base_building_contract, f"base building contract missing: {token}")
for token in [
    "BridgePointHorizonBaseBuilding", "LoadGameFromSlot", "SaveGameToSlot",
    "GetSubsystem<UHorizonSurvivalSubsystem>", "TryConsumeItemsAtomically",
    "MaterialDebit.Reserve(Cost.Num())", "FGuid::NewGuid", "ExistingPieces.IsEmpty()", "PieceLimit",
    "MinimumSeparationSq", "AttachmentRangeSq", "repair_kit"
]:
    require(token in base_building, f"persistent base building behavior missing: {token}")
for forbidden in ["premium", "purchase", "entitlement", "stripe", "payment"]:
    require(forbidden not in base_building_contract.lower(),
            f"base building must remain gameplay-only: {forbidden}")

base_building_tests = read("unreal/BridgePointHorizon/Source/BridgePointHorizon/HorizonBaseBuildingTests.cpp")
for token in [
    "WITH_DEV_AUTOMATION_TESTS", "Systems.Base.Placement",
    "Systems.Base.EconomyDurability", "A new base must begin with a foundation",
    "A wall cannot float without a foundation", "Overlapping pieces are rejected",
    "Disconnected pieces are rejected", "The configured piece cap is enforced",
    "Foundation wood quantity", "Damage subtracts durability",
    "Repair clamps to full durability"
]:
    require(token in base_building_tests, f"native base building QA missing: {token}")
require("Stripe" not in base_building_tests and "Payment" not in base_building_tests,
        "base building QA must remain independent of payments")

enemy_progression_header = read("unreal/BridgePointHorizon/Source/BridgePointHorizon/HorizonEnemyProgressionSubsystem.h")
enemy_progression = read("unreal/BridgePointHorizon/Source/BridgePointHorizon/HorizonEnemyProgressionSubsystem.cpp")
enemy_progression_contract = enemy_progression_header + "\n" + enemy_progression
for token in [
    "FHorizonEnemyProgressionContext", "FHorizonEnemyTierProfile",
    "UHorizonEnemyProgressionSaveGame", "EvaluateEncounter", "RecordEncounterOutcome",
    "BuildTierProfile", "ComputeNextWorldThreat", "AveragePrestige", "RecentWinRate01"
]:
    require(token in enemy_progression_contract, f"enemy progression contract missing: {token}")
for token in [
    "BridgePointHorizonEnemyProgression", "LoadGameFromSlot", "SaveGameToSlot",
    "0.75f", "2.25f", "1.42f", "1.34f", "1.10f",
    "Prestige01 * 0.12f", "PerformanceAdjustment", "bBossEligible"
]:
    require(token in enemy_progression, f"bounded enemy progression behavior missing: {token}")
for forbidden in ["premium", "purchase", "entitlement", "stripe", "payment"]:
    require(forbidden not in enemy_progression_contract.lower(),
            f"enemy progression must remain gameplay-only: {forbidden}")

enemy_progression_tests = read("unreal/BridgePointHorizon/Source/BridgePointHorizon/HorizonEnemyProgressionTests.cpp")
for token in [
    "WITH_DEV_AUTOMATION_TESTS", "Enemies.CapabilityScaling", "Enemies.LossRecovery",
    "Enemies.PrestigeGuardrail", "larger encounter budget", "Losses create recovery space",
    "Prestige above 100 cannot inflate encounter pressure"
]:
    require(token in enemy_progression_tests, f"native enemy progression QA missing: {token}")
require("Stripe" not in enemy_progression_tests and "Payment" not in enemy_progression_tests,
        "enemy progression QA must remain independent of payments")


engine_config = read("unreal/BridgePointHorizon/Config/DefaultEngine.ini")
for token in ["/Engine/Maps/Entry", "GlobalDefaultGameMode=/Script/BridgePointHorizon.HorizonGameMode"]:
    require(token in engine_config, f"native bootstrap config missing: {token}")

input_config = read("unreal/BridgePointHorizon/Config/DefaultInput.ini")
for token in ['AxisName="MoveForward"', 'AxisName="MoveRight"', 'AxisName="Lean"', 'ActionName="Sprint"', 'ActionName="Crouch"', 'ActionName="Aim"', 'ActionName="Fire"', 'ActionName="Reload"', 'ActionName="ToggleCamera"', 'ActionName="Prone"', 'ActionName="Slide"']:
    require(token in input_config, f"native movement input missing: {token}")

player_header = read("unreal/BridgePointHorizon/Source/BridgePointHorizon/HorizonPlayerCharacter.h")
player = read("unreal/BridgePointHorizon/Source/BridgePointHorizon/HorizonPlayerCharacter.cpp")
for token in ["MovementSampleRateHz", "ReportCameraSpeedMps", "TryEnableWorldGravity", "StartSprint", "StartAim"]:
    require(token in player, f"native adaptive player feature missing: {token}")
for token in [
    "EquippedWeaponVisual", "EquipWeaponVisual", "WeaponHandSocketName",
    "FirstPersonArms", "FirstPersonWeaponVisual", "SetFirstPersonArmsMesh",
    "FirstPersonWeaponSocketName", "HasFirstPersonArms",
    "EHorizonCameraMode", "SetCameraMode", "ToggleCameraMode", "CachedMoveInput",
    "EHorizonMovementStance", "ProneCapsuleHalfHeight", "ProneCapsuleRadius",
    "SlideDurationSeconds", "GetMovementStance", "IsSliding", "IsProne",
    "LeanDistanceCm", "LeanRollDegrees", "LeanProbeRadiusCm",
    "GetLeanAlpha", "ResolveLeanTarget", "WeaponRuntime"
]:
    require(token in player_header, f"native weapon visual contract missing: {token}")
for token in [
    "AttachWeaponVisualToBestSocket", "AttachFirstPersonWeaponToBestSocket",
    "RefreshFirstPersonVisualState", "SetLeaderPoseComponent",
    "FirstPersonWeaponVisual->SetStaticMesh", "bUseControllerRotationYaw = bControllerFacing",
    "FVector SafeStart = GetActorLocation()"
]:
    require(token in player, f"native player facing/spawn/weapon/first-person implementation missing: {token}")
for token in ["LineTraceComponent", "GroundedLocation", "MOVE_Walking"]:
    require(token in player, f"streamed terrain grounding safeguard missing: {token}")

for token in [
    "ApplyMovementInput(DeltaSeconds)", "CachedMoveInput.GetClampedToMaxSize(1.0f)",
    "Forward * Input.Y + Right * Input.X", "DesiredDirection.Rotation().Yaw",
    "Move->bOrientRotationToMovement = false", "UpdateCameraPresentation",
    "CameraBoom->bDoCollisionTest = !bFirstPerson", "CharacterMesh->SetOwnerNoSee(bFirstPerson)",
    "StartTraversalJump", "ToggleProne", "StartSlide", "UpdateTraversalState",
    "HasStandingClearance", "OverlapBlockingTestByChannel",
    "Capsule->SetCapsuleSize(ProneCapsuleRadius", "SlideBrakingDeceleration * DeltaSeconds",
    "MovementStance == EHorizonMovementStance::Sliding ? 0.22f : 1.0f",
    "BindAxis(TEXT(\"Lean\")", "UpdateLean(DeltaSeconds)",
    "ProbeLeanObstruction", "SweepSingleByChannel",
    "FCollisionShape::MakeSphere(LeanProbeRadiusCm)",
    "CurrentLeanAlpha * LeanDistanceCm",
    "CurrentLeanAlpha * LeanRollDegrees",
    "Stance == EHorizonMovementStance::Prone",
    "Stance == EHorizonMovementStance::Sliding"
]:
    require(token in player, f"native facing/camera regression guard missing: {token}")
require("AddMovementInput(FRotationMatrix" not in player,
        "movement axes must be combined before applying input and facing")
for token in [
    "UHorizonWeaponRuntimeComponent", "BindAction(TEXT(\"Fire\")",
    "BindAction(TEXT(\"Reload\")", "WeaponRuntime->StartFire(bAiming)",
    "WeaponRuntime->BeginReload()", "WeaponRuntime->SetAiming(true)",
]:
    require(token in player_header + player, f"integrated weapon input/runtime missing: {token}")

weapon_header = read("unreal/BridgePointHorizon/Source/BridgePointHorizon/HorizonWeaponRuntimeComponent.h")
weapon = read("unreal/BridgePointHorizon/Source/BridgePointHorizon/HorizonWeaponRuntimeComponent.cpp")
weapon_contract = weapon_header + "\n" + weapon
for token in [
    "FHorizonWeaponSpec", "FHorizonWeaponRuntimeState", "FHorizonWeaponShotResult",
    "RoundsInMagazine", "ReserveRounds", "RoundsPerMinute", "ReloadSeconds",
    "StartFire", "StopFire", "TryFireOnce", "BeginReload", "CancelReload",
    "CanFireRound", "ComputeReloadTransfer", "AdvanceCountdown", "ComputeRecoilImpulse",
    "AdvanceAutomaticCadence",
]:
    require(token in weapon_contract, f"native weapon runtime contract missing: {token}")
for token in [
    "PrimaryComponentTick.bStartWithTickEnabled = false",
    "FireCooldownSeconds = 60.0f / WeaponSpec.RoundsPerMinute",
    "ReloadRemainingSeconds = WeaponSpec.ReloadSeconds",
    "OnShotFired.Broadcast", "AddControllerPitchInput", "AddControllerYawInput",
    "bTriggerHeld && WeaponSpec.bAutomatic", "SetComponentTickEnabled",
    "SafeDeltaSeconds = FMath::Min(DeltaSeconds, 0.50f)",
    "FireCooldownSeconds = AdvanceCountdown", "ReloadRemainingSeconds = AdvanceCountdown",
    "const int32 ShotsDue = AdvanceAutomaticCadence", "ShotIndex < ShotsDue",
    "MaxCatchUpShots", "TimeBudget = FMath::Min(DeltaSeconds, 0.50f)",
]:
    require(token in weapon, f"native weapon behavior missing: {token}")
require("Stripe" not in weapon_contract and "Payment" not in weapon_contract,
        "weapon runtime must remain independent of payments")

weapon_tests = read("unreal/BridgePointHorizon/Source/BridgePointHorizon/HorizonWeaponRuntimeTests.cpp")
for token in [
    "WITH_DEV_AUTOMATION_TESTS", "Weapon.CadenceAndReload", "Weapon.Recoil",
    "Loaded idle weapon can fire", "Cadence blocks early repeat shot",
    "Reload respects reserve", "Horizontal recoil alternates predictably",
    "ADS reduces recoil", "Recoil pattern is deterministic",
    "Two hundred millisecond hitch preserves elapsed weapon time",
    "Countdown overshoot clamps at zero", "Catastrophic stalls use a bounded half-second catch-up",
    "Two hundred millisecond hitch preserves automatic fire cadence",
    "Cadence catch-up never exceeds remaining magazine rounds",
    "Cadence catch-up is bounded per frame", "Bounded backlog remains due for the next frame",
]:
    require(token in weapon_tests, f"native weapon QA missing: {token}")

movement_tests = read("unreal/BridgePointHorizon/Source/BridgePointHorizon/HorizonPlayerMovementTests.cpp")
for token in [
    "WITH_DEV_AUTOMATION_TESTS", "Movement.Lean.Resolver",
    "Controller noise remains inside deadzone",
    "Wall obstruction reduces but does not reverse lean",
    "Near wall margin fully cancels lean",
    "Sprint cancels lean", "Prone cancels lean", "Slide cancels lean"
]:
    require(token in movement_tests, f"native lean QA missing: {token}")
require("Stripe" not in movement_tests and "Payment" not in movement_tests,
        "movement QA must remain independent of payments")


game_mode = read("unreal/BridgePointHorizon/Source/BridgePointHorizon/HorizonGameMode.cpp")
for token in ["AHorizonPlayerCharacter::StaticClass", "AHorizonWorldRuntime::StaticClass", "ChoosePlayerStart_Implementation"]:
    require(token in game_mode, f"native bootstrap game mode feature missing: {token}")

mode_contract_path = ROOT / "app" / "horizon-playable" / "HORIZON_GAME_MODES_V4243.json"
require(mode_contract_path.exists(), "authoritative three-mode contract missing")
if mode_contract_path.exists():
    spec = json.loads(mode_contract_path.read_text(encoding="utf-8"))
    modes = spec.get("authoritative_modes", [])
    keys = [m.get("mode_key") for m in modes]
    require(keys == ["year_one_survival", "infinite_tdm", "outbreak_raid"],
            f"unexpected mode catalog: {keys}")
    by_key = {m["mode_key"]: m for m in modes}
    year = by_key.get("year_one_survival", {})
    require(year.get("party", {}).get("max") == 1, "Year One must be solo")
    require(year.get("party", {}).get("invites_allowed") is False, "Year One invites must be disabled")

importer = read("unreal/BridgePointHorizon/Scripts/horizon_batch_import.py")
for token in [
    "/Game/Horizon/Weapons/Imported", 'return "weapons"',
    "/Game/Horizon/Characters/FirstPerson/Hands/Imported", 'return "hands"',
    "/Game/Horizon/Characters/Grooms/Imported", 'return "grooms"',
    "/Game/Horizon/Characters/Clothing/Imported", 'return "clothing"',
    "/Game/Horizon/VFX/Imported", 'return "vfx"',
    "/Game/Horizon/Visual/Decals/Imported", 'return "decals"',
    "/Game/Horizon/Environment/Foliage/Imported", 'return "foliage"'
]:
    require(token in importer, f"native AAA asset intake missing: {token}")

scalability = read("unreal/BridgePointHorizon/Config/DefaultScalability.ini")
for token in [
    "r.ViewDistanceScale=1.35", "r.TSR.History.ScreenPercentage=200",
    "r.Shadow.Virtual.SMRT.RayCountDirectional=8", "r.Lumen.DiffuseIndirect.Allow=1",
    "r.Lumen.Reflections.Allow=1", "r.MaxAnisotropy=16",
    "fx.Niagara.QualityLevel=3", "foliage.DensityScale=1.0",
    "r.HairStrands.SkyLighting.IntegrationType=1"
]:
    require(token in scalability, f"AAA scalability quality floor missing: {token}")

for token in [
    "r.Nanite.ProjectEnabled=True", "r.Shadow.Virtual.Enable=1",
    "r.AntiAliasingMethod=4", "r.SkinCache.CompileShaders=True",
    "r.HairStrands.Strands=1", "r.VolumetricFog=1",
    "r.Lumen.Reflections.Allow=1", "r.Lumen.DiffuseIndirect.Allow=1"
]:
    require(token in engine_config, f"native AAA renderer baseline missing: {token}")

visual_target_path = ROOT / "app" / "horizon-playable" / "HORIZON_AAA_VISUAL_TARGET_V4260.json"
require(visual_target_path.exists(), "AAA visual target contract missing")
if visual_target_path.exists():
    visual_target = json.loads(visual_target_path.read_text(encoding="utf-8"))
    floor = visual_target.get("production_quality_floor", {})
    require(visual_target.get("target") == "native_unreal_modern_aaa_realism",
            "AAA visual target identifier changed")
    require("MetaHuman" in floor.get("characters", {}).get("target", ""),
            "MetaHuman-quality character target missing")
    require(floor.get("characters", {}).get("first_person") ==
            "dedicated skeletal arms/hands plus separate first-person weapon mount",
            "first-person arms/hands quality contract missing")
    require(floor.get("fallback_policy", {}).get("native_unreal") ==
            "low-poly packs fallback-only, never primary production look",
            "low-poly native fallback-only rule missing")

try:
    py_compile.compile(
        str(UE / "Scripts" / "horizon_batch_import.py"),
        doraise=True
    )
except Exception as exc:
    errors.append(f"asset importer Python syntax failed: {exc}")

if errors:
    print("HORIZON UNREAL SOURCE GATE FAILED")
    for error in errors:
        print(f" - {error}")
    sys.exit(1)

print("HORIZON UNREAL SOURCE GATE PASSED")
print(f"validated {len(required_source)} runtime systems, project plugins, mode contract, and importer syntax")
