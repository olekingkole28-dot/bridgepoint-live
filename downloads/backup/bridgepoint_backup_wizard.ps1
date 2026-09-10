param([string]$Destination="$env:USERPROFILE\BridgePointBackups")
$ErrorActionPreference='Stop';$ProgressPreference='SilentlyContinue'
$Base='https://raw.githubusercontent.com/olekingkole28-dot/bridgepoint-live/main/downloads/backup'
$Endpoint='https://xdfsjztwgsbmabshzsjw.supabase.co/functions/v1/bridgepoint-local-reasoning-v584'
$Cfg=Join-Path $env:LOCALAPPDATA 'BridgePoint\LocalAI\config.json'
function NodeContext {if(-not(Test-Path $Cfg)){return $null};try{$c=Get-Content $Cfg -Raw|ConvertFrom-Json;$s=ConvertTo-SecureString ([string]$c.token_protected);$p=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($s);try{$t=[Runtime.InteropServices.Marshal]::PtrToStringBSTR($p)}finally{[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($p)};return @{node_id=[string]$c.node_id;token=$t}}catch{return $null}}
function Report([string]$type,[string]$status,$payload){$n=NodeContext;if(-not$n){return};try{$b=@{action='backup_report';node_id=$n.node_id;report_type=$type;status=$status;payload=$payload}|ConvertTo-Json -Depth 12 -Compress;Invoke-RestMethod -Method Post -Uri $Endpoint -Headers @{'x-bridgepoint-node-token'=$n.token} -ContentType 'application/json' -Body $b -TimeoutSec 30|Out-Null}catch{Write-Warning "Could not report backup status to Owner Center: $($_.Exception.Message)"}}
$Temp=Join-Path $env:TEMP 'BridgePointBackupTools';New-Item -ItemType Directory -Force -Path $Temp|Out-Null
$Export=Join-Path $Temp 'bridgepoint_full_export_windows.ps1';$Verify=Join-Path $Temp 'bridgepoint_verify_backup_windows.ps1'
Invoke-WebRequest -UseBasicParsing "$Base/bridgepoint_full_export_windows.ps1" -OutFile $Export
Invoke-WebRequest -UseBasicParsing "$Base/bridgepoint_verify_backup_windows.ps1" -OutFile $Verify
New-Item -ItemType Directory -Force -Path $Destination|Out-Null
Report 'EXPORT' 'STARTED' @{destination=$Destination;started_at=(Get-Date).ToUniversalTime().ToString('o')}
try{
 & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $Export -Destination $Destination
 if($LASTEXITCODE -ne 0){throw "Full export exited with $LASTEXITCODE"}
 $Root=Get-ChildItem $Destination -Directory -Filter 'BridgePoint-*'|Sort-Object LastWriteTime -Descending|Select-Object -First 1
 if(-not$Root){throw 'Could not locate completed BridgePoint backup folder.'}
 $manifest=Get-Content (Join-Path $Root.FullName 'manifest.json') -Raw|ConvertFrom-Json
 Report 'EXPORT' 'SUCCEEDED' @{path=$Root.FullName;archive_bytes=$manifest.primary_database_archive_bytes;storage_included=$manifest.storage_included;git_mirrors_included=$manifest.git_mirrors_included;completed_at=(Get-Date).ToUniversalTime().ToString('o')}
 Report 'VERIFY' 'STARTED' @{path=$Root.FullName}
 & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $Verify -BackupRoot $Root.FullName
 if($LASTEXITCODE -ne 0){throw "Backup verification exited with $LASTEXITCODE"}
 $vr=Get-Content (Join-Path $Root.FullName 'verification.json') -Raw|ConvertFrom-Json
 Report 'VERIFY' 'SUCCEEDED' @{path=$Root.FullName;archive_bytes=$vr.archive_bytes;checksums=$vr.checksums;pg_restore_catalog=$vr.pg_restore_catalog;verified_at=$vr.verified_at}
 Write-Host "`nFULL BRIDGEPOINT BACKUP VERIFIED" -ForegroundColor Green
 Write-Host "Backup folder: $($Root.FullName)" -ForegroundColor Green
 Write-Host 'Keep a second copy on an external drive or other storage provider.' -ForegroundColor Yellow
}catch{$m=$_.Exception.Message;Report 'EXPORT' 'FAILED' @{error=$m;failed_at=(Get-Date).ToUniversalTime().ToString('o')};Write-Host "`nBACKUP FAILED: $m" -ForegroundColor Red;throw}
