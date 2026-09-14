param(
  [Parameter(Mandatory=$true)][ValidatePattern('^[A-Za-z]{2}$')][string]$State,
  [string]$Destination = "$env:USERPROFILE\BridgePointStateExports",
  [string]$DbUrl = '',
  [switch]$SkipZip,
  [switch]$SkipDuckDb
)
$ErrorActionPreference='Stop'
$ProgressPreference='SilentlyContinue'
$State=$State.ToUpperInvariant()
$Stamp=Get-Date -Format 'yyyyMMdd-HHmmss'
$Root=Join-Path $Destination ("BridgePoint-{0}-{1}" -f $State,$Stamp)
$Csv=Join-Path $Root 'csv'
New-Item -ItemType Directory -Force -Path $Csv | Out-Null
function Has-Cmd([string]$n){ [bool](Get-Command $n -ErrorAction SilentlyContinue) }
function Require-Cmd([string]$n,[string]$how){if(-not (Has-Cmd $n)){throw "$n is required. $how"}}
function PsqlCopy([string]$file,[string]$sql){
  $path=(Join-Path $Csv $file).Replace("'","''")
  $cmd="\copy ($sql) to '$path' with (format csv, header true, encoding 'UTF8')"
  & psql $DbUrl -v ON_ERROR_STOP=1 -c $cmd
  if($LASTEXITCODE -ne 0){throw "Export failed: $file"}
}
Require-Cmd 'psql' 'Install the free PostgreSQL client tools, then rerun.'
if(-not $DbUrl){Write-Host 'Paste the BridgePoint PostgreSQL connection string from Supabase Dashboard > Connect.' -ForegroundColor Yellow;$DbUrl=Read-Host 'Database URL'}
if([string]::IsNullOrWhiteSpace($DbUrl) -or $DbUrl -notmatch '^postgres(ql)?://'){throw 'A valid PostgreSQL URL is required.'}
Write-Host "BridgePoint state export: $State -> $Root" -ForegroundColor Cyan
$st=$State.Replace("'","''")
PsqlCopy 'properties.csv' "select p.property_id,p.parcel_number,p.assessor_account_number,p.property_type,p.property_subtype,p.land_use_code,p.land_use_description,p.municipality,p.county,trim(p.state_code::text) state_code,p.postal_code,p.latitude,p.longitude,p.acreage,p.land_area_sqft,p.assessed_land_value,p.assessed_improvement_value,p.assessed_total_value,p.market_land_value,p.market_improvement_value,p.market_total_value,p.tax_year,p.year_built,p.building_count,p.canonical_confidence,p.current_owner_name,p.current_co_owner_name,p.owner_record_status,p.owner_source_name,p.owner_source_url,p.owner_as_of_date,p.owner_confidence,p.owner_entity_type,p.created_at,p.updated_at,a.full_address,a.normalized_address,a.geocode_status,a.geocode_confidence,a.country_code from core.properties p left join core.addresses a on a.address_id=p.primary_address_id where trim(p.state_code::text)='$st' and p.active"
PsqlCopy 'signals.csv' "select s.signal_id,s.signal_type_id,s.entity_id property_id,s.detected_at,s.effective_at,s.expires_at,s.strength,s.confidence,s.severity,s.status,s.title,s.description,s.model_version,s.detector_key,s.dedupe_key,s.evidence_summary,s.created_at,s.updated_at from intelligence.signals s join core.properties p on s.entity_type='property' and s.entity_id=p.property_id where trim(p.state_code::text)='$st' and p.active"
PsqlCopy 'evidence.csv' "select distinct e.evidence_item_id,e.evidence_type,e.evidence_entity_id,e.source_id,e.source_record_id,e.observed_at,e.evidence_strength,e.confidence,e.summary,e.created_at,se.signal_id,se.relationship_type,se.contribution from intelligence.evidence_items e join intelligence.signal_evidence se on se.evidence_item_id=e.evidence_item_id join intelligence.signals s on s.signal_id=se.signal_id join core.properties p on s.entity_type='property' and s.entity_id=p.property_id where trim(p.state_code::text)='$st' and p.active"
PsqlCopy 'patterns.csv' "select pp.* from pattern_engine.property_patterns_v36 pp join core.properties p on p.property_id=pp.property_id where trim(p.state_code::text)='$st' and p.active"
PsqlCopy 'scores.csv' "select sc.* from scoring_engine.current_property_scores_v37 sc join core.properties p on p.property_id=sc.property_id where trim(p.state_code::text)='$st' and p.active"
PsqlCopy 'opportunities.csv' "select o.* from opportunity_engine.verified_ranked_opportunities_v83 o join core.properties p on p.property_id=o.property_id where trim(p.state_code::text)='$st' and p.active"
PsqlCopy 'sources.csv' "select source_id,source_code,source_name,provider,source_category,geographic_scope,state_code,source_url,access_method,refresh_frequency,refresh_interval_minutes,enabled,priority,default_confidence,last_checked_at,last_successful_import_at,next_scheduled_check_at,total_records_ingested,consecutive_failures,last_error,health_status,parser_version,configuration,metadata,created_at,updated_at from automation.source_registry where state_code='$st'"
PsqlCopy 'source_candidates.csv' "select candidate_id,state_code,source_category,candidate_name,provider,source_url,access_method,discovery_method,template_source_code,authority_score,coverage_score,freshness_score,overall_quality_score,decision_status,discovered_at,reviewed_at,metadata from automation.geographic_source_candidates_v86 where state_code='$st'"
PsqlCopy 'media_references.csv' "select m.property_media_id,m.property_id,m.media_type,m.media_url,m.thumbnail_url,m.source_name,m.source_url,m.observed_at,m.captured_at,m.license_note,m.confidence,m.is_primary,m.active,m.metadata,m.created_at,m.updated_at from core.property_media_v137 m join core.properties p on p.property_id=m.property_id where trim(p.state_code::text)='$st' and p.active"
PsqlCopy 'state_progress.csv' "select * from automation.owner_state_progress_cache_v377 where state_code='$st'"
PsqlCopy 'export_profiles.csv' "select * from product.state_export_profiles_v675 order by dataset_key"
PsqlCopy 'parity_requirements.csv' "select * from automation.jurisdiction_parity_requirements_v675 order by requirement_group,requirement_key"
$manifest=[ordered]@{format_version=1;state_code=$State;exported_at=(Get-Date).ToUniversalTime().ToString('o');storage='CSV';portable_database=$false;zip_created=$false;source_database='BridgePoint Intelligence';includes=@('properties','signals','evidence','patterns','scores','opportunities','sources','source_candidates','media_references','state_progress','export_profiles','parity_requirements');notes='Owner-only portable state export. Source media binaries are not copied; media references and provenance are retained. Preserve licensing/privacy obligations.'}
if(-not $SkipDuckDb -and (Has-Cmd 'duckdb')){
  $Db=Join-Path $Root ("bridgepoint_{0}.duckdb" -f $State.ToLowerInvariant())
  $sqlFile=Join-Path $Root 'build_duckdb.sql'
  $lines=@()
  Get-ChildItem $Csv -Filter '*.csv' | ForEach-Object { $table=$_.BaseName -replace '[^A-Za-z0-9_]','_'; $p=$_.FullName.Replace("'","''").Replace('\','/'); $lines += "create or replace table $table as select * from read_csv_auto('$p', header=true, sample_size=-1);" }
  $lines += "create or replace view state_summary as select '$State' as state_code,(select count(*) from properties) properties,(select count(*) from signals) signals,(select count(*) from patterns) patterns,(select count(*) from scores) scores,(select count(*) from opportunities) opportunities,(select count(*) from sources) sources;"
  $lines | Set-Content $sqlFile -Encoding UTF8
  & duckdb $Db ".read '$($sqlFile.Replace("'","''").Replace('\','/'))'"
  if($LASTEXITCODE -eq 0){$manifest.portable_database=$true;$manifest.portable_database_file=(Split-Path $Db -Leaf)}
}
$manifest | ConvertTo-Json -Depth 6 | Set-Content (Join-Path $Root 'manifest.json') -Encoding UTF8
Get-ChildItem $Root -Recurse -File | Where-Object {$_.Name -ne 'SHA256SUMS.txt'} | ForEach-Object {$h=Get-FileHash $_.FullName -Algorithm SHA256;$rel=$_.FullName.Substring($Root.Length+1);"$($h.Hash.ToLower())  $rel"} | Set-Content (Join-Path $Root 'SHA256SUMS.txt') -Encoding ASCII
if(-not $SkipZip){
  $zip="$Root.zip"; Compress-Archive -Path (Join-Path $Root '*') -DestinationPath $zip -CompressionLevel Optimal -Force; $manifest.zip_created=$true; $manifest.zip_file=(Split-Path $zip -Leaf); $manifest | ConvertTo-Json -Depth 6 | Set-Content (Join-Path $Root 'manifest.json') -Encoding UTF8
  Write-Host "Portable state ZIP: $zip" -ForegroundColor Green
}
Write-Host "State export complete: $Root" -ForegroundColor Green
Write-Host 'CSV files open in Excel/LibreOffice and can be imported into Google Sheets in chunks. DuckDB is used automatically when installed.' -ForegroundColor Yellow
