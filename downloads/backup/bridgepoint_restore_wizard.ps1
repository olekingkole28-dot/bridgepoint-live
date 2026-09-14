param([string]$BackupRoot='',[string]$TargetDbUrl='')
$ErrorActionPreference='Stop';$ProgressPreference='SilentlyContinue'
$Base='https://raw.githubusercontent.com/olekingkole28-dot/bridgepoint-live/main/downloads/backup'
if([string]::IsNullOrWhiteSpace($BackupRoot)){
  $baseDir=Join-Path $env:USERPROFILE 'BridgePointBackups';$latest=Get-ChildItem $baseDir -Directory -Filter 'BridgePoint-*' -ErrorAction SilentlyContinue|Sort-Object LastWriteTime -Descending|Select-Object -First 1
  if($latest){$BackupRoot=$latest.FullName}else{$BackupRoot=Read-Host 'Path to BridgePoint backup folder'}
}
if([string]::IsNullOrWhiteSpace($TargetDbUrl)){$TargetDbUrl=Read-Host 'Target TEST PostgreSQL URL (this database will be modified)'}
if($TargetDbUrl -match 'xdfsjztwgsbmabshzsjw'){throw 'Production BridgePoint database is blocked from the restore-test wizard. Use an empty test/local PostgreSQL database.'}
$Temp=Join-Path $env:TEMP 'BridgePointBackupTools';New-Item -ItemType Directory -Force -Path $Temp|Out-Null
$Restore=Join-Path $Temp 'bridgepoint_restore_test_windows.ps1';Invoke-WebRequest -UseBasicParsing "$Base/bridgepoint_restore_test_windows.ps1" -OutFile $Restore
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $Restore -BackupRoot $BackupRoot -TargetDbUrl $TargetDbUrl -CleanTarget
if($LASTEXITCODE -ne 0){throw "Restore test exited with $LASTEXITCODE"}
$r=Get-Content (Join-Path $BackupRoot 'restore-test.json') -Raw|ConvertFrom-Json
if($r.restore_test_passed -ne $true){throw 'Restore test report did not indicate success.'}
Write-Host "`nBRIDGEPOINT RESTORE TEST PASSED" -ForegroundColor Green
Write-Host "Backup: $BackupRoot" -ForegroundColor Green
