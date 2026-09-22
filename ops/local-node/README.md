# BridgePoint owner-desktop autonomous node v718+

This is the canonical local runtime for the new BridgePoint owner desktop. It connects to the existing BridgePoint control plane without placing a Supabase service-role key on the PC.

## Canonical install path

Run PowerShell as Administrator from `ops/local-node`:

    Set-ExecutionPolicy -Scope Process Bypass
    .\install.ps1 -DataRoot "C:\BridgePointData"

Use a fresh one-time enrollment code from the authenticated owner control surface when the installer asks for it. The code expires quickly and the backend—not the PC—grants backup/export privileges.

The installer:
- checks for at least 600 GB free on non-OneDrive hot storage,
- installs/uses Python and Ollama,
- binds Ollama to 127.0.0.1,
- creates a Python virtual environment,
- enrolls a revocable v718+ node,
- protects the node token with Windows DPAPI,
- installs the single `BridgePoint Autonomous Node` Windows Scheduled Task.

Do not also install the older `BridgePoint Local Node` scheduled task. `BridgePointLocalNode.ps1` and `Sync-BridgePointArchives.ps1` remain manual fallback/diagnostic tools only.

## What runs automatically

`bridgepoint_agent.py` is the long-running engine. It:
- heartbeats CPU/RAM/GPU/SSD status to the governed backend,
- scales local work up/down from available headroom,
- runs Ollama primary + reviewer reasoning without granting models shell/database authority,
- participates in stale-task recovery and durable requirement execution,
- claims only owner-approved state snapshot jobs after server-side export/storage gates pass,
- writes state snapshots as ZSTD Parquet,
- pulls existing private building/transport Parquet through short-lived signed URLs,
- rebuilds DuckDB views over Parquet in place rather than duplicating bulk layers,
- restarts after reboot/failure through Windows Task Scheduler.

## Storage contract

Hot/active data stays on the local SSD, e.g.:

    C:\BridgePointData\
      archives\
      snapshots\
      catalog\bridgepoint.duckdb
      manifests\

The actively written DuckDB database must never be placed inside a OneDrive-synced folder. OneDrive is a cold/archive target for immutable verified snapshots, manifests, checksums, completion receipts, and older generations.

## Security contract

- Node traffic is outbound-only.
- Ollama is loopback-only.
- The node never receives a Supabase service-role key.
- Enrollment capabilities that grant authority are server-signed; client-supplied authority flags are ignored.
- Export claims require: owner snapshot authorization, a fresh online node, agent v718+, server-granted export authority, verified storage, and at least 600 GB free.
- Local models propose/review work; the backend safety kernel and allowlisted executors decide what may actually run.
- Low-risk internal reversible actions can auto-execute. Security bypasses, credential changes, regulated actions, destructive operations, and other higher-risk actions remain gated.

## Manual fallback tools

`BridgePointLocalNode.ps1` can be run once for diagnostics:

    pwsh -File .\BridgePointLocalNode.ps1 -RunOnce

`Sync-BridgePointArchives.ps1` can manually copy the existing private building/transport archives:

    pwsh -File .\Sync-BridgePointArchives.ps1 -IncludeTransportRuntime

Those scripts should not be installed as competing scheduled workers when the canonical Python agent is active.
