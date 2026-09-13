param(
    [string]$RepoRoot = $(if ($env:HORIZON_REPO_ROOT) { $env:HORIZON_REPO_ROOT } else { "C:\BridgePoint\bridgepoint-live" }),
    [string]$BuildRoot = "C:\BridgePoint\HorizonBuilds",
    [int]$PollSeconds = 60
)

$ErrorActionPreference = "Stop"
$Mutex = New-Object System.Threading.Mutex($false, "Global\BridgePointHorizonHostAgent")
if (-not $Mutex.WaitOne(0, $false)) {
    Write-Host "Another Horizon host agent is already running."
    exit 0
}

function Invoke-Git([string[]]$Args) {
    $output = & git -C $RepoRoot @Args 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "git $($Args -join ' ') failed: $output"
    }
    return ($output -join [Environment]::NewLine).Trim()
}

function Get-Manifest([string]$ArchiveDir) {
    $path = Join-Path $ArchiveDir "native-build.json"
    if (!(Test-Path $path)) { return $null }
    try { return Get-Content $path -Raw | ConvertFrom-Json } catch { return $null }
}

function Get-CurrentArchive {
    $pointer = Join-Path $BuildRoot "current.txt"
    if (!(Test-Path $pointer)) { return $null }
    $value = (Get-Content $pointer -Raw).Trim()
    if ([string]::IsNullOrWhiteSpace($value) -or !(Test-Path $value)) { return $null }
    return $value
}

function Set-CurrentArchive([string]$ArchiveDir) {
    New-Item -ItemType Directory -Force -Path $BuildRoot | Out-Null
    Set-Content -Encoding UTF8 -Path (Join-Path $BuildRoot "current.txt") -Value $ArchiveDir
}

function Stop-StreamingStack {
    $archive = Get-CurrentArchive
    if (!$archive) { return }

    $pidFile = Join-Path $archive "pixelstream-processes.json"
    if (Test-Path $pidFile) {
        try {
            $pids = Get-Content $pidFile -Raw | ConvertFrom-Json
            foreach ($id in @($pids.game_pid, $pids.signalling_pid, $pids.supervisor_pid)) {
                if ($id -and [int]$id -ne $PID) {
                    Stop-Process -Id ([int]$id) -Force -ErrorAction SilentlyContinue
                }
            }
        } catch {
            Write-Warning ("Could not read old Pixel Streaming PID file: " + $_.Exception.Message)
        }
        Remove-Item -Force -ErrorAction SilentlyContinue $pidFile
    }
}

function Test-StreamingStack([string]$ArchiveDir) {
    if (!$ArchiveDir) { return $false }
    $pidFile = Join-Path $ArchiveDir "pixelstream-processes.json"
    if (!(Test-Path $pidFile)) { return $false }
    try {
        $pids = Get-Content $pidFile -Raw | ConvertFrom-Json
        if (!$pids.game_pid -or !$pids.supervisor_pid) { return $false }
        $game = Get-Process -Id ([int]$pids.game_pid) -ErrorAction SilentlyContinue
        $supervisor = Get-Process -Id ([int]$pids.supervisor_pid) -ErrorAction SilentlyContinue
        return [bool]($game -and $supervisor)
    } catch {
        return $false
    }
}

function Start-StreamingStack([string]$ArchiveDir) {
    $script = Join-Path $RepoRoot "unreal\BridgePointHorizon\Scripts\run_horizon_pixelstream.ps1"
    if (!(Test-Path $script)) { throw "Pixel Streaming supervisor missing: $script" }

    $args = @(
        "-NoProfile",
        "-ExecutionPolicy", "Bypass",
        "-File", $script,
        "-ArchiveDir", $ArchiveDir
    )

    $env:RUNNER_TRACKING_ID = ""
    Start-Process -FilePath "powershell.exe" -ArgumentList $args -WindowStyle Hidden | Out-Null

    for ($i = 0; $i -lt 30; $i++) {
        Start-Sleep -Seconds 1
        if (Test-StreamingStack $ArchiveDir) {
            Write-Host "HORIZON_HOST_STREAM_ONLINE $ArchiveDir"
            return
        }
    }
    throw "Pixel Streaming stack did not become healthy within 30 seconds."
}

function Build-NewTree([string]$TreeSha) {
    $short = if ($TreeSha.Length -gt 12) { $TreeSha.Substring(0, 12) } else { $TreeSha }
    $archive = Join-Path $BuildRoot $short
    $manifest = Get-Manifest $archive

    if ($manifest -and
        [string]$manifest.source_tree_sha -eq $TreeSha -and
        (Test-Path ([string]$manifest.executable))) {
        return $archive
    }

    New-Item -ItemType Directory -Force -Path $archive | Out-Null
    $validator = Join-Path $RepoRoot "unreal\BridgePointHorizon\Scripts\validate_horizon_source.py"
    & python $validator
    if ($LASTEXITCODE -ne 0) {
        throw "Horizon source validation failed; preserving current stream."
    }

    $builder = Join-Path $RepoRoot "unreal\BridgePointHorizon\Scripts\build_horizon_native.ps1"
    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $builder -Configuration Shipping -ArchiveDir $archive
    if ($LASTEXITCODE -ne 0) {
        throw "Horizon native package failed; preserving current stream."
    }

    $manifest = Get-Manifest $archive
    if (!$manifest -or [string]$manifest.source_tree_sha -ne $TreeSha) {
        throw "Native build manifest did not match the expected Horizon source tree."
    }

    return $archive
}

function Remove-OldBuilds([string]$KeepArchive) {
    if (!(Test-Path $BuildRoot)) { return }
    $dirs = Get-ChildItem $BuildRoot -Directory |
        Where-Object { $_.FullName -ne $KeepArchive } |
        Sort-Object LastWriteTimeUtc -Descending

    foreach ($dir in ($dirs | Select-Object -Skip 2)) {
        try { Remove-Item -Recurse -Force $dir.FullName } catch {}
    }
}

try {
    if (!(Test-Path (Join-Path $RepoRoot ".git"))) {
        New-Item -ItemType Directory -Force -Path (Split-Path $RepoRoot -Parent) | Out-Null
        & git clone https://github.com/olekingkole28-dot/bridgepoint-live.git $RepoRoot
        if ($LASTEXITCODE -ne 0) { throw "Could not clone BridgePoint Horizon." }
    }

    while ($true) {
        try {
            Invoke-Git @("fetch", "origin", "main", "--prune") | Out-Null
            $remoteSha = Invoke-Git @("rev-parse", "origin/main")
            $remoteTree = Invoke-Git @("rev-parse", "origin/main:unreal/BridgePointHorizon")
            $localSha = Invoke-Git @("rev-parse", "HEAD")

            if ($localSha -ne $remoteSha) {
                Invoke-Git @("reset", "--hard", "origin/main") | Out-Null
                Write-Host ("HORIZON_HOST_UPDATED " + $remoteSha)
            }

            $current = Get-CurrentArchive
            $currentManifest = if ($current) { Get-Manifest $current } else { $null }
            $needBuild = (-not $currentManifest) -or
                ([string]$currentManifest.source_tree_sha -ne $remoteTree) -or
                (-not (Test-Path ([string]$currentManifest.executable)))

            if ($needBuild) {
                Write-Host ("HORIZON_HOST_BUILDING_TREE " + $remoteTree)
                $newArchive = Build-NewTree $remoteTree

                Stop-StreamingStack
                Set-CurrentArchive $newArchive
                Start-StreamingStack $newArchive
                Remove-OldBuilds $newArchive
            }
            elseif (!(Test-StreamingStack $current)) {
                Write-Warning "Native stream is down; restarting the current verified package."
                Stop-StreamingStack
                Start-StreamingStack $current
            }
        }
        catch {
            Write-Error ("Horizon host iteration failed: " + $_.Exception.Message) -ErrorAction Continue
        }

        Start-Sleep -Seconds ([Math]::Max(20, $PollSeconds))
    }
}
finally {
    try { $Mutex.ReleaseMutex() } catch {}
    $Mutex.Dispose()
}
