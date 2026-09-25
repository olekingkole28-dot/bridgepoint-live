$ErrorActionPreference='Stop'
$admin=([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if(-not $admin){
  $self=$MyInvocation.MyCommand.Path
  Start-Process powershell.exe -Verb RunAs -ArgumentList @('-NoProfile','-ExecutionPolicy','Bypass','-File',('"' + $self + '"'))
  exit
}
$TaskName='BridgePoint OneDrive Full Rescue'
$RuntimeRoot='C:\BridgePointRuntime'
$AgentDir=Join-Path $RuntimeRoot 'agent'
$Py=Join-Path $RuntimeRoot '.venv\Scripts\python.exe'
$Script=Join-Path $AgentDir 'bridgepoint_onedrive_full_rescue_v941.py'
$Url='https://raw.githubusercontent.com/olekingkole28-dot/bridgepoint-live/live-artifact/downloads/local-ai/bridgepoint_onedrive_full_rescue_v941.py'

function Find-OneDrive {
  $vals=@($env:OneDriveCommercial,$env:OneDriveConsumer,$env:OneDrive) | Where-Object { $_ -and (Test-Path -LiteralPath $_) }
  if($vals.Count -gt 0){ return $vals[0] }
  $cand=Get-ChildItem -LiteralPath $env:USERPROFILE -Directory -Filter 'OneDrive*' -ErrorAction SilentlyContinue | Select-Object -First 1
  if($cand){ return $cand.FullName }
  return $null
}

$od=Find-OneDrive
if(-not $od){ throw 'No signed-in OneDrive folder detected. Open OneDrive and confirm the Microsoft 365 account is signed in, then rerun.' }
if(-not(Test-Path $Py)){ throw "BridgePoint Python runtime not found at $Py" }
if(-not(Test-Path 'C:\BridgePointData')){ throw 'C:\BridgePointData is missing. V939 hot export must remain intact.' }

New-Item -ItemType Directory -Path $AgentDir -Force | Out-Null
$tmp=$Script+'.tmp'
Invoke-WebRequest -UseBasicParsing -TimeoutSec 90 -Uri $Url -OutFile $tmp
$txt=Get-Content $tmp -Raw
if($txt -notmatch 'AGENT_VERSION = 941' -or $txt -notmatch 'SUPABASE_EXIT_FULL_RESCUE'){
  Remove-Item $tmp -Force -ErrorAction SilentlyContinue
  throw 'V941 full rescue validation failed.'
}
Move-Item $tmp $Script -Force
New-Item -ItemType Directory -Path (Join-Path $od 'BridgePointRescue') -Force | Out-Null

# Prevent duplicate older OneDrive sidecars only. V939/V939 task is never stopped.
Unregister-ScheduledTask -TaskName 'BridgePoint OneDrive Rescue' -Confirm:$false -ErrorAction SilentlyContinue
Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue

$Action=New-ScheduledTaskAction -Execute $Py -Argument ('"' + $Script + '"') -WorkingDirectory $AgentDir
$Trigger=New-ScheduledTaskTrigger -AtLogOn -User ("$env:USERDOMAIN\$env:USERNAME")
$Settings=New-ScheduledTaskSettingsSet -StartWhenAvailable -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1) -ExecutionTimeLimit ([TimeSpan]::Zero) -MultipleInstances IgnoreNew
Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Settings $Settings -RunLevel Highest -Force | Out-Null
Start-ScheduledTask -TaskName $TaskName

# Keep plugged-in rescue machine awake. Screen may still turn off.
powercfg /change standby-timeout-ac 0 | Out-Null
powercfg /change hibernate-timeout-ac 0 | Out-Null

Start-Sleep -Seconds 5
$task=Get-ScheduledTask -TaskName $TaskName
Write-Host ''
Write-Host 'BridgePoint OneDrive FULL rescue v941 is running.' -ForegroundColor Green
Write-Host ('V939 task was left running. OneDrive: ' + $od) -ForegroundColor Green
Write-Host ('Cloud rescue folder: ' + (Join-Path $od 'BridgePointRescue'))
Write-Host ('Rescue task state: ' + $task.State)
Write-Host 'Two V939 SSD lanes remain active; V941 adds one direct-to-OneDrive state lane plus Storage/control-plane evacuation.' -ForegroundColor Green
Write-Host 'No C:\BridgePointData folders were deleted, moved, or restarted.' -ForegroundColor Green
