@echo off
setlocal EnableExtensions
cd /d "%~dp0"
echo.
echo ============================================
echo   BridgePoint State Export Wizard
 echo ============================================
echo.
set "EXPORTER=%~dp0bridgepoint_state_export_windows.ps1"
if not exist "%EXPORTER%" (
  echo Downloading the official BridgePoint state exporter...
  powershell -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop'; Invoke-WebRequest -UseBasicParsing 'https://bridgepointintelligence.online/downloads/backup/bridgepoint_state_export_windows.ps1' -OutFile '%EXPORTER%'"
  if errorlevel 1 goto :downloadfail
)
set /p BPSTATE=Enter 2-letter state code (example CT): 
if "%BPSTATE%"=="" goto :bad
powershell -NoProfile -ExecutionPolicy Bypass -File "%EXPORTER%" -State "%BPSTATE%"
if errorlevel 1 goto :fail
echo.
echo Export finished successfully.
echo.
echo To run an exported state without Supabase, download BridgePoint_Local_Run.bat
 echo from the same BridgePoint Backup page and point it at the exported state folder.
pause
exit /b 0
:bad
echo A state code is required.
pause
exit /b 1
:downloadfail
echo.
echo The exporter could not be downloaded. No source data was changed.
pause
exit /b 1
:fail
echo.
echo The export did not complete. Read the error above; no source data was deleted.
pause
exit /b 1
