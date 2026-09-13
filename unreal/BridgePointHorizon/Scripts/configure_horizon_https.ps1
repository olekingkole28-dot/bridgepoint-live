param(
    [Parameter(Mandatory=$true)]
    [string]$StreamDomain,

    [string]$InstallRoot = "C:\BridgePoint\Caddy",
    [string]$TaskName = "BridgePoint Horizon HTTPS"
)

$ErrorActionPreference = "Stop"

$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = New-Object Security.Principal.WindowsPrincipal($identity)
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    throw "Run this script from an elevated Administrator PowerShell."
}

$domain = $StreamDomain.Trim().ToLowerInvariant()
if ($domain -notmatch '^[a-z0-9][a-z0-9.-]+\.[a-z]{2,}$') {
    throw "StreamDomain must be a DNS hostname such as horizon.bridgepointintelligence.online."
}

New-Item -ItemType Directory -Force -Path $InstallRoot | Out-Null
$caddy = Join-Path $InstallRoot "caddy.exe"
$caddyFile = Join-Path $InstallRoot "Caddyfile"

if (!(Test-Path $caddy)) {
    $download = "https://caddyserver.com/api/download?os=windows&arch=amd64"
    Invoke-WebRequest -UseBasicParsing -Uri $download -OutFile $caddy
}

& $caddy version
if ($LASTEXITCODE -ne 0) { throw "Caddy binary validation failed." }

$config = @"
$domain {
    encode zstd gzip
    reverse_proxy 127.0.0.1:8080
}
"@
Set-Content -Encoding UTF8 -Path $caddyFile -Value $config

& $caddy validate --config $caddyFile
if ($LASTEXITCODE -ne 0) { throw "Caddy configuration validation failed." }

foreach ($port in @(80,443)) {
    $rule = "BridgePoint Horizon TCP $port"
    if (!(Get-NetFirewallRule -DisplayName $rule -ErrorAction SilentlyContinue)) {
        New-NetFirewallRule -DisplayName $rule -Direction Inbound -Action Allow -Protocol TCP -LocalPort $port | Out-Null
    }
}

Get-Process caddy -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

$actionArg = 'run --config "' + $caddyFile + '" --adapter caddyfile'
$action = New-ScheduledTaskAction -Execute $caddy -Argument $actionArg
$trigger = New-ScheduledTaskTrigger -AtStartup
$principalTask = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1) -ExecutionTimeLimit ([TimeSpan]::Zero)

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Principal $principalTask -Settings $settings -Force | Out-Null
Start-ScheduledTask -TaskName $TaskName

$publicUrl = "https://" + $domain
[Environment]::SetEnvironmentVariable("HORIZON_PUBLIC_STREAM_URL", $publicUrl, "Machine")
$env:HORIZON_PUBLIC_STREAM_URL = $publicUrl

Write-Host "HORIZON_HTTPS_GATEWAY_CONFIGURED"
Write-Host ("Public URL: " + $publicUrl)
Write-Host "DNS for this hostname must point to the GPU host, and the cloud firewall/security group must allow TCP 80/443."
