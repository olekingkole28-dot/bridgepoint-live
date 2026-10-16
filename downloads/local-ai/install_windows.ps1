param(
  [string]$DataRoot = "C:\BridgePointData",
  [string]$RuntimeRoot = "C:\BridgePointRuntime",
  [string]$PrimaryModel = "qwen2.5:3b",
  [string]$ReviewerModel = "deepseek-r1:1.5b",
  [string]$EnrollmentCode = ""
)
$ErrorActionPreference='Stop'
$ProgressPreference='SilentlyContinue'
$Release=938
$ArtifactCommit='dce90da7fc3b72b7bfd3a5757b7b62cef8aadbdf'
$Base='https://raw.githubusercontent.com/olekingkole28-dot/bridgepoint-live/dce90da7fc3b72b7bfd3a5757b7b62cef8aadbdf/downloads/local-ai'
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
$runtimeArgs=@('-NoProfile','-ExecutionPolicy','Bypass','-File',(Join-Path $Bundle 'runtime_install.ps1'),'-DataRoot',$DataRoot,'-RuntimeRoot',$RuntimeRoot,'-PrimaryModel',$PrimaryModel,'-ReviewerModel',$ReviewerModel)
if(-not [string]::IsNullOrWhiteSpace($EnrollmentCode)){ $runtimeArgs += @('-EnrollmentCode',$EnrollmentCode) }
& powershell.exe @runtimeArgs
if($LASTEXITCODE -ne 0){throw "BridgePoint runtime installer exited $LASTEXITCODE"}
Write-Host ("BridgePoint governed desktop runtime v938 installation completed from pinned artifact commit " + $ArtifactCommit + ".") -ForegroundColor Green
