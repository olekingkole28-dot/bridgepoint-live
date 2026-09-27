$ErrorActionPreference='Stop'
$TaskName='BridgePoint Autonomous Node'
$RuntimeRoot='C:\BridgePointRuntime'
$AgentPath=Join-Path $RuntimeRoot 'agent\bridgepoint_agent.py'
$Url='https://raw.githubusercontent.com/olekingkole28-dot/bridgepoint-live/live-artifact/downloads/local-ai/bridgepoint_agent_v939.py'
if(-not(Test-Path $AgentPath)){throw "BridgePoint runtime agent not found at $AgentPath"}
$admin=([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if(-not $admin){
  $self=$MyInvocation.MyCommand.Path
  Start-Process powershell.exe -Verb RunAs -ArgumentList @('-NoProfile','-ExecutionPolicy','Bypass','-File',('"' + $self + '"'))
  exit
}
$tmp=$AgentPath+'.v939.tmp'
Invoke-WebRequest -UseBasicParsing -TimeoutSec 90 -Uri $Url -OutFile $tmp
$txt=Get-Content $tmp -Raw
if($txt -notmatch 'AGENT_VERSION=939' -or $txt -notmatch 'MIN_FREE_GB=180.0' -or $txt -notmatch 'def export_parallel'){
  Remove-Item $tmp -Force -ErrorAction SilentlyContinue
  throw 'V939 rescue agent validation failed.'
}
$stamp=Get-Date -Format 'yyyyMMdd-HHmmss'
Copy-Item $AgentPath ($AgentPath+'.pre-v939-'+$stamp+'.bak') -Force
Stop-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2
Move-Item $tmp $AgentPath -Force
Start-ScheduledTask -TaskName $TaskName
Start-Sleep -Seconds 5
$info=Get-ScheduledTaskInfo -TaskName $TaskName
Write-Host ''
Write-Host 'BridgePoint V939 rescue upgrade installed.' -ForegroundColor Green
Write-Host ('Task state: ' + (Get-ScheduledTask -TaskName $TaskName).State)
Write-Host ('Last run: ' + $info.LastRunTime)
Write-Host 'Existing node enrollment and C:\BridgePointData were preserved. No state folders were deleted or recreated.' -ForegroundColor Green
