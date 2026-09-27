$ErrorActionPreference='Stop'
$admin=([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if(-not $admin){$self=$MyInvocation.MyCommand.Path;Start-Process powershell.exe -Verb RunAs -ArgumentList @('-NoProfile','-ExecutionPolicy','Bypass','-File',('"' + $self + '"'));exit}
$Task='BridgePoint OneDrive Complete Rescue'
$Runtime='C:\BridgePointRuntime';$Agent=Join-Path $Runtime 'agent';$Py=Join-Path $Runtime '.venv\Scripts\python.exe';$Script=Join-Path $Agent 'bridgepoint_onedrive_complete_rescue_v942.py'
$Url='https://raw.githubusercontent.com/olekingkole28-dot/bridgepoint-live/live-artifact/downloads/local-ai/bridgepoint_onedrive_complete_rescue_v942.py'
function Find-OneDrive {$v=@($env:OneDriveCommercial,$env:OneDriveConsumer,$env:OneDrive)|Where-Object{$_ -and(Test-Path -LiteralPath $_)};if($v.Count){return $v[0]};$c=Get-ChildItem -LiteralPath $env:USERPROFILE -Directory -Filter 'OneDrive*' -ErrorAction SilentlyContinue|Select-Object -First 1;if($c){return $c.FullName};return $null}
$od=Find-OneDrive;if(-not $od){throw 'No signed-in OneDrive folder detected. Open OneDrive, confirm the Microsoft 365 account is signed in, then rerun.'}
if(-not(Test-Path $Py)){throw "BridgePoint Python runtime missing: $Py"};if(-not(Test-Path 'C:\BridgePointData')){throw 'C:\BridgePointData missing. Do not reinstall V939.'}
New-Item -ItemType Directory -Path $Agent -Force|Out-Null;$tmp=$Script+'.tmp';Invoke-WebRequest -UseBasicParsing -TimeoutSec 90 -Uri $Url -OutFile $tmp
$txt=Get-Content $tmp -Raw;if($txt -notmatch 'AGENT_VERSION=942' -or $txt -notmatch 'COMPLETE_SUPABASE_EXIT_RESCUE'){Remove-Item $tmp -Force -ErrorAction SilentlyContinue;throw 'V942 rescue validation failed.'}
Move-Item $tmp $Script -Force;New-Item -ItemType Directory -Path (Join-Path $od 'BridgePointRescue') -Force|Out-Null
foreach($old in @('BridgePoint OneDrive Rescue','BridgePoint OneDrive Full Rescue',$Task)){Unregister-ScheduledTask -TaskName $old -Confirm:$false -ErrorAction SilentlyContinue}
$Action=New-ScheduledTaskAction -Execute $Py -Argument ('"'+$Script+'"') -WorkingDirectory $Agent
$Trigger=New-ScheduledTaskTrigger -AtLogOn -User ("$env:USERDOMAIN\$env:USERNAME")
$Settings=New-ScheduledTaskSettingsSet -StartWhenAvailable -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1) -ExecutionTimeLimit ([TimeSpan]::Zero) -MultipleInstances IgnoreNew
Register-ScheduledTask -TaskName $Task -Action $Action -Trigger $Trigger -Settings $Settings -RunLevel Highest -Force|Out-Null
Start-ScheduledTask -TaskName $Task
powercfg /change standby-timeout-ac 0|Out-Null;powercfg /change hibernate-timeout-ac 0|Out-Null
Start-Sleep -Seconds 5
Write-Host '';Write-Host 'BridgePoint COMPLETE OneDrive rescue V942 is running.' -ForegroundColor Green
Write-Host ('OneDrive: '+$od);Write-Host ('Cloud rescue: '+(Join-Path $od 'BridgePointRescue'))
Write-Host ('Rescue task: '+(Get-ScheduledTask -TaskName $Task).State)
Write-Host 'V939 was NOT stopped, reinstalled, moved, or reset.' -ForegroundColor Green
Write-Host 'V942 adds: one cloud state lane + all Storage + schema/roles/policies + small control tables + all non-staging DB rows + prioritized staging.' -ForegroundColor Green
Write-Host 'Indexes are represented by definitions and rebuilt locally; P30 raw geographic staging is last priority.' -ForegroundColor Yellow
