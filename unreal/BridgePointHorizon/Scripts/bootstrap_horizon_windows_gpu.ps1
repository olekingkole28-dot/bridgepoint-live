param(
    [Parameter(Mandatory=$true)]
    [string]$UE_ROOT,

    [Parameter(Mandatory=$true)]
    [string]$PublicStreamUrl,

    [Parameter(Mandatory=$true)]
    [string]$SupabaseSecretKey,

    [string]$Region = "us-east",
    [string]$RepoRoot = "C:\BridgePoint\bridgepoint-live",
    [string]$TaskName = "BridgePoint Horizon Native Host"
)

$ErrorActionPreference = "Stop"

$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = New-Object Security.Principal.WindowsPrincipal($identity)
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    throw "Run this bootstrap from an elevated Administrator PowerShell."
}

if (!(Test-Path (Join-Path $UE_ROOT "Engine\Build\BatchFiles\RunUAT.bat"))) {
    throw "UE_ROOT does not contain Unreal Engine 5.8 RunUAT.bat: $UE_ROOT"
}

function Refresh-ProcessPath {
    $machine = [Environment]::GetEnvironmentVariable("Path", "Machine")
    $user = [Environment]::GetEnvironmentVariable("Path", "User")
    $env:Path = $machine + ";" + $user
}

function Ensure-WingetPackage([string]$Command, [string]$PackageId, [string[]]$ExtraArgs = @()) {
    if (Get-Command $Command -ErrorAction SilentlyContinue) { return }
    if (!(Get-Command winget -ErrorAction SilentlyContinue)) {
        throw "$Command is missing and winget is not available to install $PackageId."
    }

    $args = @(
        "install",
        "--id", $PackageId,
        "-e",
        "--silent",
        "--accept-package-agreements",
        "--accept-source-agreements"
    ) + $ExtraArgs

    & winget @args
    if ($LASTEXITCODE -ne 0) { throw "winget failed installing $PackageId" }
    Refresh-ProcessPath
}

Ensure-WingetPackage "git" "Git.Git"
Ensure-WingetPackage "python" "Python.Python.3.12"
Ensure-WingetPackage "node" "OpenJS.NodeJS.LTS"

$programFilesX86 = [Environment]::GetEnvironmentVariable("ProgramFiles(x86)")
$vswhere = Join-Path $programFilesX86 "Microsoft Visual Studio\Installer\vswhere.exe"
$hasCpp = $false
if (Test-Path $vswhere) {
    $install = & $vswhere -latest -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath
    $hasCpp = -not [string]::IsNullOrWhiteSpace(($install -join ""))
}
if (-not $hasCpp) {
    if (!(Get-Command winget -ErrorAction SilentlyContinue)) {
        throw "Visual Studio 2022 C++ build tools are required."
    }
    & winget install --id Microsoft.VisualStudio.2022.BuildTools -e --silent --accept-package-agreements --accept-source-agreements --override "--wait --passive --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"
    if ($LASTEXITCODE -ne 0) { throw "Visual Studio 2022 Build Tools installation failed." }
}

New-Item -ItemType Directory -Force -Path (Split-Path $RepoRoot -Parent) | Out-Null
if (!(Test-Path (Join-Path $RepoRoot ".git"))) {
    & git clone https://github.com/olekingkole28-dot/bridgepoint-live.git $RepoRoot
    if ($LASTEXITCODE -ne 0) { throw "BridgePoint repository clone failed." }
} else {
    & git -C $RepoRoot fetch origin main --prune
    & git -C $RepoRoot reset --hard origin/main
}

[Environment]::SetEnvironmentVariable("UE_ROOT", $UE_ROOT, "Machine")
[Environment]::SetEnvironmentVariable("HORIZON_PUBLIC_STREAM_URL", $PublicStreamUrl, "Machine")
[Environment]::SetEnvironmentVariable("HORIZON_STREAM_REGION", $Region, "Machine")
[Environment]::SetEnvironmentVariable("SUPABASE_SECRET_KEY", $SupabaseSecretKey, "Machine")
[Environment]::SetEnvironmentVariable("HORIZON_REPO_ROOT", $RepoRoot, "Machine")

$env:UE_ROOT = $UE_ROOT
$env:HORIZON_PUBLIC_STREAM_URL = $PublicStreamUrl
$env:HORIZON_STREAM_REGION = $Region
$env:SUPABASE_SECRET_KEY = $SupabaseSecretKey
$env:HORIZON_REPO_ROOT = $RepoRoot

$agent = Join-Path $RepoRoot "unreal\BridgePointHorizon\Scripts\horizon_host_agent.ps1"
if (!(Test-Path $agent)) { throw "Horizon host agent is missing: $agent" }

$actionArg = '-NoProfile -ExecutionPolicy Bypass -File "' + $agent + '"'
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument $actionArg
$trigger = New-ScheduledTaskTrigger -AtStartup
$principalTask = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1) -ExecutionTimeLimit ([TimeSpan]::Zero)

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Principal $principalTask -Settings $settings -Force | Out-Null
Start-ScheduledTask -TaskName $TaskName

Write-Host "HORIZON_WINDOWS_GPU_BOOTSTRAP_OK"
Write-Host ("Task: " + $TaskName)
Write-Host ("Repo: " + $RepoRoot)
Write-Host ("UE root: " + $UE_ROOT)
Write-Host ("Public stream: " + $PublicStreamUrl)
