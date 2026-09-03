$ErrorActionPreference='Stop'
$ProgressPreference='SilentlyContinue'
if($env:OS-ne'Windows_NT'){throw 'This upgrade is for Windows.'}
$Root=Join-Path $env:LOCALAPPDATA 'BridgePoint\LocalAI';New-Item -ItemType Directory -Force -Path $Root|Out-Null
$Agent=Join-Path $Root 'bridgepoint_local_ai.ps1';$BackupSetup=Join-Path $Root 'configure_backup_windows.ps1'
$AgentUrl='https://raw.githubusercontent.com/olekingkole28-dot/bridgepoint-live/live-artifact/downloads/local-ai/bridgepoint_local_ai.ps1'
$BackupSetupUrl='https://raw.githubusercontent.com/olekingkole28-dot/bridgepoint-live/live-artifact/downloads/backup/configure_backup_windows.ps1'
$Config=Join-Path $Root 'config.json';if(-not(Test-Path $Config)){throw 'Existing BridgePoint Local AI enrollment not found. Run install_windows.ps1 instead.'}
Write-Host 'Upgrading BridgePoint Local AI to v718...' -ForegroundColor Cyan
Invoke-WebRequest -UseBasicParsing -TimeoutSec 60 -Uri $AgentUrl -OutFile ($Agent+'.new')
$txt=Get-Content ($Agent+'.new') -Raw;if($txt-notmatch '# BridgePoint Local Agent - signed channel live-artifact' -or $txt-notmatch '\$AgentVersion\s*=\s*718'){throw 'Downloaded agent did not pass the v718 marker check.'}
Invoke-WebRequest -UseBasicParsing -TimeoutSec 60 -Uri $BackupSetupUrl -OutFile $BackupSetup
Get-CimInstance Win32_Process -Filter "Name='powershell.exe' OR Name='pwsh.exe'" | Where-Object {$_.CommandLine -and $_.CommandLine -match 'bridgepoint_local_ai\.ps1'} | ForEach-Object {try{Invoke-CimMethod -InputObject $_ -MethodName Terminate|Out-Null}catch{}}
Move-Item ($Agent+'.new') $Agent -Force
try{
 $action=New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$Agent`""
 $trigger=New-ScheduledTaskTrigger -AtLogOn
 $settings=New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -MultipleInstances IgnoreNew -RestartCount 99 -RestartInterval (New-TimeSpan -Minutes 1) -ExecutionTimeLimit ([TimeSpan]::Zero)
 Unregister-ScheduledTask -TaskName 'BridgePoint Local AI' -Confirm:$false -ErrorAction SilentlyContinue
 Register-ScheduledTask -TaskName 'BridgePoint Local AI' -Action $action -Trigger $trigger -Settings $settings -Description 'BridgePoint outbound-only local AI and governed backup node'|Out-Null
}catch{
 $run='HKCU:\Software\Microsoft\Windows\CurrentVersion\Run';New-Item $run -Force|Out-Null;New-ItemProperty $run -Name 'BridgePoint Local AI' -Value "powershell.exe -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$Agent`"" -PropertyType String -Force|Out-Null
}
Start-Process powershell.exe -ArgumentList "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$Agent`"" -WindowStyle Hidden
Start-Sleep 4
Write-Host 'BridgePoint Local AI v718 installed and started.' -ForegroundColor Green
if(-not(Test-Path (Join-Path $Root 'backup-config.json'))){Write-Host "Independent backup is code-ready but not credentialed. Run once: $BackupSetup" -ForegroundColor Yellow}else{Write-Host 'Protected backup configuration already exists; v718 will advertise backup authority only if dependencies and credentials validate.' -ForegroundColor Green}
