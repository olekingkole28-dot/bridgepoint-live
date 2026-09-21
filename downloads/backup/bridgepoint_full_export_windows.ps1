[CmdletBinding()]
param(
  [string]$Destination = "$env:USERPROFILE\BridgePointBackups",
  [string]$DbUrl = '',
  [switch]$SkipStorage,
  [switch]$SkipFunctions,
  [switch]$SkipGit,
  [switch]$IncludeDuplicateDataSql,
  [switch]$PreflightOnly
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$ProjectRef = 'xdfsjztwgsbmabshzsjw'
$ProjectUrl = 'https://xdfsjztwgsbmabshzsjw.supabase.co'
$Region = 'us-east-1'
$Stamp = Get-Date -Format 'yyyyMMdd-HHmmss'

function Has-Cmd([string]$Name) {
  return [bool](Get-Command $Name -ErrorAction SilentlyContinue)
}
function Require-Cmd([string]$Name,[string]$Help) {
  if (-not (Has-Cmd $Name)) { throw "$Name is required. $Help" }
}
function Secure-ToPlain([Security.SecureString]$Value) {
  $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($Value)
  try { return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr) }
  finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
}
function Run([string]$Exe,[string[]]$Args) {
  $shown = $Args | ForEach-Object { if ($_ -match '^postgres(ql)?://') { '[DATABASE_URL]' } else { $_ } }
  Write-Host ("> " + $Exe + " " + ($shown -join ' ')) -ForegroundColor DarkGray
  & $Exe @Args
  if ($LASTEXITCODE -ne 0) { throw "$Exe failed with exit code $LASTEXITCODE" }
}
function GiB([Int64]$Bytes) { return [math]::Round($Bytes / 1GB, 1) }

Write-Host 'BridgePoint full export preflight' -ForegroundColor Cyan
Require-Cmd 'psql' 'Install PostgreSQL client tools, then rerun.'
Require-Cmd 'pg_dump' 'Install PostgreSQL client tools, then rerun.'
Require-Cmd 'pg_restore' 'Install PostgreSQL client tools, then rerun.'
Require-Cmd 'supabase' 'Install the Supabase CLI, then rerun.'
if (-not $SkipGit) { Require-Cmd 'git' 'Install Git for Windows, then rerun.' }

if (-not $DbUrl) {
  Write-Host 'Paste the BridgePoint database connection string from Supabase Dashboard > Connect.' -ForegroundColor Yellow
  $DbUrl = Read-Host 'Database URL'
}
if ([string]::IsNullOrWhiteSpace($DbUrl) -or $DbUrl -notmatch '^postgres(ql)?://') {
  throw 'A PostgreSQL connection URL is required.'
}

New-Item -ItemType Directory -Force -Path $Destination | Out-Null
$Destination = (Resolve-Path $Destination).Path
$driveRoot = [System.IO.Path]::GetPathRoot($Destination)
$drive = New-Object System.IO.DriveInfo($driveRoot)
$FreeBytes = [Int64]$drive.AvailableFreeSpace

$DbBytesText = (& psql $DbUrl -Atqc "select pg_database_size(current_database())").Trim()
if ($LASTEXITCODE -ne 0 -or $DbBytesText -notmatch '^\d+$') { throw 'Could not read live database size.' }
$DbBytes = [Int64]$DbBytesText

$LogicalText = (& psql $DbUrl -Atqc "select coalesce(sum(pg_table_size(c.oid)),0) from pg_class c join pg_namespace n on n.oid=c.relnamespace where c.relkind in ('r','p') and n.nspname not in ('pg_catalog','information_schema')").Trim()
if ($LASTEXITCODE -ne 0 -or $LogicalText -notmatch '^\d+$') { throw 'Could not read logical table size.' }
$LogicalBytes = [Int64]$LogicalText

$StorageBytes = 0L
try {
  $StorageText = (& psql $DbUrl -Atqc "select coalesce(sum(case when (metadata->>'size') ~ '^[0-9]+$' then (metadata->>'size')::bigint else 0 end),0) from storage.objects").Trim()
  if ($LASTEXITCODE -eq 0 -and $StorageText -match '^\d+$') { $StorageBytes = [Int64]$StorageText }
} catch {
  Write-Warning 'Could not measure Supabase Storage bytes during preflight; database export can still proceed.'
}

$Cpu = [Environment]::ProcessorCount
$DumpJobs = if ($Cpu -ge 12) { 4 } elseif ($Cpu -ge 6) { 3 } else { 2 }
if ($DbBytes -gt 1TB) { $DumpJobs = [Math]::Min($DumpJobs, 3) }

Write-Host ("Database: {0} GiB | logical tables: {1} GiB | Storage: {2} GiB | free destination: {3} GiB | local CPUs: {4} | dump jobs: {5}" -f (GiB $DbBytes),(GiB $LogicalBytes),(GiB $StorageBytes),(GiB $FreeBytes),$Cpu,$DumpJobs) -ForegroundColor Cyan

if ($FreeBytes -lt 200GB) { throw 'Less than 200 GiB free at the destination. Choose a larger drive.' }
if ($FreeBytes -lt ($LogicalBytes + $StorageBytes)) {
  Write-Warning 'Free space is below current logical table + Storage bytes. Compression may help, but do not depend on an unmeasured compression ratio.'
}
if ($PreflightOnly) {
  Write-Host 'Preflight passed. No export was started.' -ForegroundColor Green
  exit 0
}

$Root = Join-Path $Destination "BridgePoint-$Stamp"
$DbDir = Join-Path $Root 'database'
$FnDir = Join-Path $Root 'edge-functions'
$StorageDir = Join-Path $Root 'storage'
$SourceDir = Join-Path $Root 'source'
New-Item -ItemType Directory -Force -Path $DbDir,$FnDir,$StorageDir,$SourceDir | Out-Null

Write-Host "BridgePoint full export -> $Root" -ForegroundColor Cyan

# Directory-format pg_dump supports bounded parallelism and avoids creating a second giant plain-SQL copy by default.
$ArchiveDir = Join-Path $DbDir 'bridgepoint_full.dir'
Run 'pg_dump' @('--format=directory','--jobs',"$DumpJobs",'--compress=9','--no-owner','--no-acl','--verbose','--file',$ArchiveDir,$DbUrl)
Run 'supabase' @('db','dump','--db-url',$DbUrl,'-f',(Join-Path $DbDir 'roles.sql'),'--role-only')
Run 'supabase' @('db','dump','--db-url',$DbUrl,'-f',(Join-Path $DbDir 'schema.sql'))
Run 'supabase' @('db','dump','--db-url',$DbUrl,'-f',(Join-Path $DbDir 'migration_history_schema.sql'),'--schema','supabase_migrations')
Run 'supabase' @('db','dump','--db-url',$DbUrl,'-f',(Join-Path $DbDir 'migration_history_data.sql'),'--use-copy','--data-only','--schema','supabase_migrations')
if ($IncludeDuplicateDataSql) {
  Run 'supabase' @('db','dump','--db-url',$DbUrl,'-f',(Join-Path $DbDir 'data.sql'),'--use-copy','--data-only','-x','storage.buckets_vectors','-x','storage.vector_indexes')
}

& pg_restore --list $ArchiveDir | Set-Content (Join-Path $DbDir 'bridgepoint_full.catalog.txt') -Encoding UTF8
if ($LASTEXITCODE -ne 0) { throw 'pg_restore could not read the database archive catalog.' }

if (-not $SkipGit) {
  Run 'git' @('clone','--mirror','https://github.com/olekingkole28-dot/bridgepoint-live.git',(Join-Path $SourceDir 'bridgepoint-live.git'))
  Run 'git' @('clone','--mirror','https://github.com/olekingkole28-dot/bridgepoint_data_studio.git',(Join-Path $SourceDir 'bridgepoint_data_studio.git'))
}

if (-not $SkipFunctions) {
  Write-Host 'Capturing deployed Edge Function inventory.' -ForegroundColor Cyan
  try {
    & supabase functions list --project-ref $ProjectRef --output json | Set-Content (Join-Path $FnDir 'functions-list.json') -Encoding UTF8
    if ($LASTEXITCODE -ne 0) { throw 'functions list failed' }
  } catch {
    Write-Warning 'Edge Function inventory could not be downloaded. Function source remains preserved by the Git mirrors; no secret values are exported.'
  }
}

if (-not $SkipStorage) {
  Require-Cmd 'rclone' 'Install rclone, then rerun without -SkipStorage.'
  Write-Host 'Use a read-only Supabase Storage S3 credential where possible.' -ForegroundColor Yellow
  $Access = Read-Host 'S3 Access Key ID'
  $SecretSecure = Read-Host 'S3 Secret Access Key' -AsSecureString
  $Secret = Secure-ToPlain $SecretSecure
  $Endpoint = "$ProjectUrl/storage/v1/s3"
  try {
    $Buckets = & rclone lsf ':s3:' --s3-provider Other --s3-endpoint $Endpoint --s3-region $Region --s3-access-key-id $Access --s3-secret-access-key $Secret
    if ($LASTEXITCODE -ne 0) { throw 'Could not list Supabase Storage buckets.' }
    foreach ($Raw in $Buckets) {
      $Bucket = $Raw.TrimEnd('/').Trim()
      if (-not $Bucket) { continue }
      $Dest = Join-Path $StorageDir $Bucket
      New-Item -ItemType Directory -Force -Path $Dest | Out-Null
      & rclone copy ":s3:$Bucket" $Dest --s3-provider Other --s3-endpoint $Endpoint --s3-region $Region --s3-access-key-id $Access --s3-secret-access-key $Secret --transfers 4 --checkers 8 --timeout 30m --create-empty-src-dirs
      if ($LASTEXITCODE -ne 0) { throw "Storage copy failed for bucket $Bucket" }
    }
  } finally {
    $Secret = $null
    $SecretSecure = $null
  }
}

$Manifest = [ordered]@{
  project_ref = $ProjectRef
  project_url = $ProjectUrl
  region = $Region
  exported_at = (Get-Date).ToUniversalTime().ToString('o')
  format_version = 4
  primary_database_archive = 'database/bridgepoint_full.dir'
  database_format = 'pg_dump_directory'
  dump_jobs = $DumpJobs
  preflight_database_bytes = $DbBytes
  preflight_logical_table_bytes = $LogicalBytes
  preflight_storage_bytes = $StorageBytes
  preflight_destination_free_bytes = $FreeBytes
  duplicate_data_sql_included = [bool]$IncludeDuplicateDataSql
  storage_included = (-not $SkipStorage)
  edge_function_inventory_attempted = (-not $SkipFunctions)
  git_mirrors_included = (-not $SkipGit)
  source_repositories = @('olekingkole28-dot/bridgepoint-live','olekingkole28-dot/bridgepoint_data_studio')
  secrets_exported = $false
  note = 'Live secrets are intentionally excluded. Verify the archive before any cloud cutover or deletion.'
}
$Manifest | ConvertTo-Json -Depth 10 | Set-Content (Join-Path $Root 'manifest.json') -Encoding UTF8

@'
BRIDGEPOINT SECRET / CONFIG RESTORE CHECKLIST
This archive intentionally does NOT contain live secret credentials.
Reconfigure database/JWT/API keys, Stripe, OAuth, SMTP, external APIs, local-node enrollment, DNS and provider credentials on restore.
Do not commit restored secrets to Git.
'@ | Set-Content (Join-Path $Root 'SECRETS_NOT_EXPORTED.txt') -Encoding UTF8

Get-ChildItem $Root -Recurse -File |
  Where-Object { $_.Name -ne 'SHA256SUMS.txt' } |
  ForEach-Object {
    $Hash = Get-FileHash $_.FullName -Algorithm SHA256
    $Rel = $_.FullName.Substring($Root.Length + 1)
    "$($Hash.Hash.ToLower())  $Rel"
  } | Set-Content (Join-Path $Root 'SHA256SUMS.txt') -Encoding ASCII

Write-Host 'BridgePoint full export completed. Verify SHA256SUMS.txt and perform a test restore before relying on the archive.' -ForegroundColor Green
Write-Host "Archive folder: $Root" -ForegroundColor Green
