$ErrorActionPreference='Stop'
$admin=([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if(-not $admin){$self=$MyInvocation.MyCommand.Path;Start-Process powershell.exe -Verb RunAs -ArgumentList @('-NoProfile','-ExecutionPolicy','Bypass','-File',('"'+$self+'"'));exit}
$Task='BridgePoint OneDrive Delta Tail V943'
$Runtime='C:\BridgePointRuntime';$Agent=Join-Path $Runtime 'agent';$Py=Join-Path $Runtime '.venv\Scripts\python.exe';$Script=Join-Path $Agent 'bridgepoint_onedrive_tail_v943.py'
$Url='https://raw.githubusercontent.com/olekingkole28-dot/bridgepoint-live/live-artifact/downloads/local-ai/bridgepoint_onedrive_tail_v943.py'
function Find-OneDrive {$v=@($env:OneDriveCommercial,$env:OneDriveConsumer,$env:OneDrive)|Where-Object{$_ -and(Test-Path -LiteralPath $_)};if($v.Count){return $v[0]};$c=Get-ChildItem -LiteralPath $env:USERPROFILE -Directory -Filter 'OneDrive*' -ErrorAction SilentlyContinue|Select-Object -First 1;if($c){return $c.FullName};return $null}
$od=Find-OneDrive;if(-not $od){throw 'No signed-in OneDrive folder detected.'}
if(-not(Test-Path $Py)){throw "BridgePoint Python runtime missing: $Py"}
New-Item -ItemType Directory -Path $Agent -Force|Out-Null
$tmp=$Script+'.tmp';Invoke-WebRequest -UseBasicParsing -TimeoutSec 90 -Uri $Url -OutFile $tmp
$txt=Get-Content $tmp -Raw;if($txt -notmatch 'AGENT_VERSION=943' -or $txt -notmatch 'COLD_PRIMARY_TAIL_V943'){Remove-Item $tmp -Force -ErrorAction SilentlyContinue;throw 'V943 validation failed.'}
Move-Item $tmp $Script -Force
& $Py -c "import pyarrow,duckdb; print('BridgePoint V943 dependencies OK')" | Out-Host
Unregister-ScheduledTask -TaskName $Task -Confirm:$false -ErrorAction SilentlyContinue
$Action=New-ScheduledTaskAction -Execute $Py -Argument ('"'+$Script+'"') -WorkingDirectory $Agent
$Trigger=New-ScheduledTaskTrigger -AtLogOn -User ("$env:USERDOMAIN\$env:USERNAME")
$Settings=New-ScheduledTaskSettingsSet -StartWhenAvailable -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1) -ExecutionTimeLimit ([TimeSpan]::Zero) -MultipleInstances IgnoreNew
Register-ScheduledTask -TaskName $Task -Action $Action -Trigger $Trigger -Settings $Settings -RunLevel Highest -Force|Out-Null
Start-ScheduledTask -TaskName $Task
Write-Host '';Write-Host 'BridgePoint OneDrive Delta Tail V943 is running.' -ForegroundColor Green
Write-Host ('OneDrive cold root: '+(Join-Path $od 'BridgePointRescue\deltas'))
Write-Host 'This task does NOT claim full-state exports. It writes only registered shutdown deltas as ZSTD Parquet and unpins finished batches.' -ForegroundColor Green
