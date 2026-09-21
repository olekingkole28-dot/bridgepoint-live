[CmdletBinding()]
param([Parameter(Mandatory=$true)][string]$BackupRoot)

$ErrorActionPreference='Stop'
function Fail([string]$m){Write-Host "FAIL: $m" -ForegroundColor Red;exit 1}
function Ok([string]$m){Write-Host "OK: $m" -ForegroundColor Green}
function Archive-Bytes([string]$Path){
  if(Test-Path $Path -PathType Container){
    return [Int64]((Get-ChildItem $Path -Recurse -File | Measure-Object Length -Sum).Sum)
  }
  return [Int64](Get-Item $Path).Length
}

if(-not(Test-Path $BackupRoot)){Fail "Backup folder not found: $BackupRoot"}
$BackupRoot=(Resolve-Path $BackupRoot).Path
$manifestPath=Join-Path $BackupRoot 'manifest.json'
$sumsPath=Join-Path $BackupRoot 'SHA256SUMS.txt'
if(-not(Test-Path $manifestPath)){Fail 'manifest.json missing'}
if(-not(Test-Path $sumsPath)){Fail 'SHA256SUMS.txt missing'}

$manifest=Get-Content $manifestPath -Raw | ConvertFrom-Json
if([int]$manifest.format_version -lt 2){Fail 'Backup format is older than the supported full-archive format'}
Ok "Manifest format $($manifest.format_version), exported $($manifest.exported_at)"

$relArchive=[string]$manifest.primary_database_archive
if([string]::IsNullOrWhiteSpace($relArchive)){
  $relArchive=if([string]$manifest.database_format -eq 'pg_dump_directory'){'database/bridgepoint_full.dir'}else{'database/bridgepoint_full.dump'}
}
$archivePath=Join-Path $BackupRoot ($relArchive -replace '/','\')
if(-not(Test-Path $archivePath)){Fail "Primary database archive missing: $relArchive"}

$bad=@()
Get-Content $sumsPath | ForEach-Object {
  if($_ -match '^([0-9a-fA-F]{64})  (.+)$'){
    $expected=$Matches[1].ToLower()
    $rel=$Matches[2]
    $path=Join-Path $BackupRoot $rel
    if(-not(Test-Path $path)){$bad+="missing $rel";return}
    $actual=(Get-FileHash $path -Algorithm SHA256).Hash.ToLower()
    if($actual -ne $expected){$bad+="hash mismatch $rel"}
  }
}
if($bad.Count){
  $bad|ForEach-Object{Write-Host $_ -ForegroundColor Red}
  Fail "$($bad.Count) checksum problem(s)"
}
Ok 'All recorded SHA-256 checksums match'

$pgRestore=Get-Command pg_restore -ErrorAction SilentlyContinue
if(-not$pgRestore){Fail 'pg_restore is required to validate the PostgreSQL archive catalog'}
$catalog=& $pgRestore.Source --list $archivePath 2>&1
if($LASTEXITCODE -ne 0){
  $catalog|ForEach-Object{Write-Host $_}
  Fail "pg_restore --list could not read $relArchive"
}
if(-not ($catalog | Select-String -SimpleMatch 'TABLE' -Quiet)){Fail 'PostgreSQL archive catalog contained no table entries'}
Ok "PostgreSQL archive catalog is readable: $relArchive"

$required=@('roles.sql','schema.sql','migration_history_schema.sql','migration_history_data.sql')
if([bool]$manifest.duplicate_data_sql_included){$required+='data.sql'}
foreach($f in $required){
  $p=Join-Path $BackupRoot ("database\"+$f)
  if(-not(Test-Path $p)){Fail "Missing database/$f"}
  if((Get-Item $p).Length -eq 0){Fail "database/$f is empty"}
}
Ok 'Required Supabase split database files are present and non-empty'

if($manifest.git_mirrors_included){
  if(-not(Test-Path (Join-Path $BackupRoot 'source\bridgepoint_data_studio.git')) -or -not(Test-Path (Join-Path $BackupRoot 'source\bridgepoint-live.git'))){
    Fail 'Git mirrors were requested but one or more mirrors are missing'
  }
  Ok 'Source-code Git mirrors are present'
}
if($manifest.storage_included){
  if(-not(Test-Path (Join-Path $BackupRoot 'storage'))){Fail 'Storage was requested but storage folder is missing'}
  Ok 'Storage export folder is present'
}

$bytes=Archive-Bytes $archivePath
$result=[ordered]@{
  verified=$true
  verified_at=(Get-Date).ToUniversalTime().ToString('o')
  format_version=$manifest.format_version
  database_format=if($manifest.database_format){$manifest.database_format}else{'legacy_custom'}
  primary_database_archive=$relArchive
  archive_bytes=$bytes
  checksums='PASS'
  pg_restore_catalog='PASS'
  git_mirrors=if($manifest.git_mirrors_included){'PASS'}else{'SKIPPED'}
  storage=if($manifest.storage_included){'PRESENT'}else{'SKIPPED'}
}
$result|ConvertTo-Json -Depth 6|Set-Content (Join-Path $BackupRoot 'verification.json') -Encoding UTF8
Write-Host 'BridgePoint backup VERIFIED.' -ForegroundColor Green
Write-Host (Join-Path $BackupRoot 'verification.json')
