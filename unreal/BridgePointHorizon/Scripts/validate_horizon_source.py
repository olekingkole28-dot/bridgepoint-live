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
    "HorizonGameStateSubsystem",
    "HorizonArenaDirectorSubsystem",
    "HorizonGeneratedInterior",
    "HorizonZipline",
    "HorizonInfectedDirectorSubsystem",
    "HorizonChallengeDirectorSubsystem",
    "HorizonAudioDirectorSubsystem",
    "HorizonZombieWallController",
    "HorizonProgressionSubsystem",
    "HorizonSocialSubsystem",
    "HorizonRaidDirectorSubsystem",
    "HorizonLoadoutSubsystem",
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

game_state = read("unreal/BridgePointHorizon/Source/BridgePointHorizon/HorizonGameStateSubsystem.cpp")
require("YearOne.DurationDays = 365" in game_state, "Year One must remain 365 days")
require("FMath::Clamp(Lives, 0, 3)" in game_state, "Year One lives must remain capped at three")
require("case EHorizonGameMode::YearOneSurvival" in game_state and "Rules.MaxPartySize = 1" in game_state and "Rules.bConsumesYearOneLives = YearOne.bStarted" in game_state, "Year One mode rules missing")

social = read("unreal/BridgePointHorizon/Source/BridgePointHorizon/HorizonSocialSubsystem.cpp")
require("YearOne Survival is solo-only" in social, "Year One party rejection missing")
require("bUseLobbiesVoiceChatIfAvailable = true" in social, "lobby voice auto-join is not enabled")

streaming_header = read("unreal/BridgePointHorizon/Source/BridgePointHorizon/HorizonWorldStreamSubsystem.h")
streaming = read("unreal/BridgePointHorizon/Source/BridgePointHorizon/HorizonWorldStreamSubsystem.cpp")
stream_contract = streaming_header + "\n" + streaming
for token in ["bridgepoint-horizon-stream-v3020", "state=%s&lat=%.8f&lon=%.8f", "resolved_jurisdiction"]:
    require(token in stream_contract, f"world stream contract missing: {token}")

renderer = read("unreal/BridgePointHorizon/Source/BridgePointHorizon/HorizonWorldCellRenderer.cpp")
for token in [
    "BuildTerrain", "BuildTransport", "BuildWater", "BuildBuildings",
    "TriangulateSimplePolygon", "BuildingPartMaterial", "WaterMaterial"
]:
    require(token in renderer, f"streamed UE renderer feature missing: {token}")


autopilot = read("unreal/BridgePointHorizon/Source/BridgePointHorizon/HorizonAutopilotSubsystem.cpp")
for token in ["r.ScreenPercentage", "r.ViewDistanceScale", "r.Nanite.MaxPixelsPerEdge", "RecommendedCellSpanKm", "MovementSampleRateHz", "MaxActiveInfected"]:
    require(token in autopilot, f"adaptive Horizon autopilot feature missing: {token}")

runtime = read("unreal/BridgePointHorizon/Source/BridgePointHorizon/HorizonWorldRuntime.cpp")
for token in ["RequestWorldCell", "RenderCellJson", "TravelToCell", "UHorizonAutopilotSubsystem", "MaxBuildingsPerCell", "ReportStreamingPressure"]:
    require(token in runtime, f"end-to-end world runtime feature missing: {token}")

interior = read("unreal/BridgePointHorizon/Source/BridgePointHorizon/HorizonGeneratedInterior.cpp")
for token in ["AddStairRun", "AddDoor", "AddWindowBayX", "ToggleNearestDoor"]:
    require(token in interior, f"generated interior traversal feature missing: {token}")

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
