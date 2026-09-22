#requires -Version 7.0
[CmdletBinding()]
param([string]$DataRoot,[switch]$IncludeTransportRuntime,[switch]$SkipDuckDbViewRefresh)

Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
$Gateway='https://xdfsjztwgsbmabshzsjw.supabase.co/functions/v1/bridgepoint-local-reasoning-v584'
$ConfigHome=Join-Path $env:LOCALAPPDATA 'BridgePoint\local-node'
$ConfigPath=Join-Path $ConfigHome 'config.json'
$CredentialPath=Join-Path $ConfigHome 'node-token.clixml'
if(-not(Test-Path $CredentialPath)){throw 'BridgePoint local node is not enrolled.'}
$cred=Import-Clixml -LiteralPath $CredentialPath
$config=if(Test-Path $ConfigPath){Get-Content $ConfigPath -Raw|ConvertFrom-Json}else{$null}
if(-not $DataRoot){$DataRoot=[string]$config.data_root}
if(-not $DataRoot){throw 'DataRoot is required.'}
if($DataRoot -match '(?i)OneDrive'){throw 'Active archive copy cannot be placed in OneDrive.'}

$states=@('AK','AL','AR','AS','AZ','CA','CO','CT','DC','DE','FL','GA','GU','HI','IA','ID','IL','IN','KS','KY','LA','MA','MD','ME','MI','MN','MO','MP','MS','MT','NC','ND','NE','NH','NJ','NM','NV','NY','OH','OK','OR','PA','PR','RI','SC','SD','TN','TX','UT','VA','VI','VT','WA','WI','WV','WY')
$archiveRoot=Join-Path $DataRoot 'archives'
$manifestRoot=Join-Path $DataRoot 'manifests'
New-Item -ItemType Directory -Force -Path $archiveRoot,$manifestRoot|Out-Null
$manifestPath=Join-Path $manifestRoot ('archive-sync-'+(Get-Date -Format 'yyyyMMdd-HHmmss')+'.jsonl')

function Invoke-Gateway([string]$Action,[hashtable]$Body){
  $payload=@{}+$Body;$payload.action=$Action;$payload.node_id=$cred.UserName
  $headers=@{'Content-Type'='application/json';'x-bridgepoint-node-token'=$cred.GetNetworkCredential().Password}
  Invoke-RestMethod -Method Post -Uri $Gateway -Headers $headers -Body ($payload|ConvertTo-Json -Depth 10 -Compress) -TimeoutSec 60
}
function Get-FreeDiskGb {
  $driveName=([System.IO.Path]::GetPathRoot($DataRoot)).TrimEnd('\').TrimEnd(':')
  [math]::Round((Get-PSDrive -Name $driveName).Free/1GB,1)
}
function Save-Object($file){
  if((Get-FreeDiskGb)-lt 100){throw 'Archive sync halted: less than 100 GB free.'}
  $relative=$file.path.Replace('/','\')
  $dest=Join-Path $archiveRoot $relative
  New-Item -ItemType Directory -Force -Path (Split-Path $dest -Parent)|Out-Null
  if((Test-Path $dest)-and(Get-Item $dest).Length -eq [int64]$file.size){return}
  $tmp=$dest+'.partial'
  Remove-Item $tmp -Force -ErrorAction SilentlyContinue
  if(Get-Command Start-BitsTransfer -ErrorAction SilentlyContinue){
    Start-BitsTransfer -Source $file.signed_url -Destination $tmp -TransferType Download
  }else{
    Invoke-WebRequest -Uri $file.signed_url -OutFile $tmp -UseBasicParsing
  }
  if((Get-Item $tmp).Length -ne [int64]$file.size){Remove-Item $tmp -Force;throw "Size mismatch for $($file.path)"}
  Move-Item $tmp $dest -Force
  $sha=(Get-FileHash -Algorithm SHA256 -LiteralPath $dest).Hash.ToLowerInvariant()
  @{path=$file.path;local_path=$dest;size=[int64]$file.size;sha256=$sha;etag=$file.etag;last_modified=$file.last_modified;downloaded_at=(Get-Date -Format o)} |
    ConvertTo-Json -Compress | Add-Content -LiteralPath $manifestPath
}
function Sync-Prefix([string]$Prefix){
  $offset=0
  do{
    $page=Invoke-Gateway 'archive_list' @{prefix=$Prefix;limit=100;offset=$offset}
    foreach($file in @($page.files)){Save-Object $file}
    $more=[bool]$page.has_more
    $offset+=100
  }while($more)
}

if((Get-FreeDiskGb)-lt 600){throw "Archive sync will not start below 600 GB free. Current: $(Get-FreeDiskGb) GB"}

foreach($s in $states){
  Sync-Prefix "buildings/v2710/$s/building"
  Sync-Prefix "buildings/v2710/$s/building_part"
  Sync-Prefix "transport/v2696/$s"
  Sync-Prefix "transport/v2696/$s/connector"
  Sync-Prefix "transport/v2696/$s/segment"
  if($IncludeTransportRuntime){Sync-Prefix "transport-runtime/v2716/$s"}
}

$root=$archiveRoot.Replace('\','/')
$views=@"
CREATE SCHEMA IF NOT EXISTS bridgepoint;
CREATE OR REPLACE VIEW bridgepoint.buildings AS SELECT * FROM read_parquet('$root/buildings/v2710/*/building/*.parquet', hive_partitioning=true, union_by_name=true);
CREATE OR REPLACE VIEW bridgepoint.building_parts AS SELECT * FROM read_parquet('$root/buildings/v2710/*/building_part/*.parquet', hive_partitioning=true, union_by_name=true);
CREATE OR REPLACE VIEW bridgepoint.transport_segments AS SELECT * FROM read_parquet(['$root/transport/v2696/*/segment/*.parquet','$root/transport/v2696/*/segment.parquet'], hive_partitioning=true, union_by_name=true);
CREATE OR REPLACE VIEW bridgepoint.transport_connectors AS SELECT * FROM read_parquet(['$root/transport/v2696/*/connector/*.parquet','$root/transport/v2696/*/connector.parquet'], hive_partitioning=true, union_by_name=true);
"@
$viewsPath=Join-Path $manifestRoot 'duckdb_views.sql'
$views|Set-Content -LiteralPath $viewsPath -Encoding utf8

if(-not $SkipDuckDbViewRefresh){
  $duck=Get-Command duckdb -ErrorAction SilentlyContinue
  if($duck){
    $dbPath=Join-Path $DataRoot 'state\bridgepoint.duckdb'
    & $duck.Source $dbPath ".read '$($viewsPath.Replace("'","''"))'"
    if($LASTEXITCODE -ne 0){throw 'DuckDB view refresh failed.'}
  }
}

if($env:OneDrive -and(Test-Path $env:OneDrive)){
  $cold=Join-Path $env:OneDrive 'BridgePoint-Archive\manifests'
  New-Item -ItemType Directory -Force -Path $cold|Out-Null
  Copy-Item -LiteralPath $manifestPath,$viewsPath -Destination $cold -Force
}
Write-Host "Archive sync complete. Manifest: $manifestPath"
