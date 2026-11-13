[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
$VariableName = "BRIDGEPOINT_CESIUM_ION_TOKEN"

Write-Host "Stores a Cesium ion token in your Windows user environment."
Write-Host "Use a read-only token. Never paste it into chat or commit it to Git."
$SecureToken = Read-Host "Cesium ion read-only token" -AsSecureString
if (-not $SecureToken -or $SecureToken.Length -lt 20) {
    throw "The token was empty or unexpectedly short. No environment variable was changed."
}

$Pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecureToken)
try {
    $PlainToken = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($Pointer)
    [Environment]::SetEnvironmentVariable($VariableName, $PlainToken, "User")
    Write-Host ""
    Write-Host "Saved $VariableName to your Windows user environment."
    Write-Host "Close and reopen Unreal Editor so it inherits the new environment."
    Write-Host "To remove it later, run:"
    Write-Host '[Environment]::SetEnvironmentVariable("BRIDGEPOINT_CESIUM_ION_TOKEN", $null, "User")'
}
finally {
    if ($Pointer -ne [IntPtr]::Zero) {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($Pointer)
    }
    if ($PlainToken) { $PlainToken = $null }
    if ($SecureToken) { $SecureToken.Dispose() }
}
