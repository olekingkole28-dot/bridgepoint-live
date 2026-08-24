param(
 [Parameter(Mandatory=$true)][string]$BackupRoot,
 [Parameter(Mandatory=$true)][string]$TargetDbUrl,
 [switch]$CleanTarget,
 [switch]$SkipData
)
$ErrorActionPreference='Stop'
$dump=Join-Path $BackupRoot 'database\bridgepoint_full.dump';$verify=Join-Path $BackupRoot 'verification.json'
if(-not(Test-Path $dump)){throw 'bridgepoint_full.dump not found. Run the full export first.'}
if(-not(Test-Path $verify)){throw 'verification.json not found. Run backup verification first.'}
$v=Get-Content $verify -Raw|ConvertFrom-Json;if(-not$v.verified){throw 'Backup verification did not pass.'}
if($TargetDbUrl -notmatch '^postgres(ql)?://'){throw 'TargetDbUrl must be a PostgreSQL connection URL.'}
if($TargetDbUrl -match 'xdfsjztwgsbmabshzsjw'){throw 'Production BridgePoint database is blocked from restore tests.'}
$pgRestore=(Get-Command pg_restore -ErrorAction Stop).Source;$psql=(Get-Command psql -ErrorAction Stop).Source
Write-Host 'BridgePoint restore test - TARGET DATABASE WILL BE MODIFIED' -ForegroundColor Yellow
$args=@('--no-owner','--no-acl','--exit-on-error','--verbose');if($CleanTarget){$args+=@('--clean','--if-exists')};if($SkipData){$args+='--schema-only'};$args+=@('--dbname',$TargetDbUrl,$dump)
& $pgRestore @args;if($LASTEXITCODE -ne 0){throw "pg_restore failed with exit code $LASTEXITCODE"}
$checks=@(
 "select current_database() as database_name;",
 "select count(*) as schemas from information_schema.schemata;",
 "select count(*) as app_tables from information_schema.tables where table_schema in ('public','automation','accounts','intelligence','analytics','product','growth','bridgepoint_ai','core','pattern_engine','scoring_engine','opportunity_engine');",
 "select count(*) from information_schema.tables where table_schema='core' and table_name='properties';"
)
$results=@();foreach($q in $checks){$out=& $psql $TargetDbUrl -X -v ON_ERROR_STOP=1 -Atc $q 2>&1;if($LASTEXITCODE -ne 0){throw "Post-restore verification query failed: $q`n$out"};$results+=@{query=$q;result=($out-join "`n")}}
$report=[ordered]@{restore_test_passed=$true;tested_at=(Get-Date).ToUniversalTime().ToString('o');target_host=([uri]($TargetDbUrl-replace '^postgresql?://','http://')).Host;clean_target=[bool]$CleanTarget;schema_only=[bool]$SkipData;checks=$results}
$report|ConvertTo-Json -Depth 10|Set-Content (Join-Path $BackupRoot 'restore-test.json') -Encoding UTF8
Write-Host 'Restore test PASSED.' -ForegroundColor Green
Write-Host (Join-Path $BackupRoot 'restore-test.json')
