param(
  [string]$EnrollmentCode = "",
  [switch]$SkipModels
)
$ErrorActionPreference = 'Stop'
$Version = '1055'
$Base = Join-Path $env:LOCALAPPDATA 'BridgePoint'
$Agent = Join-Path $Base 'bridgepoint_local_node_v1055.py'
$Config = Join-Path $Base 'node.json'
$AgentUrl = 'https://bridgepointintelligence.online/app/downloads/bridgepoint_local_node_v1055.py?v=1055'
New-Item -ItemType Directory -Force -Path $Base | Out-Null
Write-Host "BridgePoint Local Node v$Version" -ForegroundColor Cyan
Write-Host "This updater stores only a node-specific token on this PC. It does not store a Supabase service-role key." -ForegroundColor DarkGray

function Find-Python {
  if (Get-Command py -ErrorAction SilentlyContinue) { return @('py','-3') }
  if (Get-Command python -ErrorAction SilentlyContinue) { return @('python') }
  if (Get-Command python3 -ErrorAction SilentlyContinue) { return @('python3') }
  return $null
}

$Py = Find-Python
if (-not $Py) {
  if (Get-Command winget -ErrorAction SilentlyContinue) {
    Write-Host 'Python was not found. Installing Python 3...' -ForegroundColor Yellow
    winget install --id Python.Python.3.13 -e --accept-source-agreements --accept-package-agreements
    $Py = Find-Python
  }
}
if (-not $Py) { throw 'Python 3 is required. Install Python, reopen PowerShell, then run this installer again.' }

Write-Host 'Downloading the current BridgePoint node agent...' -ForegroundColor Cyan
Invoke-WebRequest -UseBasicParsing -Uri $AgentUrl -OutFile $Agent

if (-not (Get-Command ollama -ErrorAction SilentlyContinue)) {
  if (Get-Command winget -ErrorAction SilentlyContinue) {
    Write-Host 'Ollama was not found. Installing Ollama...' -ForegroundColor Yellow
    winget install --id Ollama.Ollama -e --accept-source-agreements --accept-package-agreements
    $env:Path += ';' + (Join-Path $env:LOCALAPPDATA 'Programs\Ollama')
  }
}
if (-not (Get-Command ollama -ErrorAction SilentlyContinue)) { throw 'Ollama is required. Install Ollama, reopen PowerShell, then run this updater again.' }

$PythonExe = $Py[0]
$PythonArgs = @()
if ($Py.Count -gt 1) { $PythonArgs += $Py[1] }
try {
  & $PythonExe @PythonArgs -m pip install --user --upgrade duckdb | Out-Host
} catch {
  Write-Warning 'DuckDB install failed. Local AI will still work; exports will remain gzipped JSONL until DuckDB is installed.'
}

if (-not $SkipModels) {
  Write-Host 'Checking local AI models...' -ForegroundColor Cyan
  ollama pull qwen2.5:3b | Out-Host
  ollama pull deepseek-r1:1.5b | Out-Host
}

if (-not (Test-Path $Config)) {
  if ([string]::IsNullOrWhiteSpace($EnrollmentCode)) {
    $EnrollmentCode = Read-Host 'Paste the one-time enrollment code from BridgePoint Owner > Everything > Exports & Local Node'
  }
  if ([string]::IsNullOrWhiteSpace($EnrollmentCode)) { throw 'An enrollment code is required for a new node.' }
  Write-Host 'Enrolling this PC...' -ForegroundColor Cyan
  & $PythonExe @PythonArgs $Agent --enroll $EnrollmentCode
  if ($LASTEXITCODE -ne 0) { throw 'BridgePoint node enrollment failed.' }
} else {
  Write-Host 'Existing BridgePoint node identity found. Preserving it and updating only the agent.' -ForegroundColor Green
}

$TaskName = 'BridgePoint Local Node'
$ArgPrefix = if ($Py.Count -gt 1) { '-3 ' } else { '' }
$TaskArgs = "$ArgPrefix`"$Agent`" --run"
$Action = New-ScheduledTaskAction -Execute $PythonExe -Argument $TaskArgs -WorkingDirectory $Base
$Trigger = New-ScheduledTaskTrigger -AtLogOn
$Settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -RestartCount 5 -RestartInterval (New-TimeSpan -Minutes 2)
try {
  Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Settings $Settings -Description "BridgePoint local AI + portable export node v$Version" -Force | Out-Null
  Start-ScheduledTask -TaskName $TaskName
  Write-Host 'BridgePoint Local Node scheduled task installed and started.' -ForegroundColor Green
} catch {
  Write-Warning "Could not create the Windows scheduled task automatically: $($_.Exception.Message)"
  Write-Host "You can run it manually with: $PythonExe $TaskArgs"
}

Write-Host ''
Write-Host 'Node status:' -ForegroundColor Cyan
& $PythonExe @PythonArgs $Agent --status
Write-Host ''
Write-Host "Local files: $Base" -ForegroundColor DarkGray
Write-Host "Portable exports: $(Join-Path $Base 'exports')" -ForegroundColor DarkGray
Write-Host 'Done.' -ForegroundColor Green
