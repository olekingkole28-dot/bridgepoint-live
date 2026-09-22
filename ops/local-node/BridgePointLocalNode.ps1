#requires -Version 7.0
[CmdletBinding()]
param(
  [string]$EnrollmentCode,
  [string]$DataRoot,
  [string]$PrimaryModel,
  [string]$ReviewerModel,
  [switch]$SkipModelPull,
  [switch]$RunOnce,
  [switch]$InstallScheduledTask
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$AgentVersion = 718
$MinExportFreeDiskGb = 600
$Gateway = 'https://xdfsjztwgsbmabshzsjw.supabase.co/functions/v1/bridgepoint-local-reasoning-v584'
$ConfigHome = Join-Path $env:LOCALAPPDATA 'BridgePoint\local-node'
$ConfigPath = Join-Path $ConfigHome 'config.json'
$CredentialPath = Join-Path $ConfigHome 'node-token.clixml'
$LogPath = Join-Path $ConfigHome 'bridgepoint-local-node.log'
New-Item -ItemType Directory -Force -Path $ConfigHome | Out-Null

function Write-NodeLog([string]$Message) {
  $line = "$(Get-Date -Format o) $Message"
  Add-Content -LiteralPath $LogPath -Value $line
  Write-Host $line
}

function Get-GpuInfo {
  $out = [ordered]@{ name = $null; vram_mb = 0 }
  $nvidia = Get-Command nvidia-smi -ErrorAction SilentlyContinue
  if ($nvidia) {
    try {
      $row = & $nvidia.Source --query-gpu=name,memory.total --format=csv,noheader,nounits 2>$null | Select-Object -First 1
      if ($row) {
        $parts = $row -split ','
        $out.name = $parts[0].Trim()
        $out.vram_mb = [int]($parts[1].Trim())
      }
    } catch {}
  }
  return $out
}

function Resolve-DataRoot([string]$Requested) {
  if ($Requested) {
    $resolved = [Environment]::ExpandEnvironmentVariables($Requested)
  } else {
    $disk = Get-CimInstance Win32_LogicalDisk -Filter "DriveType=3" |
      Where-Object { $_.FreeSpace -gt 0 } |
      Sort-Object FreeSpace -Descending |
      Select-Object -First 1
    if (-not $disk) { throw 'No fixed disk found.' }
    $resolved = Join-Path ($disk.DeviceID + '\') 'BridgePoint'
  }
  if ($resolved -match '(?i)OneDrive') { throw 'Active BridgePoint data cannot live inside OneDrive.' }
  New-Item -ItemType Directory -Force -Path $resolved | Out-Null
  foreach ($sub in @('archives','data','state','cache','logs','manifests')) {
    New-Item -ItemType Directory -Force -Path (Join-Path $resolved $sub) | Out-Null
  }
  return (Resolve-Path $resolved).Path
}

function Get-Hardware([string]$Root) {
  $driveName = ([System.IO.Path]::GetPathRoot($Root)).TrimEnd('\').TrimEnd(':')
  $psDrive = Get-PSDrive -Name $driveName
  $os = Get-CimInstance Win32_OperatingSystem
  $cpu = Get-CimInstance Win32_ComputerSystem
  $gpu = Get-GpuInfo
  [ordered]@{
    os = [Environment]::OSVersion.VersionString
    computer = $env:COMPUTERNAME
    user = $env:USERNAME
    logical_processors = [int]$cpu.NumberOfLogicalProcessors
    ram_gb = [math]::Round($os.TotalVisibleMemorySize / 1MB, 1)
    free_ram_gb = [math]::Round($os.FreePhysicalMemory / 1MB, 1)
    data_root = $Root
    free_disk_gb = [math]::Round($psDrive.Free / 1GB, 1)
    total_disk_gb = [math]::Round(($psDrive.Free + $psDrive.Used) / 1GB, 1)
    gpu = $gpu.name
    gpu_vram_mb = $gpu.vram_mb
  }
}

function Select-Models([string]$Primary,[string]$Reviewer) {
  if ($Primary -and $Reviewer) { return @($Primary,$Reviewer) }
  $gpu = Get-GpuInfo
  if ($gpu.vram_mb -ge 12000) {
    return @($(if($Primary){$Primary}else{'qwen2.5:7b'}), $(if($Reviewer){$Reviewer}else{'deepseek-r1:8b'}))
  }
  if ($gpu.vram_mb -ge 8000) {
    return @($(if($Primary){$Primary}else{'qwen2.5:7b'}), $(if($Reviewer){$Reviewer}else{'deepseek-r1:1.5b'}))
  }
  return @($(if($Primary){$Primary}else{'qwen2.5:3b'}), $(if($Reviewer){$Reviewer}else{'deepseek-r1:1.5b'}))
}

function Ensure-Ollama([string[]]$Models) {
  $ollama = Get-Command ollama -ErrorAction SilentlyContinue
  if (-not $ollama) { throw 'Ollama is not installed or not on PATH.' }
  try { Invoke-RestMethod -Uri 'http://127.0.0.1:11434/api/tags' -TimeoutSec 4 | Out-Null }
  catch {
    Start-Process -FilePath $ollama.Source -ArgumentList 'serve' -WindowStyle Hidden
    Start-Sleep -Seconds 4
    Invoke-RestMethod -Uri 'http://127.0.0.1:11434/api/tags' -TimeoutSec 8 | Out-Null
  }
  if (-not $SkipModelPull) {
    foreach ($model in $Models) {
      Write-NodeLog "Ensuring Ollama model $model"
      & $ollama.Source pull $model
      if ($LASTEXITCODE -ne 0) { throw "ollama pull failed for $model" }
    }
  }
}

function Save-NodeCredential([string]$NodeId,[string]$NodeToken) {
  $secure = ConvertTo-SecureString $NodeToken -AsPlainText -Force
  [pscredential]::new($NodeId,$secure) | Export-Clixml -LiteralPath $CredentialPath -Force
}

function Load-NodeCredential {
  if (-not (Test-Path $CredentialPath)) { return $null }
  Import-Clixml -LiteralPath $CredentialPath
}

function Invoke-Gateway {
  param([Parameter(Mandatory)][string]$Action,[hashtable]$Body=@{},[pscredential]$Credential)
  $payload = @{} + $Body
  $payload.action = $Action
  $headers = @{'Content-Type'='application/json'}
  if ($Credential) {
    $payload.node_id = $Credential.UserName
    $headers['x-bridgepoint-node-token'] = $Credential.GetNetworkCredential().Password
  }
  Invoke-RestMethod -Method Post -Uri $Gateway -Headers $headers -Body ($payload | ConvertTo-Json -Depth 20 -Compress) -TimeoutSec 60
}

function Invoke-OllamaJson([string]$Model,[array]$Messages) {
  $body = @{model=$Model;stream=$false;format='json';messages=$Messages;options=@{temperature=0.1}} |
    ConvertTo-Json -Depth 20 -Compress
  $r = Invoke-RestMethod -Method Post -Uri 'http://127.0.0.1:11434/api/chat' -ContentType 'application/json' -Body $body -TimeoutSec 600
  $content = [string]$r.message.content
  try { $content | ConvertFrom-Json -AsHashtable }
  catch { @{summary=$content;raw=$content;parse_ok=$false} }
}

function Get-Pressure {
  $cpuLoads = @(Get-CimInstance Win32_Processor | ForEach-Object { [double]$_.LoadPercentage })
  $cpu = if($cpuLoads.Count){[math]::Round(($cpuLoads|Measure-Object -Average).Average,1)}else{0}
  $os = Get-CimInstance Win32_OperatingSystem
  $freeRam = [math]::Round($os.FreePhysicalMemory / 1MB,1)
  $tier = if($cpu -ge 90 -or $freeRam -lt 4){'CRITICAL'}elseif($cpu -ge 75 -or $freeRam -lt 8){'HIGH'}else{'GREEN'}
  @{tier=$tier;cpu_pct=$cpu;free_ram_gb=$freeRam}
}

function Invoke-Task([hashtable]$Task,[string]$Primary,[string]$Reviewer,[pscredential]$Credential) {
  $worker = if($Task.worker){$Task.worker}else{@{}}
  $inputJson = ($Task.input | ConvertTo-Json -Depth 20 -Compress)
  if ($inputJson.Length -gt 16000) { $inputJson = $inputJson.Substring(0,16000) }
  $system = @"
You are a local BridgePoint Intelligence reasoning worker.
Mission: $($worker.mission)
Guardrails: $(($worker.guardrails | ConvertTo-Json -Depth 10 -Compress))
Never execute shell commands, change credentials, bypass legal/compliance gates, or claim facts not supported by the task input.
Return JSON only with: summary, findings, proposed_actions, risks, confidence, requires_owner_approval.
"@
  $primaryResult = Invoke-OllamaJson -Model $Primary -Messages @(
    @{role='system';content=$system},
    @{role='user';content=("Task type: {0}{1}Input: {2}" -f $Task.task_type,[Environment]::NewLine,$inputJson)}
  )
  $reviewResult = Invoke-OllamaJson -Model $Reviewer -Messages @(
    @{role='system';content='Review another model output for factual support, legal/compliance safety, regressions, and unauthorized actions. Return JSON only with approved, issues, safe_to_execute, summary.'},
    @{role='user';content=(ConvertTo-Json @{task=$Task;primary=$primaryResult} -Depth 20 -Compress)}
  )
  Invoke-Gateway -Action 'submit' -Credential $Credential -Body @{
    task_id=$Task.task_id
    primary=$primaryResult
    reviewer=$reviewResult
    models=@{primary=$Primary;reviewer=$Reviewer;provider='OLLAMA';agent_version=$AgentVersion}
  } | Out-Null
}

$DataRoot = Resolve-DataRoot $DataRoot
$models = Select-Models $PrimaryModel $ReviewerModel
$PrimaryModel,$ReviewerModel = $models
Ensure-Ollama $models
$hardware = Get-Hardware $DataRoot
$storageVerified = [double]$hardware.free_disk_gb -ge $MinExportFreeDiskGb

$credential = Load-NodeCredential
if (-not $credential) {
  if (-not $EnrollmentCode) { throw 'First run requires a fresh owner-generated local-node enrollment code.' }
  $enrolled = Invoke-Gateway -Action 'enroll' -Body @{
    enrollment_code=$EnrollmentCode
    node_name=("BridgePoint Owner PC - " + $env:COMPUTERNAME)
    capabilities=@{
      provider='OLLAMA';agent_version=$AgentVersion;outbound_only=$true
      primary_model=$PrimaryModel;reviewer_model=$ReviewerModel
      storage_verified=$storageVerified
      # Authority is server-granted by the owner-signed enrollment; the client never self-grants it.
    }
    hardware=$hardware
  }
  if (-not $enrolled.ok) { throw "Enrollment failed: $($enrolled.error)" }
  Save-NodeCredential $enrolled.node_id $enrolled.node_token
  $credential = Load-NodeCredential
  Write-NodeLog "Enrolled node $($enrolled.node_id)"
}

@{
  agent_version=$AgentVersion;gateway=$Gateway;data_root=$DataRoot
  primary_model=$PrimaryModel;reviewer_model=$ReviewerModel
  min_export_free_disk_gb=$MinExportFreeDiskGb
  credential_path=$CredentialPath;updated_at=(Get-Date -Format o)
} | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $ConfigPath -Encoding utf8

if ($InstallScheduledTask) {
  $pwsh=(Get-Command pwsh).Source
  $scriptPath=$MyInvocation.MyCommand.Path
  $args='-NoProfile -ExecutionPolicy Bypass -File "'+$scriptPath+'" -DataRoot "'+$DataRoot+'" -SkipModelPull'
  $action=New-ScheduledTaskAction -Execute $pwsh -Argument $args
  $trigger=New-ScheduledTaskTrigger -AtLogOn -User ("$env:USERDOMAIN\$env:USERNAME")
  $settings=New-ScheduledTaskSettingsSet -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1) -ExecutionTimeLimit ([TimeSpan]::Zero) -MultipleInstances IgnoreNew
  Register-ScheduledTask -TaskName 'BridgePoint Local Node' -Action $action -Trigger $trigger -Settings $settings -Force | Out-Null
  Write-NodeLog 'Installed BridgePoint Local Node scheduled task.'
}

do {
  try {
    $hardware=Get-Hardware $DataRoot
    $storageVerified=[double]$hardware.free_disk_gb -ge $MinExportFreeDiskGb
    $pressure=Get-Pressure
    $heartbeat=Invoke-Gateway -Action 'heartbeat' -Credential $credential -Body @{
      capabilities=@{
        provider='OLLAMA';agent_version=$AgentVersion;outbound_only=$true
        primary_model=$PrimaryModel;reviewer_model=$ReviewerModel
        storage_verified=$storageVerified;local_pressure=$pressure.tier
      }
      hardware=$hardware
    }
    if (-not $heartbeat.ok) { throw "Heartbeat failed: $($heartbeat.error)" }
    $limit=if($pressure.tier -eq 'GREEN'){2}else{1}
    $claim=Invoke-Gateway -Action 'claim' -Credential $credential -Body @{limit=$limit}
    $tasks=@($claim.tasks)
    foreach($taskObj in $tasks) {
      $task=@{}
      foreach($p in $taskObj.PSObject.Properties){$task[$p.Name]=$p.Value}
      try {
        Invoke-Task $task $PrimaryModel $ReviewerModel $credential
        Write-NodeLog "Completed local reasoning task $($task.task_id)"
      } catch {
        Write-NodeLog "Task $($task.task_id) failed: $($_.Exception.Message)"
        try { Invoke-Gateway -Action 'fail' -Credential $credential -Body @{task_id=$task.task_id;error=$_.Exception.Message} | Out-Null } catch {}
      }
    }
    Write-NodeLog "Heartbeat OK; pressure=$($pressure.tier); tasks=$($tasks.Count); free_disk_gb=$($hardware.free_disk_gb); storage_verified=$storageVerified"
  } catch {
    Write-NodeLog "Loop error: $($_.Exception.Message)"
  }
  if (-not $RunOnce) {
    $p=Get-Pressure
    Start-Sleep -Seconds $(if($p.tier -eq 'GREEN'){20}else{45})
  }
} while (-not $RunOnce)