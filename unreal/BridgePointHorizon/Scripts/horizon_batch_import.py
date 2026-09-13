"""
BridgePoint Horizon UE5.8 batch content intake.

Run inside Unreal Editor after staging legally acquired engine-agnostic assets.
This script never downloads assets and never moves .uasset files directly.
"""

import os
from pathlib import Path
import unreal

STAGING = Path(os.environ.get("HORIZON_ASSET_STAGING", "")).expanduser()
EXTENSIONS = {".fbx", ".obj", ".gltf", ".glb", ".usd", ".usda", ".usdc", ".png", ".jpg", ".jpeg", ".tif", ".tiff", ".exr", ".hdr", ".wav", ".flac"}

DESTINATIONS = {
    "audio_weapons": "/Game/Horizon/Audio/Weapons/Imported",
    "audio_footsteps": "/Game/Horizon/Audio/Footsteps/Imported",
    "audio_creatures": "/Game/Horizon/Audio/Creatures/Imported",
    "audio_ambience": "/Game/Horizon/Audio/Ambience/Imported",
    "audio_music": "/Game/Horizon/Audio/Music/Imported",
    "audio_ui": "/Game/Horizon/Audio/UI/Imported",
    "audio": "/Game/Horizon/Audio/Imported",
    "hdri": "/Game/Horizon/Environment/HDRI",
    "materials": "/Game/Horizon/Materials/Imported",
    "vehicles": "/Game/Horizon/Vehicles/Imported",
    "weapons": "/Game/Horizon/Weapons/Imported",
    "characters": "/Game/Horizon/Characters/Imported",
    "creatures": "/Game/Horizon/Creatures/Imported",
    "environment": "/Game/Horizon/Environment/Imported",
}

def classify(path: Path) -> str:
    low = str(path).lower()
    ext = path.suffix.lower()
    if ext in {".wav", ".flac"}:
        if any(k in low for k in ("gun", "rifle", "pistol", "shotgun", "smg", "firearm", "reload", "shell", "bullet", "muzzle", "weapon")):
            return "audio_weapons"
        if any(k in low for k in ("footstep", "step", "walk", "run", "shoe", "boot")):
            return "audio_footsteps"
        if any(k in low for k in ("zombie", "infected", "creature", "monster", "bear", "dog", "spider", "growl", "roar", "scream")):
            return "audio_creatures"
        if any(k in low for k in ("music", "score", "theme", "stinger", "combat_music", "ambient_music")):
            return "audio_music"
        if any(k in low for k in ("ui", "menu", "click", "select", "notify", "notification")):
            return "audio_ui"
        if any(k in low for k in ("wind", "rain", "storm", "thunder", "fire", "water", "city", "forest", "roomtone", "ambience", "ambient")):
            return "audio_ambience"
        return "audio"
    if ext in {".hdr", ".exr"}:
        return "hdri"
    if any(k in low for k in ("material", "texture", "surface", "concrete", "wood", "metal", "roof", "siding", "ground", "asphalt")):
        return "materials"
    if any(k in low for k in ("vehicle", "car", "truck", "bus", "van")):
        return "vehicles"
    if any(k in low for k in ("pistol", "rifle", "shotgun", "smg", "firearm", "weapon", "axe", "knife", "bat", "spear")):
        return "weapons"
    if any(k in low for k in ("character", "human", "survivor")):
        return "characters"
    if any(k in low for k in ("creature", "monster", "infected", "zombie", "animal")):
        return "creatures"
    return "environment"

def task_for(path: Path) -> unreal.AssetImportTask:
    task = unreal.AssetImportTask()
    task.set_editor_property("filename", str(path))
    task.set_editor_property("destination_path", DESTINATIONS[classify(path)])
    task.set_editor_property("automated", True)
    task.set_editor_property("replace_existing", False)
    task.set_editor_property("save", True)
    return task

def main():
    if not STAGING or not STAGING.exists():
        unreal.log_warning("Horizon intake: set HORIZON_ASSET_STAGING to a valid staging directory.")
        return

    files = [
        p for p in STAGING.rglob("*")
        if p.is_file() and p.suffix.lower() in EXTENSIONS and p.suffix.lower() != ".uasset"
    ]
    if not files:
        unreal.log_warning(f"Horizon intake: no supported assets found in {STAGING}")
        return

    tasks = [task_for(path) for path in files]
    unreal.log(f"Horizon intake: importing {len(tasks)} staged assets.")
    tools = unreal.AssetToolsHelpers.get_asset_tools()
    tools.import_asset_tasks(tasks)

    imported = []
    failed = []
    for path, task in zip(files, tasks):
        paths = list(task.get_editor_property("imported_object_paths") or [])
        if paths:
            imported.extend(paths)
            unreal.log(f"Horizon intake OK: {path.name} -> {', '.join(paths)}")
        else:
            failed.append(str(path))
            unreal.log_warning(f"Horizon intake FAILED/EMPTY: {path}")

    for destination in set(DESTINATIONS.values()):
        if unreal.EditorAssetLibrary.does_directory_exist(destination):
            unreal.EditorAssetLibrary.save_directory(destination, only_if_is_dirty=True, recursive=True)

    unreal.log(f"Horizon intake complete: {len(imported)} imported object(s), {len(failed)} source file(s) failed.")
    if failed:
        unreal.log_warning("Horizon intake failed sources:\n" + "\n".join(failed))

if __name__ == "__main__":
    main()
