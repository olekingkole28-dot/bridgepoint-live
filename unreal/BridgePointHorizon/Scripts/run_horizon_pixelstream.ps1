param(
    [string]$ArchiveDir = "",
    [string]$InfraRoot = "C:\BridgePoint\PixelStreamingInfrastructure-UE5.8",
    [string]$PublicPlayerUrl = $env:HORIZON_PUBLIC_STREAM_URL,
    [int]$HttpPort = 8080,
    [int]$StreamerPort = 8888,
    [int]$Width = 1920,
    [int]$Height = 1080,
    [int]$TargetFps = 60,
    [string]$Region = $env:HORIZON_STREAM_REGION,
    [string]$SupabaseSecretKey = $env:SUPABASE_SECRET_KEY
)

$ErrorActionPreference = "Stop"
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..\..")).Path

if ([string]::IsNullOrWhiteSpace($ArchiveDir)) {
    $ArchiveDir = Join-Path $RepoRoot "artifacts\horizon-native\current"
}

$ManifestPath = Join-Path $ArchiveDir "native-build.json"
if (!(Test-Path $ManifestPath)) {
    throw "Native build manifest missing at $ManifestPath. Run build_horizon_native.ps1 first."
}

$Manifest = Get-Content $ManifestPath -Raw | ConvertFrom-Json
$GameExe = [string]$Manifest.executable
if (!(Test-Path $GameExe)) { throw "Packaged Horizon executable missing at $GameExe" }

if (!(Test-Path $InfraRoot)) {
    New-Item -ItemType Directory -Force -Path (Split-Path $InfraRoot -Parent) | Out-Null
    & git clone --depth 1 --branch UE5.8 https://github.com/EpicGames/PixelStreamingInfrastructure.git $InfraRoot
    if ($LASTEXITCODE -ne 0) { throw "Could not clone Epic Pixel Streaming Infrastructure UE5.8." }
} else {
    & git -C $InfraRoot fetch origin UE5.8 --depth 1
    & git -C $InfraRoot checkout UE5.8
    & git -C $InfraRoot reset --hard origin/UE5.8
}

$StartServer = Join-Path $InfraRoot "SignallingWebServer\platform_scripts\cmd\start.bat"
if (!(Test-Path $StartServer)) { throw "Pixel Streaming signalling launcher missing at $StartServer" }

$ServerArgs = '/c "' + $StartServer + '" --httpPort ' + $HttpPort + ' --streamerPort ' + $StreamerPort
$Signalling = Start-Process -FilePath "cmd.exe" -ArgumentList $ServerArgs -WorkingDirectory $InfraRoot -PassThru

Start-Sleep -Seconds 4
$Signalling.Refresh()
if ($Signalling.HasExited) { throw "Pixel Streaming signalling server exited immediately." }

$GameArgs = @(
    "-PixelStreamingURL=ws://127.0.0.1:$StreamerPort",
    "-RenderOffScreen",
    "-ForceRes",
    "-ResX=$Width",
    "-ResY=$Height",
    "-AudioMixer",
    "-Unattended",
    "-NoSplash"
)

$Game = Start-Process -FilePath $GameExe -ArgumentList $GameArgs -WorkingDirectory (Split-Path $GameExe -Parent) -PassThru
$PidFile = Join-Path $ArchiveDir "pixelstream-processes.json"
@{
    supervisor_pid = $PID
    game_pid = $Game.Id
    signalling_pid = $Signalling.Id
    started_at_utc = (Get-Date).ToUniversalTime().ToString("o")
} | ConvertTo-Json | Set-Content -Encoding UTF8 $PidFile

$StatusEndpoint = "https://xdfsjztwgsbmabshzsjw.supabase.co/functions/v1/bridgepoint-horizon-native-stream-v4248"

function Publish-Heartbeat([string]$Status, [string]$Message) {
    if ([string]::IsNullOrWhiteSpace($PublicPlayerUrl) -or [string]::IsNullOrWhiteSpace($SupabaseSecretKey)) {
        return
    }

    $Payload = @{
        status = $Status
        enabled = ($Status -eq "online" -or $Status -eq "starting" -or $Status -eq "degraded")
        player_url = $PublicPlayerUrl
        region = $Region
        build_sha = [string]$Manifest.source_sha
        fps = $TargetFps
        connected_players = 0
        message = $Message
    } | ConvertTo-Json

    try {
        Invoke-RestMethod -Method Post -Uri $StatusEndpoint -Headers @{ apikey = $SupabaseSecretKey } -ContentType "application/json" -Body $Payload | Out-Null
    } catch {
        Write-Warning ("Native stream heartbeat failed: " + $_.Exception.Message)
    }
}

Publish-Heartbeat "starting" "UE5.8 process launched; waiting for Pixel Streaming 2."
Start-Sleep -Seconds 5
$Game.Refresh()
if ($Game.HasExited) {
    Publish-Heartbeat "error" "UE5.8 process exited during startup."
    throw "Horizon UE5.8 executable exited during startup."
}

Publish-Heartbeat "online" "BridgePoint Horizon UE5.8 Pixel Streaming 2 is online."
Write-Host "HORIZON_PIXEL_STREAMING_ONLINE"
Write-Host ("Player URL: " + $PublicPlayerUrl)
Write-Host ("Local signalling: http://127.0.0.1:" + $HttpPort)
Write-Host ("Streamer WebSocket: ws://127.0.0.1:" + $StreamerPort)

try {
    while (!$Game.HasExited) {
        Publish-Heartbeat "online" "BridgePoint Horizon UE5.8 Pixel Streaming 2 is online."
        Start-Sleep -Seconds 15
        $Game.Refresh()
    }
} finally {
    Publish-Heartbeat "offline" "UE5.8 Pixel Streaming host stopped."
    $Signalling.Refresh()
    if (!$Signalling.HasExited) {
        Stop-Process -Id $Signalling.Id -Force -ErrorAction SilentlyContinue
    }
    Remove-Item -Force -ErrorAction SilentlyContinue $PidFile
}

exit $Game.ExitCode
