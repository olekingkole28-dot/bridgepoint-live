@echo off
setlocal EnableExtensions
cd /d "%~dp0"
echo.
echo ============================================
echo   BridgePoint Local - Free State Runtime
 echo ============================================
echo.
where python >nul 2>nul
if errorlevel 1 (
  echo Python 3 is required for the free local runtime.
  echo Install Python from python.org, then run this again.
  pause
  exit /b 1
)
set "RUNNER=%~dp0bridgepoint_local_runner.py"
if not exist "%RUNNER%" (
  echo Downloading the BridgePoint Local runner from the official BridgePoint site...
  powershell -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop'; Invoke-WebRequest -UseBasicParsing 'https://bridgepointintelligence.online/downloads/backup/bridgepoint_local_runner.py' -OutFile '%RUNNER%'"
  if errorlevel 1 (
    echo Could not download bridgepoint_local_runner.py.
    echo Put this launcher beside the runner file and try again.
    pause
    exit /b 1
  )
)
set "BUNDLE=%~1"
if "%BUNDLE%"=="" (
  set /p BUNDLE=Paste the path to an exported BridgePoint state folder, or leave blank if this launcher is inside the state folder: 
)
if "%BUNDLE%"=="" set "BUNDLE=%CD%"
echo.
echo Starting BridgePoint Local from:
echo %BUNDLE%
echo.
python "%RUNNER%" "%BUNDLE%"
if errorlevel 1 (
  echo.
  echo BridgePoint Local stopped with an error. No source data was deleted.
  pause
  exit /b 1
)
endlocal
