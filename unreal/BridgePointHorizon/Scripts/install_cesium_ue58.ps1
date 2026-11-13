[CmdletBinding()]
param(
    [string]$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,
    [switch]$Force
)

$ErrorActionPreference = "Stop"
$PluginName = "CesiumForUnreal"
$PluginVersion = "2.31.0"
$DownloadUrl = "https://github.com/CesiumGS/cesium-unreal/releases/download/v2.31.0/CesiumForUnreal-58-SourceOnly-v2.31.0.zip"
$ExpectedSha256 = "58EAB3D18AF29AFD399C11B41E52BE837B0F4FE588CE63E13A42426DA5D40E75"

$PluginsDirectory = Join-Path $ProjectRoot "Plugins"
$Destination = Join-Path $PluginsDirectory $PluginName
$WorkDirectory = Join-Path $env:TEMP "BridgePoint-CesiumForUnreal-58-v2.31.0"
$ArchivePath = Join-Path $WorkDirectory "CesiumForUnreal-58-SourceOnly-v2.31.0.zip"
$ExtractDirectory = Join-Path $WorkDirectory "extracted"

if (-not (Test-Path (Join-Path $ProjectRoot "BridgePointHorizon.uproject"))) {
    throw "BridgePointHorizon.uproject was not found at: $ProjectRoot"
}

if (Test-Path $Destination) {
    $InstalledDescriptor = Join-Path $Destination "CesiumForUnreal.uplugin"
    if ((Test-Path $InstalledDescriptor) -and -not $Force) {
        Write-Host "Cesium for Unreal is already present at $Destination. No files changed."
        exit 0
    }

    if (-not $Force) {
        throw "An incomplete CesiumForUnreal folder exists. Review it or rerun with -Force to preserve it as a timestamped backup."
    }

    $Backup = "$Destination.backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
    Move-Item -LiteralPath $Destination -Destination $Backup
    Write-Host "Existing plugin preserved at $Backup"
}

New-Item -ItemType Directory -Force -Path $PluginsDirectory | Out-Null
if (Test-Path $WorkDirectory) {
    Remove-Item -LiteralPath $WorkDirectory -Recurse -Force
}
New-Item -ItemType Directory -Force -Path $ExtractDirectory | Out-Null

try {
    Write-Host "Downloading Cesium for Unreal $PluginVersion source package for UE 5.8..."
    Invoke-WebRequest -Uri $DownloadUrl -OutFile $ArchivePath

    $ActualSha256 = (Get-FileHash -LiteralPath $ArchivePath -Algorithm SHA256).Hash.ToUpperInvariant()
    if ($ActualSha256 -ne $ExpectedSha256) {
        throw "Cesium archive SHA-256 mismatch. Expected $ExpectedSha256 but received $ActualSha256."
    }

    Write-Host "Archive hash verified. Extracting plugin..."
    Expand-Archive -LiteralPath $ArchivePath -DestinationPath $ExtractDirectory -Force

    $Descriptor = Get-ChildItem -LiteralPath $ExtractDirectory -Filter "CesiumForUnreal.uplugin" -File -Recurse |
        Select-Object -First 1
    if (-not $Descriptor) {
        throw "The verified archive did not contain CesiumForUnreal.uplugin."
    }

    $PluginSource = $Descriptor.Directory.FullName
    Copy-Item -LiteralPath $PluginSource -Destination $Destination -Recurse

    if (-not (Test-Path (Join-Path $Destination "CesiumForUnreal.uplugin"))) {
        throw "Cesium plugin installation did not produce the expected descriptor."
    }

    Write-Host ""
    Write-Host "Cesium for Unreal $PluginVersion source plugin installed:"
    Write-Host "  $Destination"
    Write-Host ""
    Write-Host "Next: open BridgePointHorizon.uproject and allow Unreal to build the plugin modules."
    Write-Host "Verify the project opens before configuring any hosted data credentials."
}
finally {
    if (Test-Path $WorkDirectory) {
        Remove-Item -LiteralPath $WorkDirectory -Recurse -Force
    }
}
