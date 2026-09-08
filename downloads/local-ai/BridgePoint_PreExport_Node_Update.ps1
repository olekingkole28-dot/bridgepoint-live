[CmdletBinding()]
param(
  [switch]$UpgradeNode
)

$ErrorActionPreference = 'Stop'
Write-Host "BridgePoint pre-export local runtime check" -ForegroundColor Cyan
Write-Host "Machine: $env:COMPUTERNAME"
Write-Host "Time: $(Get-Date -Format o)"

function Refresh-ProcessPath {
  $machine = [Environment]::GetEnvironmentVariable('Path','Machine')
  $user = [Environment]::GetEnvironmentVariable('Path','User')
  $env:Path = "$machine;$user"
}

$winget = Get-Command winget -ErrorAction SilentlyContinue
if ($UpgradeNode) {
  if (-not $winget) { throw 'winget is required for the automatic Node.js LTS update. Install App Installer first.' }
  Write-Host "Updating/installing current Node.js LTS through winget..." -ForegroundColor Yellow
  $listed = (& winget list --id OpenJS.NodeJS.LTS -e --accept-source-agreements 2>$null | Out-String)
  if ($LASTEXITCODE -eq 0 -and $listed -match 'OpenJS.NodeJS.LTS|Node.js') {
    & winget upgrade --id OpenJS.NodeJS.LTS -e --source winget --accept-source-agreements --accept-package-agreements
  } else {
    & winget install --id OpenJS.NodeJS.LTS -e --source winget --accept-source-agreements --accept-package-agreements
  }
  Refresh-ProcessPath
}

$node = Get-Command node -ErrorAction SilentlyContinue
$npm = Get-Command npm -ErrorAction SilentlyContinue
if ($node) { Write-Host "Node.js: $(& node --version)" -ForegroundColor Green } else { Write-Host "Node.js: NOT FOUND" -ForegroundColor Red }
if ($npm) { Write-Host "npm: $(& npm --version)" -ForegroundColor Green } else { Write-Host "npm: NOT FOUND" -ForegroundColor Red }

Write-Host "`nLocal fixed-disk free space:" -ForegroundColor Cyan
Get-CimInstance Win32_LogicalDisk -Filter "DriveType=3" |
  Select-Object DeviceID,
    @{N='SizeGB';E={[math]::Round($_.Size/1GB,2)}},
    @{N='FreeGB';E={[math]::Round($_.FreeSpace/1GB,2)}},
    @{N='FreePct';E={if($_.Size){[math]::Round(100*$_.FreeSpace/$_.Size,1)}else{0}}} |
  Format-Table -AutoSize

Write-Host "`nBridgePoint released local-agent target: V936" -ForegroundColor Cyan
Write-Host "The backend must receive a fresh owner-PC heartbeat and the export release gate must show local_node_current=true and storage_verified=true before final export." -ForegroundColor Yellow

if (-not $node) { exit 2 }
exit 0
