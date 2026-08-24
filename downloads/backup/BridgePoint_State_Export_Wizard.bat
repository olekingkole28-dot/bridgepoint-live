@echo off
setlocal
cd /d "%~dp0"
echo.
echo ============================================
echo   BridgePoint State Export Wizard
 echo ============================================
echo.
set /p BPSTATE=Enter 2-letter state code (example CT): 
if "%BPSTATE%"=="" goto :bad
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0bridgepoint_state_export_windows.ps1" -State "%BPSTATE%"
if errorlevel 1 goto :fail
echo.
echo Export finished successfully.
pause
exit /b 0
:bad
echo A state code is required.
pause
exit /b 1
:fail
echo.
echo The export did not complete. Read the error above; no source data was deleted.
pause
exit /b 1
