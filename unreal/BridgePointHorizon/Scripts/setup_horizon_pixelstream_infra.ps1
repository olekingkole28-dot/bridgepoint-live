param(
    [string]$InfraRoot = "C:\BridgePoint\PixelStreamingInfrastructure-UE5.8"
)
$ErrorActionPreference = "Stop"
$Npm = "C:\Program Files\nodejs\npm.cmd"
if (!(Test-Path $Npm)) { throw "Node.js npm.cmd not found at $Npm" }
if (!(Test-Path (Join-Path $InfraRoot "package.json"))) { throw "Epic Pixel Streaming Infrastructure checkout missing at $InfraRoot" }
$env:PATH = "C:\Program Files\nodejs;C:\Users\oleki\AppData\Local\Programs\Git\cmd;" + $env:PATH
Push-Location $InfraRoot
try {
    Write-Host "Installing only the UE5.8 signalling and browser-player workspaces..."
    & $Npm install --no-audit --no-fund --include-workspace-root -w Common -w Signalling -w SignallingWebServer -w Frontend/library -w Frontend/ui-library -w Frontend/implementations/typescript
    if ($LASTEXITCODE -ne 0) { throw "Pixel Streaming dependency install failed: $LASTEXITCODE" }

    $builds = @(
        @("run", "build:cjs", "-w", "Common"),
        @("run", "build:cjs", "-w", "Signalling"),
        @("run", "build", "-w", "SignallingWebServer"),
        @("run", "build:esm", "-w", "Frontend/library"),
        @("run", "build:esm", "-w", "Frontend/ui-library"),
        @("run", "build:dev", "-w", "Frontend/implementations/typescript")
    )
    foreach ($args in $builds) {
        Write-Host ("BUILD " + ($args -join " "))
        & $Npm @args
        if ($LASTEXITCODE -ne 0) { throw "Pixel Streaming build failed: npm $($args -join ' ')" }
    }

    $server = Join-Path $InfraRoot "SignallingWebServer\dist\index.js"
    $player = Join-Path $InfraRoot "SignallingWebServer\www\player.html"
    if (!(Test-Path $server)) { throw "Built signalling entry is missing: $server" }
    if (!(Test-Path $player)) { throw "Built browser player is missing: $player" }
    Write-Host "HORIZON_PIXEL_STREAMING_INFRA_READY"
    Write-Host "Signalling: $server"
    Write-Host "Browser player: $player"
} finally {
    Pop-Location
}

[executed on device: MollieOllie (898525b9-c32e-4ce4-b683-4efb3b88b364)]