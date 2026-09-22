param(
  [string]$DataRoot = "C:\BridgePointData",
  [string]$RuntimeRoot = "C:\BridgePointRuntime",
  [string]$PrimaryModel = "qwen2.5:3b",
  [string]$ReviewerModel = "deepseek-r1:1.5b"
)
$ErrorActionPreference='Stop'
$ProgressPreference='SilentlyContinue'
$Release=938
$ArtifactCommit='81ba95b1be676f94bcc96b4b7ce2bccd3f348732'
$Base='https://raw.githubusercontent.com/olekingkole28-dot/bridgepoint-live/81ba95b1be676f94bcc96b4b7ce2bccd3f348732/downloads/local-ai'
$Bundle=Join-Path $env:TEMP ("bridgepoint-local-node-v"+$Release)
New-Item -ItemType Directory -Path $Bundle -Force | Out-Null
$files=@('runtime_install.ps1','bridgepoint_agent.py','requirements.txt')
foreach($name in $files){
  $dest=Join-Path $Bundle $name
  Invoke-WebRequest -UseBasicParsing -TimeoutSec 90 -Uri "$Base/$name" -OutFile ($dest+'.tmp')
  Move-Item ($dest+'.tmp') $dest -Force
}
$agent=Get-Content (Join-Path $Bundle 'bridgepoint_agent.py') -Raw
$installer=Get-Content (Join-Path $Bundle 'runtime_install.ps1') -Raw
if($agent -notmatch 'AGENT_VERSION=938'){throw 'BridgePoint release marker mismatch: expected agent v938.'}
if($installer -notmatch 'autonomous node v938 is installed'){throw 'BridgePoint installer release marker mismatch: expected v938.'}
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $Bundle 'runtime_install.ps1') -DataRoot $DataRoot -RuntimeRoot $RuntimeRoot -PrimaryModel $PrimaryModel -ReviewerModel $ReviewerModel
if($LASTEXITCODE -ne 0){throw "BridgePoint runtime installer exited $LASTEXITCODE"}
Write-Host ("BridgePoint governed desktop runtime v938 installation completed from pinned artifact commit " + $ArtifactCommit + ".") -ForegroundColor Green
