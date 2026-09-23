$ErrorActionPreference='Stop'
$dst=Join-Path ([Environment]::GetFolderPath('Desktop')) 'BridgePoint Master Parcel Boundary Atlas'
New-Item -ItemType Directory -Path $dst -Force | Out-Null
$base='https://raw.githubusercontent.com/olekingkole28-dot/bridgepoint-live/main/downloads/backup/master-parcel-atlas'
$files=@('master_parcel_atlas.py','Start Master Parcel Boundary Atlas.bat','README-FIRST.txt')
foreach($f in $files){
  Invoke-WebRequest -UseBasicParsing "$base/$([uri]::EscapeDataString($f))" -OutFile (Join-Path $dst $f)
}
$topo='https://raw.githubusercontent.com/olekingkole28-dot/bridgepoint-live/main/rebuild-v5000/assets/us-state-boundaries-census.topo.json'
try { Invoke-WebRequest -UseBasicParsing $topo -OutFile (Join-Path $dst 'us-state-boundaries-census.topo.json') } catch {}
Write-Host "BridgePoint Master Parcel Boundary Atlas installed:" -ForegroundColor Green
Write-Host $dst -ForegroundColor Green
Write-Host "Double-click Start Master Parcel Boundary Atlas.bat"
