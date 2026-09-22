param(
  [string]$DataRoot = "C:\BridgePointData",
  [string]$RuntimeRoot = "C:\BridgePointRuntime",
  [string]$PrimaryModel = "qwen2.5:3b",
  [string]$ReviewerModel = "deepseek-r1:1.5b"
)
$ErrorActionPreference = "Stop"
$MinFreeGB = 600
$Here = Split-Path -Parent $MyInvocation.MyCommand.Path
$RuntimeAgentDir = Join-Path $RuntimeRoot "agent"
function Require-Command([string]$Name, [string]$WingetId) {
  if (Get-Command $Name -ErrorAction SilentlyContinue) { return }
  if (-not (Get-Command winget -ErrorAction SilentlyContinue)) { throw "$Name is missing and winget is unavailable." }
  winget install --id $WingetId -e --accept-package-agreements --accept-source-agreements
}
Require-Command "python" "Python.Python.3.12"
try { Require-Command "ollama" "Ollama.Ollama" } catch { Write-Warning "Ollama is unavailable. Continuing in export-first mode; local AI can be enabled later." }

# Refresh PATH after winget installs in this same PowerShell process.
$machinePath=[Environment]::GetEnvironmentVariable('Path','Machine')
$userPath=[Environment]::GetEnvironmentVariable('Path','User')
$env:Path="$machinePath;$userPath"
function Resolve-Executable([string]$Name,[string[]]$Candidates) {
  $cmd=Get-Command $Name -ErrorAction SilentlyContinue
  if($cmd){ return $cmd.Source }
  foreach($candidate in $Candidates){
    $expanded=[Environment]::ExpandEnvironmentVariables($candidate)
    if(Test-Path -LiteralPath $expanded){ return $expanded }
  }
  throw "$Name was installed but its executable could not be located."
}
$PythonExe=Resolve-Executable "python" @(
  "%LOCALAPPDATA%\Programs\Python\Python312\python.exe",
  "%ProgramFiles%\Python312\python.exe"
)
$OllamaExe=$null
try {
  $OllamaExe=Resolve-Executable "ollama" @(
    "%LOCALAPPDATA%\Programs\Ollama\ollama.exe",
    "%LOCALAPPDATA%\Ollama\ollama.exe",
    "%ProgramFiles%\Ollama\ollama.exe"
  )
} catch {
  Write-Warning "Ollama executable was not found. BridgePoint will install and run in export-first mode."
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
if (-not (Test-Path $Venv)) { & $PythonExe -m venv $Venv }
$Py = Join-Path $Venv "Scripts\python.exe"
& $Py -m pip install --upgrade pip
& $Py -m pip install -r (Join-Path $RuntimeAgentDir "requirements.txt")
$secure = Read-Host "Paste the one-time BridgePoint enrollment code" -AsSecureString
$bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
try {
  $plain = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
  $env:BRIDGEPOINT_ENROLLMENT_CODE = $plain
  & $Py (Join-Path $RuntimeAgentDir "bridgepoint_agent.py") configure --data-root $DataRoot --primary-model $PrimaryModel --reviewer-model $ReviewerModel
} finally {
  $env:BRIDGEPOINT_ENROLLMENT_CODE = $null
  if ($bstr -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
}
$AgentPath = Join-Path $RuntimeAgentDir "bridgepoint_agent.py"
Unregister-ScheduledTask -TaskName "BridgePoint Local AI" -Confirm:$false -ErrorAction SilentlyContinue
Unregister-ScheduledTask -TaskName "BridgePoint Local Node" -Confirm:$false -ErrorAction SilentlyContinue
Unregister-ScheduledTask -TaskName "BridgePoint Autonomous Node" -Confirm:$false -ErrorAction SilentlyContinue
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
