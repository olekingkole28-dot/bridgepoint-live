param(
  [switch]$GoogleOnly,
  [switch]$AppleOnly
)
$ErrorActionPreference='Stop'
$ProjectRef='xdfsjztwgsbmabshzsjw'
$ProjectUrl='https://xdfsjztwgsbmabshzsjw.supabase.co'
$PublishableKey='sb_publishable_lM9oWQeHjBmgOIiteeOicQ_PTyAeF25'
$ManagementUrl="https://api.supabase.com/v1/projects/$ProjectRef/config/auth"

function Read-SecretText([string]$Prompt){
  $s=Read-Host $Prompt -AsSecureString
  $ptr=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($s)
  try { return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr) }
  finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
}

Write-Host ''
Write-Host 'BridgePoint Google + Apple Auth Activation v5602' -ForegroundColor Cyan
Write-Host 'This does not stop or modify V939/V942 export workers.' -ForegroundColor Green
Write-Host 'Secrets are read interactively and are not written to disk by this script.' -ForegroundColor Yellow
Write-Host ''

$token=Read-SecretText 'Supabase personal access token'
if(-not $token){throw 'Supabase access token is required.'}

$body=@{}

if(-not $AppleOnly){
  $googleId=Read-Host 'Google OAuth Web Client ID (leave blank to skip Google)'
  if($googleId){
    $googleSecret=Read-SecretText 'Google OAuth Client Secret'
    if(-not $googleSecret){throw 'Google client secret is required when a Google client ID is supplied.'}
    $body.external_google_enabled=$true
    $body.external_google_client_id=$googleId.Trim()
    $body.external_google_secret=$googleSecret
  }
}

if(-not $GoogleOnly){
  $appleId=Read-Host 'Apple Services ID / Client ID (leave blank to skip Apple)'
  if($appleId){
    $appleSecret=Read-SecretText 'Apple generated client secret JWT'
    if(-not $appleSecret){throw 'Apple generated client secret is required when an Apple Services ID is supplied.'}
    $body.external_apple_enabled=$true
    $body.external_apple_client_id=$appleId.Trim()
    $body.external_apple_secret=$appleSecret
  }
}

if($body.Count -eq 0){throw 'No provider credentials were supplied.'}

$headers=@{
  Authorization="Bearer $token"
  'Content-Type'='application/json'
}
$json=$body|ConvertTo-Json -Depth 5 -Compress
Invoke-RestMethod -Method Patch -Uri $ManagementUrl -Headers $headers -Body $json | Out-Null

Start-Sleep -Seconds 2
$settings=Invoke-RestMethod -Method Get -Uri "$ProjectUrl/auth/v1/settings" -Headers @{apikey=$PublishableKey;Accept='application/json'}

Write-Host ''
Write-Host ('Google enabled: '+[bool]$settings.external.google) -ForegroundColor Green
Write-Host ('Apple enabled:  '+[bool]$settings.external.apple) -ForegroundColor Green
Write-Host ''
Write-Host 'Required provider callback URL:' -ForegroundColor Cyan
Write-Host "$ProjectUrl/auth/v1/callback"
Write-Host 'Website origin:' -ForegroundColor Cyan
Write-Host 'https://bridgepointintelligence.online'
Write-Host ''
Write-Host 'If a provider says False, re-check that provider client ID/secret and its authorized redirect URL.' -ForegroundColor Yellow
