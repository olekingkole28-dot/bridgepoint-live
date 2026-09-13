param(
    [string]$UE_ROOT = $env:UE_ROOT,
    [ValidateSet("Development","Shipping")]
    [string]$Configuration = "Shipping",
    [string]$ArchiveDir = ""
)

$ErrorActionPreference = "Stop"

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..\..")).Path
$Project = Join-Path $RepoRoot "unreal\BridgePointHorizon\BridgePointHorizon.uproject"

if ([string]::IsNullOrWhiteSpace($UE_ROOT)) {
    throw "UE_ROOT is required and must point to an Unreal Engine 5.8 installation."
}

$RunUAT = Join-Path $UE_ROOT "Engine\Build\BatchFiles\RunUAT.bat"
if (!(Test-Path $RunUAT)) { throw "RunUAT.bat was not found at $RunUAT" }
if (!(Test-Path $Project)) { throw "BridgePoint Horizon project was not found at $Project" }

if ([string]::IsNullOrWhiteSpace($ArchiveDir)) {
    $ArchiveDir = Join-Path $RepoRoot "artifacts\horizon-native\current"
}
New-Item -ItemType Directory -Force -Path $ArchiveDir | Out-Null

$UatArgs = @(
    "BuildCookRun",
    "-project=$Project",
    "-noP4",
    "-platform=Win64",
    "-clientconfig=$Configuration",
    "-build",
    "-cook",
    "-stage",
    "-package",
    "-pak",
    "-iostore",
    "-archive",
    "-archivedirectory=$ArchiveDir",
    "-prereqs",
    "-utf8output"
)

Write-Host "Packaging BridgePoint Horizon UE5.8 -> $ArchiveDir"
& $RunUAT @UatArgs
if ($LASTEXITCODE -ne 0) { throw "Unreal BuildCookRun failed with exit code $LASTEXITCODE" }

$Exe = Get-ChildItem -Path $ArchiveDir -Recurse -Filter "*.exe" |
    Where-Object { $_.Name -notmatch "CrashReportClient|UnrealPrereq|EpicWebHelper" } |
    Sort-Object Length -Descending |
    Select-Object -First 1
if (!$Exe) { throw "Packaging completed but the Horizon executable was not found." }

$SourceSha = "unknown"
$SourceTreeSha = "unknown"
try {
    $SourceSha = (& git -C $RepoRoot rev-parse HEAD).Trim()
    $SourceTreeSha = (& git -C $RepoRoot rev-parse "HEAD:unreal/BridgePointHorizon").Trim()
} catch {}

$Manifest = [ordered]@{
    engine_version = "5.8"
    configuration = $Configuration
    source_sha = $SourceSha
    source_tree_sha = $SourceTreeSha
    built_at_utc = (Get-Date).ToUniversalTime().ToString("o")
    archive_dir = $ArchiveDir
    executable = $Exe.FullName
    pixel_streaming_plugin = "PixelStreaming2"
}

$ManifestPath = Join-Path $ArchiveDir "native-build.json"
$Manifest | ConvertTo-Json -Depth 4 | Set-Content -Encoding UTF8 $ManifestPath

Write-Host "HORIZON_UE58_PACKAGE_OK"
Write-Host ("Executable: " + $Exe.FullName)
Write-Host ("Manifest: " + $ManifestPath)
