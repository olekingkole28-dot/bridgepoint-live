@echo off
setlocal
set "HERE=%~dp0"
set "PY=C:\BridgePointRuntime\.venv\Scripts\python.exe"
if not exist "%PY%" set "PY=C:\BridgePointRuntime\Python313\python.exe"
if not exist "%PY%" (
  echo BridgePoint rescue Python was not found.
  echo Expected C:\BridgePointRuntime\.venv\Scripts\python.exe
  pause
  exit /b 1
)
echo Starting BridgePoint Master Parcel Boundary Atlas...
echo Data root: C:\BridgePointData
"%PY%" "%HERE%master_parcel_atlas.py"
if errorlevel 1 (
  echo.
  echo Atlas stopped with an error. No rescue data was deleted.
  pause
)
endlocal
