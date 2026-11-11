param(
    [string]$ArchiveDir = "",
    [string]$InfraRoot = "C:\BridgePoint\PixelStreamingInfrastructure-UE5.8",
    [string]$PublicPlayerUrl = $env:HORIZON_PUBLIC_STREAM_URL,
    [int]$HttpPort = 8080,
    [int]$StreamerPort = 8888,
    [int]$Width = 1280,
    [int]$Height = 720,
    [int]$TargetFps = 30,
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

$ServerEntry = Join-Path $InfraRoot "SignallingWebServer\dist\index.js"
$WebRoot = Join-Path $InfraRoot "SignallingWebServer\www"
$HorizonConfigFile = Join-Path $InfraRoot "SignallingWebServer\horizon-config.json"
$Node = (Get-Command "node.exe" -ErrorAction Stop).Source

if (!(Test-Path $ServerEntry)) {
    throw "Pixel Streaming signalling server is not built. Run setup_horizon_pixelstream_infra.ps1 first."
}
if (!(Test-Path (Join-Path $WebRoot "player.html"))) {
    throw "Pixel Streaming browser frontend is missing at $WebRoot. Run setup_horizon_pixelstream_infra.ps1 first."
}
if (!(Test-Path $HorizonConfigFile)) {
    throw "Horizon-specific signalling config is missing at $HorizonConfigFile."
}
$HorizonConfig = Get-Content $HorizonConfigFile -Raw | ConvertFrom-Json
if ([int]$HorizonConfig.player_port -ne $HttpPort -or [int]$HorizonConfig.streamer_port -ne $StreamerPort) {
    throw "Horizon signalling config ports do not match HttpPort/StreamerPort parameters."
}
if ([int]$HorizonConfig.max_players -ne 1) {
    throw "Horizon host must remain limited to one player on this GPU profile."
}

$LogRoot = Join-Path $ArchiveDir "pixel-stream-logs"
New-Item -ItemType Directory -Force -Path $LogRoot | Out-Null
$ServerStdout = Join-Path $LogRoot "signalling.stdout.log"
$ServerStderr = Join-Path $LogRoot "signalling.stderr.log"
$GameStdout = Join-Path $LogRoot "game.stdout.log"
$GameStderr = Join-Path $LogRoot "game.stderr.log"

$ServerArgs = @(
    $ServerEntry,
    "--config_file",
    $HorizonConfigFile
)
$Signalling = Start-Process -FilePath $Node -ArgumentList $ServerArgs -WorkingDirectory (Join-Path $InfraRoot "SignallingWebServer") -PassThru -WindowStyle Hidden -RedirectStandardOutput $ServerStdout -RedirectStandardError $ServerStderr

$ServerReady = $false
for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep -Seconds 1
    $Signalling.Refresh()
    if ($Signalling.HasExited) {
        $tail = if (Test-Path $ServerStderr) { (Get-Content $ServerStderr -Tail 30 | Out-String) } else { "" }
        throw "Pixel Streaming signalling server exited during startup. $tail"
    }
    try {
        $health = Invoke-WebRequest -UseBasicParsing -Uri ("http://127.0.0.1:" + $HttpPort + "/") -TimeoutSec 2
        if ([int]$health.StatusCode -ge 200 -and [int]$health.StatusCode -lt 500) {
            $ServerReady = $true
            break
        }
    } catch {}
}
if (-not $ServerReady) {
    throw "Pixel Streaming web/signalling endpoint did not become ready on port $HttpPort."
}

$StreamerReady = $false
for ($i = 0; $i -lt 10; $i++) {
    $tcp = $null
    try {
        $tcp = New-Object System.Net.Sockets.TcpClient
        $connect = $tcp.BeginConnect("127.0.0.1", $StreamerPort, $null, $null)
        if ($connect.AsyncWaitHandle.WaitOne(1000)) {
            $tcp.EndConnect($connect)
            $StreamerReady = $true
            break
        }
    } catch {
    } finally {
        if ($tcp) { $tcp.Dispose() }
    }
    Start-Sleep -Milliseconds 500
}
if (-not $StreamerReady) {
    throw "Pixel Streaming streamer WebSocket port $StreamerPort is not listening."
}

$GameArgs = @(
    "-PixelStreamingURL=ws://127.0.0.1:$StreamerPort",
    "-PixelStreamingWebRTCMinPort=49152",
    "-PixelStreamingWebRTCMaxPort=49200",
    "-PixelStreamingEncoderCodec=H264",
    "-PixelStreamingEncoderMaxSessions=1",
    "-PixelStreamingWebRTCMaxFps=$TargetFps",
    "-RenderOffScreen",
    "-ForceRes",
    "-ResX=$Width",
    "-ResY=$Height",
    "-AudioMixer",
    "-Unattended",
    "-NoSplash"
)

$Game = Start-Process -FilePath $GameExe -ArgumentList $GameArgs -WorkingDirectory (Split-Path $GameExe -Parent) -PassThru -WindowStyle Hidden -RedirectStandardOutput $GameStdout -RedirectStandardError $GameStderr
$PidFile = Join-Path $ArchiveDir "pixelstream-processes.json"
@{
    supervisor_pid = $PID
    game_pid = $Game.Id
    signalling_pid = $Signalling.Id
    http_port = $HttpPort
    streamer_port = $StreamerPort
    webrtc_min_port = 49152
    webrtc_max_port = 49200
    width = $Width
    height = $Height
    target_fps = $TargetFps
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
Write-Host ("WebRTC UDP range: 49152-49200")
Write-Host ("Capture profile: " + $Width + "x" + $Height + " @ " + $TargetFps + " FPS")

try {
    while (!$Game.HasExited) {
        $Signalling.Refresh()
        if ($Signalling.HasExited) {
            Publish-Heartbeat "error" "Pixel Streaming signalling server exited."
            throw "Pixel Streaming signalling server exited while Horizon was running."
        }
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
