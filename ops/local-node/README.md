# BridgePoint local owner node v718

This package connects the owner desktop to the existing BridgePoint local-reasoning gateway without putting a Supabase service-role key on the PC.

## Behavior

- Runs Ollama locally and reports a v718 heartbeat.
- Stores a revocable per-node token with Windows DPAPI for the current Windows user.
- Claims AI reasoning tasks, runs a primary model plus reviewer model, and returns their output to the governed backend. Model output does not receive shell/database execution authority.
- Reports CPU, RAM, GPU and SSD headroom and backs off when the PC is busy.
- Reports storage ready for snapshot work only with at least 600 GB free.
- Syncs the existing private building and transport Parquet archives by one-hour signed URLs.
- Keeps the live DuckDB file on the local SSD; OneDrive receives manifests by default, not the actively written database.
- Creates DuckDB views over the Parquet files in place instead of importing a second bulk copy.

## First run

Prerequisites: PowerShell 7 and Ollama. DuckDB CLI is optional for the AI node and used to build local views after archive sync.

Create a fresh owner local-node enrollment code, then run:

    pwsh -File .\ops\local-node\BridgePointLocalNode.ps1 -EnrollmentCode "PASTE_ONE_TIME_CODE" -InstallScheduledTask

The enrollment code is one-time and expires after 20 minutes. The script picks conservative Ollama models from detected NVIDIA VRAM unless models are explicitly supplied.

## Existing archive sync

After the node reports online:

    pwsh -File .\ops\local-node\Sync-BridgePointArchives.ps1 -IncludeTransportRuntime

The sync refuses to start below 600 GB free and halts below 100 GB remaining. Existing files with the expected byte size are skipped. Each downloaded object is hashed into a JSONL manifest.

## Storage layout

    <SSD>\BridgePoint\
      archives\
      data\
      state\bridgepoint.duckdb
      cache\
      logs\
      manifests\

Never put state\bridgepoint.duckdb inside a OneDrive-synced folder.

## Backend gates

A queued state snapshot cannot be claimed unless owner snapshot authorization is active, the node is online and fresh, agent version is at least 718, portable-export authority is present, storage is verified, and at least 600 GB is free.

Global country activation also requires a fresh v718+ local node and continues to obey source, rights and compliance gates.
