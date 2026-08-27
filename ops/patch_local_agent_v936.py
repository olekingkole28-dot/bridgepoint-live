from pathlib import Path

path=Path('downloads/local-ai/bridgepoint_local_ai.ps1')
s=path.read_text(encoding='utf-8')

def replace_once(old,new,label):
    global s
    n=s.count(old)
    if n!=1:
        raise SystemExit(f'{label}: expected 1 match, found {n}')
    s=s.replace(old,new,1)

replace_once('$AgentVersion=718','$AgentVersion=936','agent version')

replace_once(
" $r=[ordered]@{backup_authority=$false;restore_test_authority=$false;destination='';config=$null}",
" $r=[ordered]@{backup_authority=$false;restore_test_authority=$false;portable_export_authority=$false;destination='';config=$null}",
'backup runtime shape')

replace_once(
"  if($r.backup_authority -and [bool]$c.restore_test_enabled -and (Has 'psql')){$x=Unprotect([string]$c.restore_test_db_url_protected);$r.restore_test_authority=($x -match '^postgres(ql)?://' -and $x -notmatch 'xdfsjztwgsbmabshzsjw');$x=$null}",
"  if([bool]$c.backup_enabled -and (Has 'psql')){$x=Unprotect([string]$c.db_url_protected);$r.portable_export_authority=($x -match '^postgres(ql)?://');$x=$null}\n  if($r.backup_authority -and [bool]$c.restore_test_enabled -and (Has 'psql')){$x=Unprotect([string]$c.restore_test_db_url_protected);$r.restore_test_authority=($x -match '^postgres(ql)?://' -and $x -notmatch 'xdfsjztwgsbmabshzsjw');$x=$null}",
'portable authority')

replace_once(
" foreach($n in @('bridgepoint_full_export_windows.ps1','bridgepoint_verify_backup_windows.ps1','bridgepoint_restore_test_windows.ps1'))",
" foreach($n in @('bridgepoint_full_export_windows.ps1','bridgepoint_verify_backup_windows.ps1','bridgepoint_restore_test_windows.ps1','bridgepoint_state_export_windows.ps1'))",
'export tool download')

marker="function Ollama([string]$model,[array]$messages){"
if marker not in s:
    raise SystemExit('RunPortableExport insertion marker missing')
portable=r'''function RunPortableExport($cfg,[string]$token,$job,$rt){
 $id=[string]$job.request_id;$kind=([string]$job.scope_kind).ToUpperInvariant();$key=([string]$job.scope_key).ToUpperInvariant();if($kind-ne'STATE'-or$key-notmatch'^[A-Z]{2}$'){throw "Blocked portable export scope $kind/$key"};EnsureBackupTools
 $dest=Join-Path ([Environment]::GetFolderPath('UserProfile')) 'BridgePointStateExports';New-Item -ItemType Directory -Force -Path $dest|Out-Null;Log "Portable export $id / $kind $key claimed."
 try{
  $db=Unprotect([string]$rt.config.db_url_protected);if($db-notmatch'^postgres(ql)?://'){throw 'Protected production database URL is unavailable.'}
  $tool=Join-Path $BackupToolDir 'bridgepoint_state_export_windows.ps1';$out=& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $tool -State $key -Destination $dest -DbUrl $db 2>&1;if($LASTEXITCODE-ne 0){throw "State export exited ${LASTEXITCODE}: $($out|Select-Object -Last 10|Out-String)"}
  $bundle=Get-ChildItem $dest -Directory -Filter ("BridgePoint-{0}-*" -f $key)|Sort-Object LastWriteTime -Descending|Select-Object -First 1;if(-not$bundle){throw 'No state export bundle found after exporter completed.'}
  $manifestPath=Join-Path $bundle.FullName 'manifest.json';$checks=Join-Path $bundle.FullName 'SHA256SUMS.txt';if(-not(Test-Path $manifestPath)-or-not(Test-Path $checks)){throw 'State export integrity files are missing.'}
  $m=Get-Content $manifestPath -Raw|ConvertFrom-Json;$files=@(Get-ChildItem $bundle.FullName -Recurse -File);$zip=$bundle.FullName+'.zip';$res=@{state_code=$key;bundle_name=$bundle.Name;bundle_path=$bundle.FullName;exported_at=$m.exported_at;portable_database=[bool]$m.portable_database;portable_database_file=[string]$m.portable_database_file;zip_created=(Test-Path $zip);zip_path=$(if(Test-Path $zip){$zip}else{''});file_count=$files.Count;checksum_file=$checks;format_version=$m.format_version;agent_version=$AgentVersion}
  $null=BP $cfg $token 'export_complete' @{request_id=$id;result=$res};Log "Portable export $id / $key completed: $($bundle.FullName)"
 }catch{$msg=$_.Exception.Message;try{$null=BP $cfg $token 'export_fail' @{request_id=$id;error=$msg;result=@{scope_kind=$kind;scope_key=$key;agent_version=$AgentVersion}}}catch{};Log "Portable export $id / $key failed: $msg"}
 finally{$db=$null}
}
'''
s=s.replace(marker,portable+marker,1)

old_cap="$cap=@{provider='OLLAMA';primary_model=$cfg.primary_model;reviewer_model=$cfg.reviewer_model;agent_version=$AgentVersion;outbound_only=$true;execution_authority=$false;backup_authority=[bool]$rt.backup_authority;restore_test_authority=[bool]$rt.restore_test_authority;backup_protocol='ALLOWLIST_V717'}"
new_cap="$cap=@{provider='OLLAMA';primary_model=$cfg.primary_model;reviewer_model=$cfg.reviewer_model;agent_version=$AgentVersion;outbound_only=$true;execution_authority=$false;backup_authority=[bool]$rt.backup_authority;restore_test_authority=[bool]$rt.restore_test_authority;portable_export_authority=[bool]$rt.portable_export_authority;backup_protocol='ALLOWLIST_V717';portable_export_protocol='STATE_V936'}"
replace_once(old_cap,new_cap,'heartbeat capability')

old_loop="if($rt.backup_authority){$bc=BP $cfg $token 'backup_claim' @{};if($bc.job){RunBackup $cfg $token $bc.job $rt}};try{$null=Invoke-RestMethod"
new_loop="if($rt.backup_authority){$bc=BP $cfg $token 'backup_claim' @{};if($bc.job){RunBackup $cfg $token $bc.job $rt}};if($rt.portable_export_authority){$ec=BP $cfg $token 'export_claim' @{};if($ec.job){RunPortableExport $cfg $token $ec.job $rt}};try{$null=Invoke-RestMethod"
replace_once(old_loop,new_loop,'export claim loop')

required=[
    '$AgentVersion=936',
    'portable_export_authority',
    "'bridgepoint_state_export_windows.ps1'",
    'function RunPortableExport',
    "'export_claim'",
    "'export_complete'",
    "'export_fail'",
    "portable_export_protocol='STATE_V936'",
]
for needle in required:
    if needle not in s:
        raise SystemExit(f'missing V936 marker: {needle}')

path.write_text(s,encoding='utf-8')
print('BridgePoint Local AI V936 patch applied successfully.')
