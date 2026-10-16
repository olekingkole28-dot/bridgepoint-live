param([string]$Name)
$ErrorActionPreference='Stop'
$Root='C:\BridgePointRuntime\secrets'
$Path=Join-Path $Root 'bridgepoint-secrets.dpapi.json'
New-Item -ItemType Directory -Force -Path $Root | Out-Null
if(-not $Name){$Name=Read-Host 'Secret/environment variable name'}
if(-not $Name){throw 'Secret name is required.'}
$Value=Read-Host ('Enter value for '+$Name+' (input is hidden)') -AsSecureString
$Encrypted=ConvertFrom-SecureString $Value
$data=@{}
if(Test-Path $Path){
  try{$obj=Get-Content $Path -Raw | ConvertFrom-Json; foreach($p in $obj.PSObject.Properties){$data[$p.Name]=$p.Value}}catch{}
}
$data[$Name]=$Encrypted
$data | ConvertTo-Json -Depth 4 | Set-Content $Path -Encoding UTF8
Write-Host ('Saved '+$Name+' encrypted with Windows DPAPI for the current Windows account.') -ForegroundColor Green
Write-Host ('File: '+$Path)
Write-Host 'Do not paste secret values into chat.' -ForegroundColor Yellow
