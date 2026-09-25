param(
  [string]$DataRoot = "C:\BridgePointData",
  [string]$RuntimeRoot = "C:\BridgePointRuntime",
  [string]$PrimaryModel = "qwen2.5:3b",
  [string]$ReviewerModel = "deepseek-r1:1.5b",
  [string]$EnrollmentCode = ""
)
$ErrorActionPreference = "Stop"
$MinFreeGB = 600
$Here = Split-Path -Parent $MyInvocation.MyCommand.Path
$RuntimeAgentDir = Join-Path $RuntimeRoot "agent"
function Require-Command([string]$Name, [string]$WingetId) {
  if (Get-Command $Name -ErrorAction SilentlyContinue) { return }
  if (-not (Get-Command winget -ErrorAction SilentlyContinue)) { return }
  try {
    winget install --id $WingetId -e --accept-package-agreements --accept-source-agreements | Out-Host
  } catch {
    Write-Warning "$Name winget installation failed; BridgePoint will continue if that dependency is optional."
  }
}

# Export must not depend on Windows Store aliases or winget source health.
# Resolve a real Python interpreter, and if none exists install the official
# python.org x64 build into BridgePointRuntime\Python313 after Authenticode validation.
function Test-RealPython([string]$Path) {
  if (-not $Path -or -not (Test-Path -LiteralPath $Path)) { return $false }
  if ($Path -match '\\WindowsApps\\') { return $false }
  try {
    & $Path -c "import sys; assert sys.version_info >= (3,11); print(sys.executable)" *> $null
    return ($LASTEXITCODE -eq 0)
  } catch { return $false }
}

$PythonExe=$null
$pythonCandidates=@(
  "$RuntimeRoot\Python313\python.exe",
  "$env:LOCALAPPDATA\Programs\Python\Python313\python.exe",
  "$env:LOCALAPPDATA\Programs\Python\Python312\python.exe",
  "$env:ProgramFiles\Python313\python.exe",
  "$env:ProgramFiles\Python312\python.exe"
)
$pythonCmd=Get-Command python -ErrorAction SilentlyContinue
if($pythonCmd){ $pythonCandidates += $pythonCmd.Source }
$pyCmd=Get-Command py -ErrorAction SilentlyContinue
if($pyCmd){
  try {
    $candidate=& $pyCmd.Source -3 -c "import sys; print(sys.executable)" 2>$null
    if($candidate){ $pythonCandidates += ($candidate | Select-Object -First 1) }
  } catch {}
}
foreach($candidate in ($pythonCandidates | Select-Object -Unique)){
  if(Test-RealPython $candidate){ $PythonExe=$candidate; break }
}

if(-not $PythonExe){
  $PythonVersion='3.13.15'
  $PythonInstaller=Join-Path $env:TEMP "python-$PythonVersion-amd64.exe"
  $PythonUrl="https://www.python.org/ftp/python/$PythonVersion/python-$PythonVersion-amd64.exe"
  Write-Host "Installing verified Python $PythonVersion directly from python.org..." -ForegroundColor Cyan
  Invoke-WebRequest -UseBasicParsing -TimeoutSec 180 -Uri $PythonUrl -OutFile ($PythonInstaller+'.tmp')
  Move-Item ($PythonInstaller+'.tmp') $PythonInstaller -Force
  $sig=Get-AuthenticodeSignature -FilePath $PythonInstaller
  if($sig.Status -ne 'Valid' -or $sig.SignerCertificate.Subject -notmatch 'Python Software Foundation'){
    throw "Python installer signature validation failed: $($sig.Status) $($sig.SignerCertificate.Subject)"
  }
  $PythonRoot=Join-Path $RuntimeRoot "Python313"
  $args=@('/quiet','InstallAllUsers=0',"TargetDir=$PythonRoot",'Include_launcher=0','PrependPath=0','Include_test=0','Include_pip=1','Shortcuts=0')
  $proc=Start-Process -FilePath $PythonInstaller -ArgumentList $args -Wait -PassThru
  if($proc.ExitCode -ne 0){ throw "Official Python installer exited $($proc.ExitCode)." }
  $PythonExe=Join-Path $PythonRoot 'python.exe'
}
if(-not (Test-RealPython $PythonExe)){ throw "A verified real Python interpreter could not be installed." }
& $PythonExe --version
if($LASTEXITCODE -ne 0){ throw "Python executable failed its final version check." }

# Ollama is optional for export-first mode.
$OllamaExe=$null
$ollamaCmd=Get-Command ollama -ErrorAction SilentlyContinue
$ollamaCandidates=@(
  "$env:LOCALAPPDATA\Programs\Ollama\ollama.exe",
  "$env:LOCALAPPDATA\Ollama\ollama.exe",
  "$env:ProgramFiles\Ollama\ollama.exe"
)
if($ollamaCmd){ $ollamaCandidates += $ollamaCmd.Source }
foreach($candidate in ($ollamaCandidates | Select-Object -Unique)){
  if($candidate -and (Test-Path -LiteralPath $candidate)){ $OllamaExe=$candidate; break }
}
if(-not $OllamaExe){
  Write-Warning "Ollama is unavailable. BridgePoint will continue in export-first mode."
}

if ($DataRoot.ToLower().Contains("onedrive")) { throw "Active BridgePoint data cannot live inside OneDrive." }
New-Item -ItemType Directory -Path $DataRoot -Force | Out-Null
New-Item -ItemType Directory -Path $RuntimeRoot -Force | Out-Null
New-Item -ItemType Directory -Path $RuntimeAgentDir -Force | Out-Null
Copy-Item -LiteralPath (Join-Path $Here "bridgepoint_agent.py") -Destination (Join-Path $RuntimeAgentDir "bridgepoint_agent.py") -Force
Copy-Item -LiteralPath (Join-Path $Here "requirements.txt") -Destination (Join-Path $RuntimeAgentDir "requirements.txt") -Force
$driveName = (Get-Item $DataRoot).PSDrive.Name
$drive = Get-PSDrive -Name $driveName
$freeGB = [math]::Round($drive.Free / 1GB, 1)
if ($freeGB -lt $MinFreeGB) { throw "BridgePoint requires at least $MinFreeGB GB free. Found $freeGB GB." }
[Environment]::SetEnvironmentVariable("OLLAMA_HOST", "127.0.0.1:11434", "User")
$env:OLLAMA_HOST = "127.0.0.1:11434"
if($OllamaExe){
  try { Invoke-RestMethod "http://127.0.0.1:11434/api/tags" -TimeoutSec 3 | Out-Null } catch { Start-Process -FilePath $OllamaExe -ArgumentList "serve" -WindowStyle Hidden; Start-Sleep -Seconds 3 }
  try { & $OllamaExe pull $PrimaryModel } catch { Write-Warning "Primary model pull failed; export-first mode will continue." }
  try { & $OllamaExe pull $ReviewerModel } catch { Write-Warning "Reviewer model pull failed; export-first mode will continue." }
}else{
  Write-Host "Ollama not available. Continuing with BridgePoint export-first mode." -ForegroundColor Yellow
}
$Venv = Join-Path $RuntimeRoot ".venv"
$Py = Join-Path $Venv "Scripts\python.exe"
if (-not (Test-Path -LiteralPath $Py)) {
  if(Test-Path -LiteralPath $Venv){ Remove-Item -LiteralPath $Venv -Recurse -Force -ErrorAction SilentlyContinue }
  & $PythonExe -m venv $Venv
  if($LASTEXITCODE -ne 0){ throw "Python venv creation failed." }
}
if (-not (Test-Path -LiteralPath $Py)) { throw "BridgePoint Python virtual environment was not created." }
& $Py --version
if($LASTEXITCODE -ne 0){ throw "BridgePoint venv Python failed its version check." }
& $Py -m pip install --upgrade pip
& $Py -m pip install -r (Join-Path $RuntimeAgentDir "requirements.txt")
$AgentPath = Join-Path $RuntimeAgentDir "bridgepoint_agent.py"
Unregister-ScheduledTask -TaskName "BridgePoint Local AI" -Confirm:$false -ErrorAction SilentlyContinue
Unregister-ScheduledTask -TaskName "BridgePoint Local Node" -Confirm:$false -ErrorAction SilentlyContinue
Unregister-ScheduledTask -TaskName "BridgePoint Autonomous Node" -Confirm:$false -ErrorAction SilentlyContinue

$bstr=[IntPtr]::Zero
try {
  if([string]::IsNullOrWhiteSpace($EnrollmentCode)){
    $secure = Read-Host "Paste the one-time BridgePoint enrollment code" -AsSecureString
    $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    $plain = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
  } else {
    $plain = $EnrollmentCode.Trim()
  }
  if($plain.Length -lt 24){ throw "BridgePoint enrollment code is missing or too short." }
  $env:BRIDGEPOINT_ENROLLMENT_CODE = $plain
  & $Py $AgentPath configure --data-root $DataRoot --primary-model $PrimaryModel --reviewer-model $ReviewerModel
  if($LASTEXITCODE -ne 0){ throw "BridgePoint enrollment failed with exit code $LASTEXITCODE." }
} finally {
  $env:BRIDGEPOINT_ENROLLMENT_CODE = $null
  $plain=$null
  if ($bstr -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
}
try {
  $runPath='HKCU:\Software\Microsoft\Windows\CurrentVersion\Run'
  Remove-ItemProperty -Path $runPath -Name "BridgePoint Local AI" -ErrorAction SilentlyContinue
} catch {}
$Action = New-ScheduledTaskAction -Execute $Py -Argument ('"' + $AgentPath + '" run') -WorkingDirectory $RuntimeAgentDir
$Trigger = New-ScheduledTaskTrigger -AtLogOn -User ("$env:USERDOMAIN\$env:USERNAME")
$Settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1) -ExecutionTimeLimit ([TimeSpan]::Zero) -MultipleInstances IgnoreNew
Register-ScheduledTask -TaskName "BridgePoint Autonomous Node" -Action $Action -Trigger $Trigger -Settings $Settings -RunLevel Highest -Force | Out-Null
Start-ScheduledTask -TaskName "BridgePoint Autonomous Node"
@{
  agent_version=938
  installed_at=(Get-Date).ToUniversalTime().ToString('o')
  data_root=$DataRoot
  runtime_root=$RuntimeRoot
  agent_path=$AgentPath
  gateway='https://xdfsjztwgsbmabshzsjw.supabase.co/functions/v1/bridgepoint-local-reasoning-v584'
} | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath (Join-Path $RuntimeRoot "release.json") -Encoding UTF8
Write-Host "BridgePoint autonomous node v938 is installed."
Write-Host "Hot data: $DataRoot"
Write-Host "Runtime: $RuntimeRoot"
Write-Host "The node is outbound-only, the node token is DPAPI-protected, and export can run even if Ollama is not yet available."
