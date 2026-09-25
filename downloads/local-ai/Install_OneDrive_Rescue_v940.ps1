$ErrorActionPreference='Stop'
$admin=([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if(-not $admin){
  $self=$MyInvocation.MyCommand.Path
  Start-Process powershell.exe -Verb RunAs -ArgumentList @('-NoProfile','-ExecutionPolicy','Bypass','-File',('"' + $self + '"'))
  exit
}
$TaskName='BridgePoint OneDrive Rescue'
$RuntimeRoot='C:\BridgePointRuntime'
$AgentDir=Join-Path $RuntimeRoot 'agent'
$Py=Join-Path $RuntimeRoot '.venv\Scripts\python.exe'
$Script=Join-Path $AgentDir 'bridgepoint_onedrive_rescue_v940.py'
$Url='https://raw.githubusercontent.com/olekingkole28-dot/bridgepoint-live/live-artifact/downloads/local-ai/bridgepoint_onedrive_rescue_v940.py'

function Find-OneDrive {
  $vals=@($env:OneDriveCommercial,$env:OneDriveConsumer,$env:OneDrive) | Where-Object { $_ -and (Test-Path -LiteralPath $_) }
  if($vals.Count -gt 0){ return $vals[0] }
  $cand=Get-ChildItem -LiteralPath $env:USERPROFILE -Directory -Filter 'OneDrive*' -ErrorAction SilentlyContinue | Select-Object -First 1
  if($cand){ return $cand.FullName }
  return $null
}

$od=Find-OneDrive
if(-not $od){ throw 'No signed-in OneDrive folder was detected for this Windows user. Open OneDrive once and confirm it is signed in, then rerun this installer.' }
if(-not(Test-Path $Py)){ throw "BridgePoint Python runtime not found at $Py" }
New-Item -ItemType Directory -Path $AgentDir -Force | Out-Null
$tmp=$Script+'.tmp'
Invoke-WebRequest -UseBasicParsing -TimeoutSec 90 -Uri $Url -OutFile $tmp
$txt=Get-Content $tmp -Raw
if($txt -notmatch 'agent_version": 940' -or $txt -notmatch 'BridgePointRescue'){ Remove-Item $tmp -Force -ErrorAction SilentlyContinue; throw 'V940 OneDrive rescue validation failed.' }
Move-Item $tmp $Script -Force
New-Item -ItemType Directory -Path (Join-Path $od 'BridgePointRescue') -Force | Out-Null
$Action=New-ScheduledTaskAction -Execute $Py -Argument ('"' + $Script + '"') -WorkingDirectory $AgentDir
$Trigger=New-ScheduledTaskTrigger -AtLogOn -User ("$env:USERDOMAIN\$env:USERNAME")
$Settings=New-ScheduledTaskSettingsSet -StartWhenAvailable -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1) -ExecutionTimeLimit ([TimeSpan]::Zero) -MultipleInstances IgnoreNew
Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Settings $Settings -Force | Out-Null
Start-ScheduledTask -TaskName $TaskName
Start-Sleep -Seconds 5
Write-Host ''
Write-Host 'BridgePoint OneDrive rescue sidecar v940 is running.' -ForegroundColor Green
Write-Host ('OneDrive: ' + $od)
Write-Host ('Cloud rescue folder: ' + (Join-Path $od 'BridgePointRescue'))
Write-Host 'V939 state export was not stopped or reinstalled.' -ForegroundColor Green
Write-Host 'Only completed state bundles are mirrored; active state files stay on the hot SSD.' -ForegroundColor Green
